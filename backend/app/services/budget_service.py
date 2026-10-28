import uuid
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core.dates import month_bounds
from app.repositories import (
    budget_repository,
    category_repository,
    expense_repository,
    income_repository,
)
from app.schemas.budget import (
    BudgetItemStatus,
    BudgetSave,
    BudgetStatus,
    DailyBudget,
)

ZERO = Decimal("0")
CENT = Decimal("0.01")


class InvalidCategoryError(Exception):
    pass


class BudgetNotFoundError(Exception):
    pass


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def build_daily(
    db: Session, user_id: uuid.UUID, start: date, end: date, total: Decimal
) -> DailyBudget:
    today = date.today()
    days_in_month = (end - start).days
    days_left = days_in_month - today.day + 1

    spent_before_today = expense_repository.get_total(db, user_id, start, today)
    spent_today = expense_repository.get_total(
        db, user_id, today, today + timedelta(days=1)
    )
    allowance = money((total - spent_before_today) / days_left)

    return DailyBudget(
        base_daily=money(total / days_in_month),
        days_in_month=days_in_month,
        days_left=days_left,
        today_allowance=allowance,
        spent_today=spent_today,
        left_today=allowance - spent_today,
    )


def get_status(db: Session, user_id: uuid.UUID, period: date) -> BudgetStatus:
    start, end = month_bounds(period)
    budget = budget_repository.get_for_period(db, user_id, start)

    category_totals = dict(
        expense_repository.get_category_totals(db, user_id, start, end)
    )
    spent_total = expense_repository.get_total(db, user_id, start, end)
    expected_income, _, _ = income_repository.get_period_totals(db, user_id, start)

    total = budget.total_amount if budget else ZERO
    items: list[BudgetItemStatus] = []
    allocated_total = ZERO
    budgeted_spent = ZERO

    if budget:
        for item in sorted(budget.items, key=lambda entry: entry.amount, reverse=True):
            spent = category_totals.get(item.category_id, ZERO)
            items.append(
                BudgetItemStatus(
                    category_id=item.category_id,
                    allocated=item.amount,
                    spent=spent,
                    remaining=item.amount - spent,
                )
            )
            allocated_total += item.amount
            budgeted_spent += spent

    is_current_month = start == date.today().replace(day=1)
    daily = (
        build_daily(db, user_id, start, end, total)
        if budget and is_current_month
        else None
    )

    return BudgetStatus(
        period=start,
        exists=budget is not None,
        total_amount=total,
        allocated_total=allocated_total,
        unallocated=total - allocated_total,
        spent_total=spent_total,
        remaining=total - spent_total,
        unbudgeted_spent=spent_total - budgeted_spent,
        expected_income=expected_income,
        planned_savings=expected_income - total,
        items=items,
        daily=daily,
    )


def save_budget(
    db: Session, user_id: uuid.UUID, period: date, data: BudgetSave
) -> BudgetStatus:
    for item in data.items:
        if category_repository.get_by_id(db, user_id, item.category_id) is None:
            raise InvalidCategoryError()

    start, _ = month_bounds(period)
    budget = budget_repository.get_for_period(db, user_id, start)
    if budget is None:
        budget = budget_repository.create(
            db, user_id=user_id, period=start, total_amount=data.total_amount
        )
    else:
        budget.total_amount = data.total_amount

    budget_repository.sync_items(
        db, budget, {item.category_id: item.amount for item in data.items}
    )
    db.commit()

    return get_status(db, user_id, start)


def delete_budget(db: Session, user_id: uuid.UUID, period: date) -> None:
    start, _ = month_bounds(period)
    budget = budget_repository.get_for_period(db, user_id, start)
    if budget is None:
        raise BudgetNotFoundError()

    budget_repository.delete(db, budget)
    db.commit()