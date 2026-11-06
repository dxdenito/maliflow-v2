from decimal import Decimal

ZERO = Decimal("0")


def received_total(income) -> Decimal:
    return sum((receipt.amount for receipt in income.receipts), ZERO)


def remaining(income) -> Decimal:
    return max(ZERO, income.expected_amount - received_total(income))


def state(income) -> str:
    received = received_total(income)

    if income.closed or received >= income.expected_amount:
        return "received"
    if received > 0:
        return "partial"
    return "expected"


def pending(income) -> Decimal:
    if state(income) == "received":
        return ZERO
    return remaining(income)