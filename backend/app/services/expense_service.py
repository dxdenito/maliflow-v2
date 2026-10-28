import uuid
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.dates import month_bounds
from app.core.enums import EntryType
from app.models.expense import Expense
from app.repositories import (
    account_repository,
    category_repository,
    expense_repository,
    ledger_repository,
    obligation_repository,
)
from app.schemas.expense import (
    CategoryTotal,
    ExpenseCreate,
    ExpenseSummary,
    ExpenseUpdate,
)
from app.services import obligation_service


class ExpenseNotFoundError(Exception):
    pass


class InvalidCategoryError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class PayerLockedError(Exception):
    pass


class AmountBelowRefundedError(Exception):
    pass


class RefundMadeError(Exception):
    pass


def create_expense(db: Session, user_id: uuid.UUID, data: ExpenseCreate) -> Expense:
    category = category_repository.get_by_id(db, user_id, data.category_id)
    if category is None or not category.is_active:
        raise InvalidCategoryError()

    if data.paid_by is not None:
        label = data.description or category.name
        obligation = obligation_repository.create(
            db,
            user_id=user_id,
            name=f"{data.paid_by}: {label}"[:100],
            original_amount=data.amount,
            due_on=data.repay_by,
            note=f"Paid by {data.paid_by} on {data.spent_on.strftime('%d %b %Y')}",
        )
        expense = expense_repository.create(
            db,
            user_id=user_id,
            category_id=data.category_id,
            account_id=None,
            obligation_id=obligation.id,
            amount=data.amount,
            spent_on=data.spent_on,
            description=data.description,
        )
        db.commit()
        db.refresh(expense)
        return expense

    account = account_repository.get_by_id(db, user_id, data.account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()

    expense = expense_repository.create(
        db,
        user_id=user_id,
        category_id=data.category_id,
        account_id=data.account_id,
        amount=data.amount,
        spent_on=data.spent_on,
        description=data.description,
    )
    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.EXPENSE.value,
        amount=data.amount,
        occurred_on=data.spent_on,
        from_account_id=data.account_id,
        description=data.description or category.name,
        reference_type="expense",
        reference_id=expense.id,
    )
    db.commit()

    db.refresh(expense)
    return expense


def update_expense(
    db: Session, user_id: uuid.UUID, expense_id: uuid.UUID, data: ExpenseUpdate
) -> Expense:
    expense = expense_repository.get_by_id(db, user_id, expense_id)
    if expense is None:
        raise ExpenseNotFoundError()

    changes = data.model_dump(exclude_unset=True)
    for key in ("category_id", "account_id", "amount", "spent_on"):
        if key in changes and changes[key] is None:
            del changes[key]

    paid_by_someone = expense.account_id is None
    if paid_by_someone and "account_id" in changes:
        raise PayerLockedError()

    new_category_id = changes.get("category_id", expense.category_id)
    category = category_repository.get_by_id(db, user_id, new_category_id)
    if category is None or (
        new_category_id != expense.category_id and not category.is_active
    ):
        raise InvalidCategoryError()

    if not paid_by_someone:
        new_account_id = changes.get("account_id", expense.account_id)
        account = account_repository.get_by_id(db, user_id, new_account_id)
        if account is None or (
            new_account_id != expense.account_id and not account.is_active
        ):
            raise InvalidAccountError()

    if expense.obligation_id is not None and "amount" in changes:
        obligation = obligation_repository.get_by_id(
            db, user_id, expense.obligation_id
        )
        if obligation is not None:
            if changes["amount"] < obligation_service.paid_total(obligation):
                raise AmountBelowRefundedError()
            obligation.original_amount = changes["amount"]

    for key, value in changes.items():
        setattr(expense, key, value)

    if not paid_by_someone:
        ledger_repository.update_by_reference(
            db,
            user_id,
            "expense",
            expense.id,
            amount=expense.amount,
            from_account_id=expense.account_id,
            occurred_on=expense.spent_on,
            description=expense.description or category.name,
        )
    db.commit()

    db.refresh(expense)
    return expense


def delete_expense(db: Session, user_id: uuid.UUID, expense_id: uuid.UUID) -> None:
    expense = expense_repository.get_by_id(db, user_id, expense_id)
    if expense is None:
        raise ExpenseNotFoundError()

    if expense.obligation_id is not None:
        obligation = obligation_repository.get_by_id(
            db, user_id, expense.obligation_id
        )
        if obligation is not None:
            if obligation.payments:
                raise RefundMadeError()
            obligation_repository.delete(db, obligation)

    ledger_repository.delete_by_reference(db, user_id, "expense", expense.id)
    expense_repository.delete(db, expense)
    db.commit()


def list_expenses(
    db: Session,
    user_id: uuid.UUID,
    period: date,
    category_id: uuid.UUID | None = None,
) -> list[Expense]:
    start, end = month_bounds(period)
    return expense_repository.list_for_user(db, user_id, start, end, category_id)


def get_summary(db: Session, user_id: uuid.UUID, period: date) -> ExpenseSummary:
    start, end = month_bounds(period)
    today = date.today()

    return ExpenseSummary(
        period=start,
        total=expense_repository.get_total(db, user_id, start, end),
        today_total=expense_repository.get_total(
            db, user_id, today, today + timedelta(days=1)
        ),
        by_category=[
            CategoryTotal(category_id=category_id, total=total)
            for category_id, total in expense_repository.get_category_totals(
                db, user_id, start, end
            )
        ],
    )