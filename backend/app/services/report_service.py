import uuid
from collections import defaultdict
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core.dates import month_bounds
from app.core.enums import EntryType
from app.repositories import (
    budget_repository,
    category_repository,
    expense_repository,
    income_repository,
    ledger_repository,
)
from app.schemas.report import (
    BudgetBrief,
    DayTotal,
    IncomeUse,
    Insight,
    MonthReport,
    ReportCategory,
    TopExpense,
    Trend,
    TrendPoint,
)
from app.services import budget_service

ZERO = Decimal("0")
CENT = Decimal("0.01")
TENTH = Decimal("0.1")
SEVERITY_ORDER = {"warning": 0, "info": 1, "good": 2}
MAX_INSIGHTS = 8


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def percent(part: Decimal, whole: Decimal) -> Decimal | None:
    if whole <= 0:
        return None
    return (part / whole * 100).quantize(TENTH, rounding=ROUND_HALF_UP)


def change_percent(current: Decimal, previous: Decimal) -> Decimal | None:
    if previous <= 0:
        return None
    return ((current - previous) / previous * 100).quantize(
        TENTH, rounding=ROUND_HALF_UP
    )


def fmt(value: Decimal) -> str:
    return f"{value:,.2f}"


def previous_month(start: date) -> date:
    return (start - timedelta(days=1)).replace(day=1)


def savings_flow(db: Session, user_id: uuid.UUID, start: date, end: date) -> Decimal:
    deposited = ledger_repository.sum_by_type(
        db, user_id, EntryType.SAVINGS_DEPOSIT.value, start, end
    )
    withdrawn = ledger_repository.sum_by_type(
        db, user_id, EntryType.SAVINGS_WITHDRAWAL.value, start, end
    )
    return deposited - withdrawn


