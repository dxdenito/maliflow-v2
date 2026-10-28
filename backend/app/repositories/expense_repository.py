import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense


def get_by_id(db: Session, user_id: uuid.UUID, expense_id: uuid.UUID) -> Expense | None:
    statement = select(Expense).where(
        Expense.id == expense_id, Expense.user_id == user_id
    )
    return db.scalars(statement).first()


def list_for_user(
    db: Session,
    user_id: uuid.UUID,
    start: date,
    end: date,
    category_id: uuid.UUID | None = None,
) -> list[Expense]:
    statement = select(Expense).where(
        Expense.user_id == user_id,
        Expense.spent_on >= start,
        Expense.spent_on < end,
    )
    if category_id is not None:
        statement = statement.where(Expense.category_id == category_id)
    statement = statement.order_by(Expense.spent_on.desc(), Expense.created_at.desc())
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    account_id: uuid.UUID | None,
    amount: Decimal,
    spent_on: date,
    description: str | None,
    obligation_id: uuid.UUID | None = None,
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category_id=category_id,
        account_id=account_id,
        obligation_id=obligation_id,
        amount=amount,
        spent_on=spent_on,
        description=description,
    )
    db.add(expense)
    db.flush()
    db.refresh(expense)
    return expense


def delete(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.flush()


def get_total(db: Session, user_id: uuid.UUID, start: date, end: date) -> Decimal:
    statement = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == user_id,
        Expense.spent_on >= start,
        Expense.spent_on < end,
    )
    return Decimal(db.scalar(statement))


def get_cash_total(db: Session, user_id: uuid.UUID, start: date, end: date) -> Decimal:
    statement = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == user_id,
        Expense.spent_on >= start,
        Expense.spent_on < end,
        Expense.account_id.is_not(None),
    )
    return Decimal(db.scalar(statement))


def get_category_totals(
    db: Session, user_id: uuid.UUID, start: date, end: date
) -> list[tuple[uuid.UUID, Decimal]]:
    total = func.sum(Expense.amount)
    statement = (
        select(Expense.category_id, total)
        .where(
            Expense.user_id == user_id,
            Expense.spent_on >= start,
            Expense.spent_on < end,
        )
        .group_by(Expense.category_id)
        .order_by(total.desc())
    )
    return [
        (category_id, Decimal(amount))
        for category_id, amount in db.execute(statement).all()
    ]