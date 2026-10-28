import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.purchase import Purchase, PurchaseAllocation, PurchasePayment


def get_by_id(
    db: Session, user_id: uuid.UUID, purchase_id: uuid.UUID
) -> Purchase | None:
    statement = (
        select(Purchase)
        .options(selectinload(Purchase.payments).selectinload(PurchasePayment.allocations))
        .where(Purchase.id == purchase_id, Purchase.user_id == user_id)
    )
    return db.scalars(statement).first()


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Purchase]:
    statement = (
        select(Purchase)
        .options(selectinload(Purchase.payments).selectinload(PurchasePayment.allocations))
        .where(Purchase.user_id == user_id)
    )
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    name: str,
    kind: str,
    price: Decimal,
    finance_charges: Decimal,
    lender: str | None,
    purchased_on: date,
    note: str | None,
    installment_amount: Decimal | None,
    frequency: str | None,
    first_due_on: date | None,
) -> Purchase:
    purchase = Purchase(
        user_id=user_id,
        name=name,
        kind=kind,
        price=price,
        finance_charges=finance_charges,
        lender=lender,
        purchased_on=purchased_on,
        note=note,
        installment_amount=installment_amount,
        frequency=frequency,
        first_due_on=first_due_on,
    )
    db.add(purchase)
    db.flush()
    db.refresh(purchase)
    return purchase


def delete(db: Session, purchase: Purchase) -> None:
    db.delete(purchase)
    db.flush()


def add_payment(
    db: Session,
    purchase: Purchase,
    *,
    user_id: uuid.UUID,
    paid_on: date,
    is_deposit: bool,
    note: str | None,
    allocations: list[tuple[uuid.UUID, Decimal]],
) -> PurchasePayment:
    payment = PurchasePayment(
        user_id=user_id, paid_on=paid_on, is_deposit=is_deposit, note=note
    )
    payment.allocations = [
        PurchaseAllocation(account_id=account_id, amount=amount)
        for account_id, amount in allocations
    ]
    purchase.payments.append(payment)
    db.flush()
    return payment


def get_payment(
    db: Session, user_id: uuid.UUID, payment_id: uuid.UUID
) -> PurchasePayment | None:
    statement = (
        select(PurchasePayment)
        .options(selectinload(PurchasePayment.allocations))
        .where(
            PurchasePayment.id == payment_id,
            PurchasePayment.user_id == user_id,
        )
    )
    return db.scalars(statement).first()


def delete_payment(db: Session, payment: PurchasePayment) -> None:
    db.delete(payment)
    db.flush()