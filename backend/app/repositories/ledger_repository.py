import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from app.models.ledger_entry import LedgerEntry

EXCLUDED_FROM_FLOWS = ("opening_balance", "adjustment")


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    entry_type: str,
    amount: Decimal,
    occurred_on: date,
    from_account_id: uuid.UUID | None = None,
    to_account_id: uuid.UUID | None = None,
    description: str | None = None,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
) -> LedgerEntry:
    entry = LedgerEntry(
        user_id=user_id,
        entry_type=entry_type,
        amount=amount,
        occurred_on=occurred_on,
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(entry)
    db.flush()
    db.refresh(entry)
    return entry


def get_account_balances(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, Decimal]:
    balances: dict[uuid.UUID, Decimal] = {}

    incoming = db.execute(
        select(LedgerEntry.to_account_id, func.sum(LedgerEntry.amount))
        .where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.to_account_id.is_not(None),
        )
        .group_by(LedgerEntry.to_account_id)
    ).all()
    for account_id, total in incoming:
        balances[account_id] = balances.get(account_id, Decimal("0")) + total

    outgoing = db.execute(
        select(LedgerEntry.from_account_id, func.sum(LedgerEntry.amount))
        .where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.from_account_id.is_not(None),
        )
        .group_by(LedgerEntry.from_account_id)
    ).all()
    for account_id, total in outgoing:
        balances[account_id] = balances.get(account_id, Decimal("0")) - total

    return balances


def get_account_balance(
    db: Session, user_id: uuid.UUID, account_id: uuid.UUID
) -> Decimal:
    incoming = db.scalar(
        select(func.coalesce(func.sum(LedgerEntry.amount), 0)).where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.to_account_id == account_id,
        )
    )
    outgoing = db.scalar(
        select(func.coalesce(func.sum(LedgerEntry.amount), 0)).where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.from_account_id == account_id,
        )
    )
    return Decimal(incoming) - Decimal(outgoing)


def delete_by_reference(
    db: Session,
    user_id: uuid.UUID,
    reference_type: str,
    reference_id: uuid.UUID,
) -> None:
    db.execute(
        delete(LedgerEntry).where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.reference_type == reference_type,
            LedgerEntry.reference_id == reference_id,
        )
    )


def update_by_reference(
    db: Session,
    user_id: uuid.UUID,
    reference_type: str,
    reference_id: uuid.UUID,
    **values,
) -> None:
    db.execute(
        update(LedgerEntry)
        .where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.reference_type == reference_type,
            LedgerEntry.reference_id == reference_id,
        )
        .values(**values)
    )


def get_by_id(
    db: Session, user_id: uuid.UUID, entry_id: uuid.UUID
) -> LedgerEntry | None:
    statement = select(LedgerEntry).where(
        LedgerEntry.id == entry_id, LedgerEntry.user_id == user_id
    )
    return db.scalars(statement).first()


def list_by_types(
    db: Session,
    user_id: uuid.UUID,
    entry_types: list[str],
    start: date,
    end: date,
) -> list[LedgerEntry]:
    statement = (
        select(LedgerEntry)
        .where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.entry_type.in_(entry_types),
            LedgerEntry.occurred_on >= start,
            LedgerEntry.occurred_on < end,
        )
        .order_by(LedgerEntry.occurred_on.desc(), LedgerEntry.created_at.desc())
    )
    return list(db.scalars(statement).all())


def sum_by_type(
    db: Session, user_id: uuid.UUID, entry_type: str, start: date, end: date
) -> Decimal:
    statement = select(func.coalesce(func.sum(LedgerEntry.amount), 0)).where(
        LedgerEntry.user_id == user_id,
        LedgerEntry.entry_type == entry_type,
        LedgerEntry.occurred_on >= start,
        LedgerEntry.occurred_on < end,
    )
    return Decimal(db.scalar(statement))


def remove(db: Session, entry: LedgerEntry) -> None:
    db.delete(entry)
    db.flush()


def list_filtered(
    db: Session,
    user_id: uuid.UUID,
    start: date,
    end: date,
    entry_type: str | None = None,
    account_id: uuid.UUID | None = None,
) -> list[LedgerEntry]:
    statement = select(LedgerEntry).where(
        LedgerEntry.user_id == user_id,
        LedgerEntry.occurred_on >= start,
        LedgerEntry.occurred_on < end,
    )
    if entry_type is not None:
        statement = statement.where(LedgerEntry.entry_type == entry_type)
    if account_id is not None:
        statement = statement.where(
            or_(
                LedgerEntry.from_account_id == account_id,
                LedgerEntry.to_account_id == account_id,
            )
        )
    statement = statement.order_by(
        LedgerEntry.occurred_on.desc(), LedgerEntry.created_at.desc()
    )
    return list(db.scalars(statement).all())


def get_flows(
    db: Session, user_id: uuid.UUID, start: date, end: date
) -> tuple[Decimal, Decimal, Decimal, int]:
    in_range = (
        LedgerEntry.user_id == user_id,
        LedgerEntry.occurred_on >= start,
        LedgerEntry.occurred_on < end,
    )
    total = func.coalesce(func.sum(LedgerEntry.amount), 0)

    money_in = db.scalar(
        select(total).where(
            *in_range,
            LedgerEntry.from_account_id.is_(None),
            LedgerEntry.entry_type.not_in(EXCLUDED_FROM_FLOWS),
        )
    )
    money_out = db.scalar(
        select(total).where(
            *in_range,
            LedgerEntry.to_account_id.is_(None),
            LedgerEntry.entry_type.not_in(EXCLUDED_FROM_FLOWS),
        )
    )
    adjusted_up = db.scalar(
        select(total).where(
            *in_range,
            LedgerEntry.entry_type == "adjustment",
            LedgerEntry.from_account_id.is_(None),
        )
    )
    adjusted_down = db.scalar(
        select(total).where(
            *in_range,
            LedgerEntry.entry_type == "adjustment",
            LedgerEntry.to_account_id.is_(None),
        )
    )
    count = db.scalar(select(func.count()).select_from(LedgerEntry).where(*in_range))

    return (
        Decimal(money_in),
        Decimal(money_out),
        Decimal(adjusted_up) - Decimal(adjusted_down),
        int(count),
    )