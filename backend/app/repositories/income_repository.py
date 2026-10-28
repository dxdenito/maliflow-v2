import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.income import Income


def get_by_id(db: Session, user_id: uuid.UUID, income_id: uuid.UUID) -> Income | None:
    statement = select(Income).where(
        Income.id == income_id, Income.user_id == user_id
    )
    return db.scalars(statement).first()


def list_for_user(
    db: Session,
    user_id: uuid.UUID,
    period: date | None = None,
    status: str | None = None,
) -> list[Income]:
    statement = select(Income).where(Income.user_id == user_id)
    if period is not None:
        statement = statement.where(Income.period == period)
    if status is not None:
        statement = statement.where(Income.status == status)
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
        status="expected",
    )
    db.add(income)
    db.flush()
    db.refresh(income)
    return income


def delete(db: Session, income: Income) -> None:
    db.delete(income)
    db.flush()


def get_period_totals(
    db: Session, user_id: uuid.UUID, period: date
) -> tuple[Decimal, Decimal, Decimal]:
    statement = select(
        func.coalesce(func.sum(Income.expected_amount), 0),
        func.coalesce(
            func.sum(
                case((Income.status == "received", Income.received_amount), else_=0)
            ),
            0,
        ),
        func.coalesce(
            func.sum(
                case((Income.status == "expected", Income.expected_amount), else_=0)
            ),
            0,
        ),
    ).where(Income.user_id == user_id, Income.period == period)

    expected, received, pending = db.execute(statement).one()
    return Decimal(expected), Decimal(received), Decimal(pending)