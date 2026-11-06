import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core import income_math
from app.models.income import Income, IncomeReceipt

ZERO = Decimal("0")


def get_by_id(db: Session, user_id: uuid.UUID, income_id: uuid.UUID) -> Income | None:
    statement = (
        select(Income)
        .options(selectinload(Income.receipts))
        .where(Income.id == income_id, Income.user_id == user_id)
    )
    return db.scalars(statement).first()


def list_for_user(
    db: Session, user_id: uuid.UUID, period: date | None = None
) -> list[Income]:
    statement = (
        select(Income)
        .options(selectinload(Income.receipts))
        .where(Income.user_id == user_id)
    )
    if period is not None:
        statement = statement.where(Income.period == period)
    statement = statement.order_by(Income.expected_on.desc(), Income.created_at.desc())
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    source: str,
    income_type: str,
    expected_amount: Decimal,
    expected_on: date,
    period: date,
    note: str | None,
) -> Income:
    income = Income(
        user_id=user_id,
        source=source,
        income_type=income_type,
        expected_amount=expected_amount,
        expected_on=expected_on,
        period=period,
        note=note,
    )
    db.add(income)
    db.flush()
    db.refresh(income)
    return income


def delete(db: Session, income: Income) -> None:
    db.delete(income)
    db.flush()


def add_receipt(
    db: Session,
    income: Income,
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount: Decimal,
    received_on: date,
    note: str | None,
) -> IncomeReceipt:
    receipt = IncomeReceipt(
        user_id=user_id,
        account_id=account_id,
        amount=amount,
        received_on=received_on,
        note=note,
    )
    income.receipts.append(receipt)
    db.flush()
    return receipt


def get_receipt(
    db: Session, user_id: uuid.UUID, receipt_id: uuid.UUID
) -> IncomeReceipt | None:
    statement = select(IncomeReceipt).where(
        IncomeReceipt.id == receipt_id, IncomeReceipt.user_id == user_id
    )
    return db.scalars(statement).first()


def delete_receipt(db: Session, receipt: IncomeReceipt) -> None:
    db.delete(receipt)
    db.flush()


def get_period_totals(
    db: Session, user_id: uuid.UUID, period: date
) -> tuple[Decimal, Decimal, Decimal]:
    incomes = list_for_user(db, user_id, period)

    expected = sum((income.expected_amount for income in incomes), ZERO)
    received = sum((income_math.received_total(income) for income in incomes), ZERO)
    pending = sum((income_math.pending(income) for income in incomes), ZERO)

    return expected, received, pending