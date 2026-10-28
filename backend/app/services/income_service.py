import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.enums import EntryType, IncomeStatus
from app.models.income import Income
from app.repositories import account_repository, income_repository, ledger_repository
from app.schemas.income import IncomeCreate, IncomeReceive, IncomeSummary


class IncomeNotFoundError(Exception):
    pass


class IncomeAlreadyReceivedError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


def record_receipt(
    db: Session,
    user_id: uuid.UUID,
    income: Income,
    amount,
    received_on: date,
    account_id: uuid.UUID,
) -> None:
    account = account_repository.get_by_id(db, user_id, account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()

    income.status = IncomeStatus.RECEIVED.value
    income.received_amount = amount
    income.received_on = received_on
    income.account_id = account_id

    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.INCOME.value,
        amount=amount,
        occurred_on=received_on,
        to_account_id=account_id,
        description=income.source,
        reference_type="income",
        reference_id=income.id,
    )


def create_income(db: Session, user_id: uuid.UUID, data: IncomeCreate) -> Income:
    period = data.period.replace(day=1) if data.period else data.expected_on.replace(day=1)

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
            )
        db.commit()
    except InvalidAccountError:
        db.rollback()
        raise

    db.refresh(income)
    return income


def receive_income(
    db: Session, user_id: uuid.UUID, income_id: uuid.UUID, data: IncomeReceive
) -> Income:
    income = income_repository.get_by_id(db, user_id, income_id)
    if income is None:
        raise IncomeNotFoundError()
    if income.status == IncomeStatus.RECEIVED.value:
        raise IncomeAlreadyReceivedError()

    try:
        record_receipt(
            db, user_id, income, data.received_amount, data.received_on, data.account_id
        )
        db.commit()
    except InvalidAccountError:
        db.rollback()
        raise

    db.refresh(income)
    return income


def delete_income(db: Session, user_id: uuid.UUID, income_id: uuid.UUID) -> None:
    income = income_repository.get_by_id(db, user_id, income_id)
    if income is None:
        raise IncomeNotFoundError()

    if income.status == IncomeStatus.RECEIVED.value:
        balance = ledger_repository.get_account_balance(
            db, user_id, income.account_id
        )
        if balance - income.received_amount < 0:
            raise InsufficientBalanceError()
        ledger_repository.delete_by_reference(db, user_id, "income", income.id)

    income_repository.delete(db, income)
    db.commit()


def list_income(
    db: Session,
    user_id: uuid.UUID,
    period: date | None = None,
    status: str | None = None,
) -> list[Income]:
    return income_repository.list_for_user(db, user_id, period, status)


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