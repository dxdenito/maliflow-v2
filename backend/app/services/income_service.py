import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core import income_math
from app.core.enums import EntryType
from app.models.income import Income, IncomeReceipt
from app.repositories import account_repository, income_repository, ledger_repository
from app.schemas.income import (
    IncomeCreate,
    IncomeRead,
    IncomeSummary,
    IncomeUpdate,
    ReceiptCreate,
    ReceiptRead,
)

ZERO = Decimal("0")


class IncomeNotFoundError(Exception):
    pass


class ReceiptNotFoundError(Exception):
    pass


class IncomeAlreadyReceivedError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class NothingReceivedError(Exception):
    pass


def to_read(income: Income) -> IncomeRead:
    return IncomeRead(
        id=income.id,
        source=income.source,
        income_type=income.income_type,
        expected_amount=income.expected_amount,
        expected_on=income.expected_on,
        period=income.period,
        closed=income.closed,
        status=income_math.state(income),
        received_total=income_math.received_total(income),
        remaining=income_math.remaining(income),
        note=income.note,
        created_at=income.created_at,
        receipts=[ReceiptRead.model_validate(receipt) for receipt in income.receipts],
    )


def load(db: Session, user_id: uuid.UUID, income_id: uuid.UUID) -> Income:
    income = income_repository.get_by_id(db, user_id, income_id)
    if income is None:
        raise IncomeNotFoundError()
    return income


def record_receipt(
    db: Session,
    user_id: uuid.UUID,
    income: Income,
    amount: Decimal,
    received_on: date,
    account_id: uuid.UUID,
    note: str | None,
) -> IncomeReceipt:
    account = account_repository.get_by_id(db, user_id, account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()

    receipt = income_repository.add_receipt(
        db,
        income,
        user_id=user_id,
        account_id=account_id,
        amount=amount,
        received_on=received_on,
        note=note,
    )
    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.INCOME.value,
        amount=amount,
        occurred_on=received_on,
        to_account_id=account_id,
        description=income.source,
        reference_type="income_receipt",
        reference_id=receipt.id,
    )
    return receipt


def list_income(
    db: Session,
    user_id: uuid.UUID,
    period: date | None = None,
    status: str | None = None,
) -> list[IncomeRead]:
    reads = [
        to_read(income)
        for income in income_repository.list_for_user(db, user_id, period)
    ]
    if status == "received":
        reads = [item for item in reads if item.status == "received"]
    elif status == "expected":
        reads = [item for item in reads if item.status != "received"]
    return reads


def get_summary(db: Session, user_id: uuid.UUID, period: date) -> IncomeSummary:
    expected, received, pending = income_repository.get_period_totals(
        db, user_id, period
    )
    return IncomeSummary(
        period=period,
        expected_total=expected,
        received_total=received,
        pending_total=pending,
    )


def create_income(db: Session, user_id: uuid.UUID, data: IncomeCreate) -> IncomeRead:
    period = (
        data.period.replace(day=1)
        if data.period
        else data.expected_on.replace(day=1)
    )

    try:
        income = income_repository.create(
            db,
            user_id=user_id,
            source=data.source,
            income_type=data.income_type.value,
            expected_amount=data.expected_amount,
            expected_on=data.expected_on,
            period=period,
            note=data.note,
        )
        if data.account_id is not None:
            record_receipt(
                db,
                user_id,
                income,
                data.received_amount,
                data.received_on,
                data.account_id,
                None,
            )
        db.commit()
    except InvalidAccountError:
        db.rollback()
        raise

    db.refresh(income)
    return to_read(income)


def update_income(
    db: Session, user_id: uuid.UUID, income_id: uuid.UUID, data: IncomeUpdate
) -> IncomeRead:
    income = load(db, user_id, income_id)

    changes = data.model_dump(exclude_unset=True)
    for key in (
        "source",
        "income_type",
        "expected_amount",
        "expected_on",
        "period",
        "closed",
    ):
        if key in changes and changes[key] is None:
            del changes[key]

    if changes.get("closed") is True and income_math.received_total(income) <= 0:
        raise NothingReceivedError()

    if "income_type" in changes:
        changes["income_type"] = changes["income_type"].value
    if "period" in changes:
        changes["period"] = changes["period"].replace(day=1)

    for key, value in changes.items():
        setattr(income, key, value)

    db.commit()
    db.refresh(income)
    return to_read(income)


def add_receipt(
    db: Session, user_id: uuid.UUID, income_id: uuid.UUID, data: ReceiptCreate
) -> IncomeRead:
    income = load(db, user_id, income_id)
    if income_math.state(income) == "received":
        raise IncomeAlreadyReceivedError()

    try:
        record_receipt(
            db,
            user_id,
            income,
            data.amount,
            data.received_on,
            data.account_id,
            data.note,
        )
        if data.close:
            income.closed = True
        db.commit()
    except InvalidAccountError:
        db.rollback()
        raise

    db.refresh(income)
    return to_read(income)


def delete_receipt(db: Session, user_id: uuid.UUID, receipt_id: uuid.UUID) -> None:
    receipt = income_repository.get_receipt(db, user_id, receipt_id)
    if receipt is None:
        raise ReceiptNotFoundError()

    balance = ledger_repository.get_account_balance(db, user_id, receipt.account_id)
    if balance < receipt.amount:
        raise InsufficientBalanceError()

    income = receipt.income
    others = [item for item in income.receipts if item.id != receipt.id]
    if not others:
        income.closed = False

    ledger_repository.delete_by_reference(db, user_id, "income_receipt", receipt.id)
    income_repository.delete_receipt(db, receipt)
    db.commit()


def delete_income(db: Session, user_id: uuid.UUID, income_id: uuid.UUID) -> None:
    income = load(db, user_id, income_id)

    needed: dict[uuid.UUID, Decimal] = {}
    for receipt in income.receipts:
        needed[receipt.account_id] = needed.get(receipt.account_id, ZERO) + receipt.amount

    for account_id, total in needed.items():
        balance = ledger_repository.get_account_balance(db, user_id, account_id)
        if balance < total:
            raise InsufficientBalanceError()

    for receipt in income.receipts:
        ledger_repository.delete_by_reference(
            db, user_id, "income_receipt", receipt.id
        )

    income_repository.delete(db, income)
    db.commit()