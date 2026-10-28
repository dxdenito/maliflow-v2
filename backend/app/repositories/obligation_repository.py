import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.obligation import Obligation, ObligationPayment


def get_by_id(
    db: Session, user_id: uuid.UUID, obligation_id: uuid.UUID
) -> Obligation | None:
    statement = (
        select(Obligation)
        .options(selectinload(Obligation.payments))
        .where(Obligation.id == obligation_id, Obligation.user_id == user_id)
    )
    return db.scalars(statement).first()


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Obligation]:
    statement = (
        select(Obligation)
        .options(selectinload(Obligation.payments))
        .where(Obligation.user_id == user_id)
    )
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    name: str,
    original_amount: Decimal,
    due_on: date | None,
    note: str | None,
    installment_amount: Decimal | None = None,
    frequency: str | None = None,
    first_due_on: date | None = None,
) -> Obligation:
    obligation = Obligation(
        user_id=user_id,
        name=name,
        original_amount=original_amount,
        due_on=due_on,
        note=note,
        installment_amount=installment_amount,
        frequency=frequency,
        first_due_on=first_due_on,
    )
    db.add(obligation)
    db.flush()
    db.refresh(obligation)
    return obligation


def delete(db: Session, obligation: Obligation) -> None:
    db.delete(obligation)
    db.flush()


def add_payment(
    db: Session,
    obligation: Obligation,
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount: Decimal,
    paid_on: date,
    note: str | None,
) -> ObligationPayment:
    payment = ObligationPayment(
        user_id=user_id,
        account_id=account_id,
        amount=amount,
        paid_on=paid_on,
        note=note,
    )
    obligation.payments.append(payment)
    db.flush()
    return payment


def get_payment(
    db: Session, user_id: uuid.UUID, payment_id: uuid.UUID
) -> ObligationPayment | None:
    statement = select(ObligationPayment).where(
        ObligationPayment.id == payment_id,
        ObligationPayment.user_id == user_id,
    )
    return db.scalars(statement).first()


def delete_payment(db: Session, payment: ObligationPayment) -> None:
    db.delete(payment)
    db.flush()