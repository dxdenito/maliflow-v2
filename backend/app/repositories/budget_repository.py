import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.budget import Budget, BudgetItem


def get_for_period(db: Session, user_id: uuid.UUID, period: date) -> Budget | None:
    statement = (
        select(Budget)
        .options(selectinload(Budget.items))
        .where(Budget.user_id == user_id, Budget.period == period)
    )
    return db.scalars(statement).first()


def create(
    db: Session, *, user_id: uuid.UUID, period: date, total_amount: Decimal
) -> Budget:
    budget = Budget(user_id=user_id, period=period, total_amount=total_amount)
    db.add(budget)
    db.flush()
    db.refresh(budget)
    return budget


def sync_items(
    db: Session, budget: Budget, amounts: dict[uuid.UUID, Decimal]
) -> None:
    existing = {item.category_id: item for item in budget.items}

    for category_id, item in existing.items():
        if category_id not in amounts:
            budget.items.remove(item)

    for category_id, amount in amounts.items():
        if category_id in existing:
            existing[category_id].amount = amount
        else:
            budget.items.append(BudgetItem(category_id=category_id, amount=amount))

    db.flush()


def delete(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.flush()