def build_insights(
    *,
    start: date,
    today: date,
    days_in_month: int,
    last_day: int,
    income: Decimal,
    spent: Decimal,
    use: IncomeUse,
    budget,
    rows: list[ReportCategory],
    names: dict,
    history: list[dict],
    months_with_data: int,
    base_daily: Decimal | None,
    days_over: int,
) -> list[Insight]:
    insights: list[Insight] = []
    this_month = today.replace(day=1)

    if budget.exists and budget.total_amount > 0:
        ratio = spent / budget.total_amount

        if start == this_month:
            elapsed = Decimal(today.day) / Decimal(days_in_month)
            detail = (
                f"You have used {ratio * 100:.0f}% of your budget and "
                f"{elapsed * 100:.0f}% of the month has passed."
            )
            if ratio > elapsed + Decimal("0.10"):
                insights.append(
                    Insight(
                        kind="pace",
                        severity="warning",
                        title="You are spending faster than planned",
                        detail=detail,
                    )
                )
            elif ratio <= elapsed:
                insights.append(
                    Insight(
                        kind="pace",
                        severity="good",
                        title="You are on pace with your budget",
                        detail=detail,
                    )
                )
        elif start < this_month:
            if spent <= budget.total_amount:
                insights.append(
                    Insight(
                        kind="within_budget",
                        severity="good",
                        title="You stayed within your budget",
                        detail=f"You spent {fmt(spent)} of {fmt(budget.total_amount)}.",
                        amount=budget.total_amount - spent,
                    )
                )
            else:
                insights.append(
                    Insight(
                        kind="over_total_budget",
                        severity="warning",
                        title="You went over your budget",
                        detail=f"You spent {fmt(spent)} against a budget of {fmt(budget.total_amount)}.",
                        amount=spent - budget.total_amount,
                    )
                )

    over = [item for item in budget.items if item.spent > item.allocated]
    over.sort(key=lambda item: item.spent - item.allocated, reverse=True)
    for item in over[:3]:
        name = names.get(item.category_id, "A category")
        insights.append(
            Insight(
                kind="over_budget",
                severity="warning",
                title=f"{name} is over its limit",
                detail=f"You spent {fmt(item.spent)} against a limit of {fmt(item.allocated)}.",
                amount=item.spent - item.allocated,
            )
        )

    if budget.exists and budget.items:
        unbudgeted = [row for row in rows if row.limit is None]
        unbudgeted_total = sum((row.amount for row in unbudgeted), ZERO)
        if unbudgeted_total > 0:
            top = unbudgeted[0]
            heavy = spent > 0 and unbudgeted_total / spent >= Decimal("0.10")
            insights.append(
                Insight(
                    kind="unbudgeted",
                    severity="warning" if heavy else "info",
                    title="Spending in categories with no limit",
                    detail=f"{fmt(unbudgeted_total)} went to categories without a limit, mostly {top.name} ({fmt(top.amount)}).",
                    amount=unbudgeted_total,
                )
            )

    if months_with_data > 0 and spent > 0:
        spikes = []
        for row in rows:
            total = sum((past.get(row.category_id, ZERO) for past in history), ZERO)
            average = total / months_with_data
            if average <= 0:
                continue
            increase = row.amount - average
            if row.amount > average * Decimal("1.3") and increase >= spent * Decimal("0.10"):
                spikes.append((increase, row, average))

        spikes.sort(key=lambda item: item[0], reverse=True)
        for increase, row, average in spikes[:2]:
            insights.append(
                Insight(
                    kind="spike",
                    severity="warning",
                    title=f"{row.name} spending jumped",
                    detail=f"{fmt(row.amount)} this month, compared with about {fmt(money(average))} in a typical recent month.",
                    amount=money(increase),
                )
            )

    frequent = [row for row in rows if row.transactions >= 10]
    frequent.sort(key=lambda row: row.amount, reverse=True)
    for row in frequent[:2]:
        average = money(row.amount / row.transactions)
        insights.append(
            Insight(
                kind="frequent",
                severity="info",
                title=f"{row.transactions} separate {row.name} expenses",
                detail=f"Averaging {fmt(average)} each, {fmt(row.amount)} in total. Small amounts add up.",
                amount=row.amount,
            )
        )

    if income > 0 and spent > income:
        insights.append(
            Insight(
                kind="overspending",
                severity="warning",
                title="You spent more than you received",
                detail=f"Expenses were {fmt(spent)} against income of {fmt(income)}.",
                amount=spent - income,
            )
        )

    if income > 0 and use.left_over > 0 and use.left_over / income >= Decimal("0.05"):
        insights.append(
            Insight(
                kind="unsaved",
                severity="info",
                title="Money that is neither spent nor saved",
                detail=f"{fmt(use.left_over)} came in but isn't accounted for. Moving it to savings makes it easier to keep.",
                amount=use.left_over,
            )
        )

    if base_daily is not None and last_day >= 5 and days_over / last_day >= 0.4:
        insights.append(
            Insight(
                kind="daily_over",
                severity="warning" if days_over / last_day >= 0.5 else "info",
                title=f"You went over your daily budget on {days_over} of {last_day} days",
                detail=f"Your starting daily budget is {fmt(base_daily)}.",
            )
        )

    if budget.exists and budget.expected_income > 0 and budget.planned_savings < 0:
        insights.append(
            Insight(
                kind="budget_exceeds_income",
                severity="warning",
                title="Your budget is higher than your expected income",
                detail=f"You budgeted {fmt(budget.total_amount)} but expect {fmt(budget.expected_income)}.",
                amount=-budget.planned_savings,
            )
        )

    if income > 0 and use.saved > 0:
        rate = percent(use.saved, income)
        insights.append(
            Insight(
                kind="saved",
                severity="good",
                title=f"You saved {rate}% of your income",
                detail=f"{fmt(use.saved)} moved into savings this month.",
                amount=use.saved,
            )
        )
    elif use.saved < 0:
        insights.append(
            Insight(
                kind="savings_drawn",
                severity="info",
                title="You took more out of savings than you put in",
                detail=f"Savings went down by {fmt(-use.saved)} this month.",
                amount=-use.saved,
            )
        )

    insights.sort(key=lambda item: SEVERITY_ORDER[item.severity])
    return insights[:MAX_INSIGHTS]


