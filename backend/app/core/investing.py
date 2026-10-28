from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0")
ONE = Decimal("1")
CENT = Decimal("0.01")
RANK = {"opening": 0, "contribution": 1, "valuation": 2, "withdrawal": 3}
LATEST = datetime.max.replace(tzinfo=timezone.utc)


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def event_sort_key(event):
    return (event.occurred_on, event.created_at or LATEST, RANK[event.kind])


@dataclass(frozen=True)
class Position:
    value: Decimal
    basis: Decimal
    contributed: Decimal
    withdrawn: Decimal
    realized: Decimal

    @property
    def unrealized(self) -> Decimal:
        return self.value - self.basis

    @property
    def total_gain(self) -> Decimal:
        return self.realized + self.unrealized

    @property
    def return_pct(self) -> Decimal | None:
        if self.contributed <= 0:
            return None
        return money(self.total_gain / self.contributed * 100)


def compute_position(events) -> Position:
    value = ZERO
    basis = ZERO
    contributed = ZERO
    withdrawn = ZERO
    realized = ZERO

    for event in sorted(events, key=event_sort_key):
        amount = event.amount

        if event.kind in ("opening", "contribution"):
            value += amount
            basis += amount
            contributed += amount
        elif event.kind == "valuation":
            value = amount
        elif value <= 0:
            withdrawn += amount
            realized += amount - basis
            basis = ZERO
            value = ZERO
        else:
            withdrawn += amount
            profit = value - basis

            if profit > 0:
                from_profit = min(amount, profit)
                realized += from_profit
                basis = max(ZERO, basis - (amount - from_profit))
            else:
                fraction = min(amount / value, ONE)
                cost_out = basis * fraction
                realized += amount - cost_out
                basis -= cost_out

            value = max(ZERO, value - amount)

    return Position(
        value=money(value),
        basis=money(basis),
        contributed=money(contributed),
        withdrawn=money(withdrawn),
        realized=money(realized),
    )


def position_as_of(events, as_of: date) -> Position:
    return compute_position(
        [event for event in events if event.occurred_on <= as_of]
    )


def last_valued_on(events) -> date | None:
    dates = [
        event.occurred_on
        for event in events
        if event.kind in ("valuation", "opening")
    ]
    return max(dates) if dates else None