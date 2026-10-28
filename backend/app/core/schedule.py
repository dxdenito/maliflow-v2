import calendar
import math
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

FREQUENCIES = ("daily", "weekly", "monthly")
MAX_INSTALLMENTS = 2000
ZERO = Decimal("0")


def add_months(start: date, months: int) -> date:
    index = start.year * 12 + (start.month - 1) + months
    year, month_index = divmod(index, 12)
    month = month_index + 1
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(start.day, last_day))


def due_date(first_due: date, frequency: str, index: int) -> date:
    if frequency == "daily":
        return first_due + timedelta(days=index)
    if frequency == "weekly":
        return first_due + timedelta(weeks=index)
    return add_months(first_due, index)


def installment_count(total: Decimal, amount: Decimal) -> int:
    return math.ceil(total / amount)


def count_due(
    first_due: date, frequency: str, total_count: int, as_of: date
) -> int:
    if as_of < first_due:
        return 0

    if frequency == "daily":
        passed = (as_of - first_due).days + 1
    elif frequency == "weekly":
        passed = (as_of - first_due).days // 7 + 1
    else:
        months = (as_of.year - first_due.year) * 12 + (as_of.month - first_due.month)
        if add_months(first_due, months) > as_of:
            months -= 1
        passed = months + 1

    return min(total_count, passed)


@dataclass(frozen=True)
class PlanState:
    installments_total: int
    installments_paid: int
    next_due_on: date | None
    next_due_amount: Decimal
    due_now: Decimal
    overdue_amount: Decimal
    overdue_count: int


def compute_plan(
    total: Decimal,
    amount: Decimal,
    frequency: str,
    first_due: date,
    paid: Decimal,
    today: date,
) -> PlanState:
    count = installment_count(total, amount)

    if total - paid <= 0:
        return PlanState(count, count, None, ZERO, ZERO, ZERO, 0)

    covered = int(paid // amount)
    next_due = due_date(first_due, frequency, covered)
    next_amount = min(total, (covered + 1) * amount) - paid

    due_today = count_due(first_due, frequency, count, today)
    due_before_today = count_due(
        first_due, frequency, count, today - timedelta(days=1)
    )

    due_now = max(ZERO, min(total, due_today * amount) - paid)
    overdue_amount = max(ZERO, min(total, due_before_today * amount) - paid)
    overdue_count = max(0, due_before_today - covered)

    return PlanState(
        installments_total=count,
        installments_paid=covered,
        next_due_on=next_due,
        next_due_amount=next_amount,
        due_now=due_now,
        overdue_amount=overdue_amount,
        overdue_count=overdue_count,
    )