def get_month_report(db: Session, user_id: uuid.UUID, period: date) -> MonthReport:
    start, end = month_bounds(period)
    today = date.today()
    this_month = today.replace(day=1)
    days_in_month = (end - start).days

    if start == this_month:
        last_day = today.day
    elif start < this_month:
        last_day = days_in_month
    else:
        last_day = 0

    expenses = expense_repository.list_for_user(db, user_id, start, end)
    spent_total = sum((expense.amount for expense in expenses), ZERO)
    _, income_received, _ = income_repository.get_period_totals(db, user_id, start)

    obligations_paid = ledger_repository.sum_by_type(
        db, user_id, EntryType.DEBT_PAYMENT.value, start, end
    )
    purchases_paid = ledger_repository.sum_by_type(
        db, user_id, EntryType.PURCHASE_PAYMENT.value, start, end
    )
    saved = savings_flow(db, user_id, start, end)
    invested = ledger_repository.sum_by_type(
        db, user_id, EntryType.INVESTMENT_CONTRIBUTION.value, start, end
    ) - ledger_repository.sum_by_type(
        db, user_id, EntryType.INVESTMENT_WITHDRAWAL.value, start, end
    )

    cash_spent = expense_repository.get_cash_total(db, user_id, start, end)

    use = IncomeUse(
        spent=cash_spent,
        obligations_paid=obligations_paid,
        purchases_paid=purchases_paid,
        saved=saved,
        invested=invested,
        left_over=income_received
        - cash_spent
        - obligations_paid
        - purchases_paid
        - saved
        - invested,
    )

    budget = budget_service.get_status(db, user_id, start)
    brief = BudgetBrief(
        exists=budget.exists,
        total=budget.total_amount,
        spent=budget.spent_total,
        remaining=budget.remaining,
        expected_income=budget.expected_income,
        planned_savings=budget.planned_savings,
    )
    limits = {item.category_id: item.allocated for item in budget.items}

    categories = category_repository.list_for_user(db, user_id, include_inactive=True)
    names = {category.id: category.name for category in categories}

    this_totals: dict = defaultdict(Decimal)
    counts: dict = defaultdict(int)
    daily_totals: dict = defaultdict(Decimal)
    for expense in expenses:
        this_totals[expense.category_id] += expense.amount
        counts[expense.category_id] += 1
        daily_totals[expense.spent_on.day] += expense.amount

    history: list[dict] = []
    cursor = start
    for _ in range(3):
        earlier = previous_month(cursor)
        history.append(
            dict(expense_repository.get_category_totals(db, user_id, earlier, cursor))
        )
        cursor = earlier
    previous_totals = history[0]
    months_with_data = sum(1 for totals in history if totals)

    rows = [
        ReportCategory(
            category_id=category_id,
            name=names.get(category_id, "Uncategorised"),
            amount=amount,
            share=percent(amount, spent_total),
            previous=previous_totals.get(category_id, ZERO),
            change_pct=change_percent(amount, previous_totals.get(category_id, ZERO)),
            transactions=counts[category_id],
            limit=limits.get(category_id),
        )
        for category_id, amount in sorted(
            this_totals.items(), key=lambda item: item[1], reverse=True
        )
    ]

    base_daily = (
        money(budget.total_amount / days_in_month) if budget.exists else None
    )
    days_over = 0
    if base_daily is not None:
        days_over = sum(
            1
            for day in range(1, last_day + 1)
            if daily_totals.get(day, ZERO) > base_daily
        )

    top_expenses = [
        TopExpense(
            id=expense.id,
            label=expense.description or names.get(expense.category_id, "Expense"),
            category_id=expense.category_id,
            amount=expense.amount,
            spent_on=expense.spent_on,
        )
        for expense in sorted(expenses, key=lambda item: item.amount, reverse=True)[:5]
    ]

    insights = build_insights(
        start=start,
        today=today,
        days_in_month=days_in_month,
        last_day=last_day,
        income=income_received,
        spent=spent_total,
        use=use,
        budget=budget,
        rows=rows,
        names=names,
        history=history,
        months_with_data=months_with_data,
        base_daily=base_daily,
        days_over=days_over,
    )

    return MonthReport(
        period=start,
        income_received=income_received,
        spent_total=spent_total,
        savings_rate=percent(saved, income_received),
        average_per_day=money(spent_total / last_day) if last_day > 0 else ZERO,
        use=use,
        budget=brief,
        categories=rows,
        daily=[
            DayTotal(day=day, total=daily_totals.get(day, ZERO))
            for day in range(1, last_day + 1)
        ],
        daily_budget=base_daily,
        days_over_budget=days_over,
        top_expenses=top_expenses,
        insights=insights,
    )


def get_trend(db: Session, user_id: uuid.UUID, period: date, months: int) -> Trend:
    cursor = month_bounds(period)[0]
    starts = []
    for _ in range(months):
        starts.append(cursor)
        cursor = previous_month(cursor)
    starts.reverse()

    points = []
    for start in starts:
        _, end = month_bounds(start)
        _, income, _ = income_repository.get_period_totals(db, user_id, start)
        spent = expense_repository.get_total(db, user_id, start, end)
        saved = savings_flow(db, user_id, start, end)
        budget = budget_repository.get_for_period(db, user_id, start)

        points.append(
            TrendPoint(
                period=start,
                income=income,
                spent=spent,
                saved=saved,
                budget=budget.total_amount if budget else None,
                savings_rate=percent(saved, income),
            )
        )

    return Trend(points=points)