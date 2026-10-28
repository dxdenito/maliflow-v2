import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.investment import Investment, InvestmentEvent


def get_by_id(
    db: Session, user_id: uuid.UUID, investment_id: uuid.UUID
) -> Investment | None:
    statement = (
        select(Investment)
        .options(selectinload(Investment.events))
        .where(Investment.id == investment_id, Investment.user_id == user_id)
    )
    return db.scalars(statement).first()


def get_by_name(db: Session, user_id: uuid.UUID, name: str) -> Investment | None:
    statement = select(Investment).where(
        Investment.user_id == user_id, func.lower(Investment.name) == name.lower()
    )
    return db.scalars(statement).first()


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Investment]:
    statement = (
        select(Investment)
        .options(selectinload(Investment.events))
        .where(Investment.user_id == user_id)
    )
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    name: str,
    investment_type: str,
    note: str | None,
) -> Investment:
    investment = Investment(
        user_id=user_id, name=name, investment_type=investment_type, note=note
    )
    db.add(investment)
    db.flush()
    db.refresh(investment)
    return investment


def delete(db: Session, investment: Investment) -> None:
    db.delete(investment)
    db.flush()


def add_event(
    db: Session,
    investment: Investment,
    *,
    user_id: uuid.UUID,
    kind: str,
    amount: Decimal,
    occurred_on: date,
    account_id: uuid.UUID | None,
    note: str | None,
) -> InvestmentEvent:
    event = InvestmentEvent(
        user_id=user_id,
        kind=kind,
        amount=amount,
        occurred_on=occurred_on,
        account_id=account_id,
        note=note,
    )
    investment.events.append(event)
    db.flush()
    db.refresh(event)
    return event


def get_event(
    db: Session, user_id: uuid.UUID, event_id: uuid.UUID
) -> InvestmentEvent | None:
    statement = select(InvestmentEvent).where(
        InvestmentEvent.id == event_id, InvestmentEvent.user_id == user_id
    )
    return db.scalars(statement).first()


def delete_event(db: Session, event: InvestmentEvent) -> None:
    db.delete(event)
    db.flush()