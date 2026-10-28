import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.dates import month_bounds
from app.core.enums import EntryType
from app.models.ledger_entry import LedgerEntry
from app.repositories import account_repository, ledger_repository
from app.schemas.ledger import AdjustmentCreate, LedgerSummary, TransferCreate

MANUAL_TYPES = (EntryType.ADJUSTMENT.value, EntryType.TRANSFER.value)


class EntryNotFoundError(Exception):
    pass


class NotManualEntryError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class DifferentPoolsError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class NoChangeError(Exception):
    pass


def usable_account(db: Session, user_id: uuid.UUID, account_id: uuid.UUID):
    account = account_repository.get_by_id(db, user_id, account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()
    return account


def list_entries(
    db: Session,
    user_id: uuid.UUID,
    period: date,
    entry_type: str | None = None,
    account_id: uuid.UUID | None = None,
) -> list[LedgerEntry]:
    start, end = month_bounds(period)
    return ledger_repository.list_filtered(
        db, user_id, start, end, entry_type, account_id
    )


def get_summary(db: Session, user_id: uuid.UUID, period: date) -> LedgerSummary:
    start, end = month_bounds(period)
    money_in, money_out, adjustments_net, count = ledger_repository.get_flows(
        db, user_id, start, end
    )
    return LedgerSummary(
        period=start,
        money_in=money_in,
        money_out=money_out,
        adjustments_net=adjustments_net,
        entry_count=count,
    )


def adjust_balance(
    db: Session, user_id: uuid.UUID, data: AdjustmentCreate
) -> LedgerEntry:
    account = usable_account(db, user_id, data.account_id)
    current = ledger_repository.get_account_balance(db, user_id, account.id)
    difference = data.new_balance - current

    if difference == 0:
        raise NoChangeError()

    description = data.note or "Balance adjustment"

    if difference > 0:
        entry = ledger_repository.create(
            db,
            user_id=user_id,
            entry_type=EntryType.ADJUSTMENT.value,
            amount=difference,
            occurred_on=data.occurred_on,
            to_account_id=account.id,
            description=description,
            reference_type="adjustment",
        )
    else:
        entry = ledger_repository.create(
            db,
            user_id=user_id,
            entry_type=EntryType.ADJUSTMENT.value,
            amount=-difference,
            occurred_on=data.occurred_on,
            from_account_id=account.id,
            description=description,
            reference_type="adjustment",
        )

    db.commit()
    db.refresh(entry)
    return entry


def transfer(db: Session, user_id: uuid.UUID, data: TransferCreate) -> LedgerEntry:
    source = usable_account(db, user_id, data.from_account_id)
    target = usable_account(db, user_id, data.to_account_id)

    if source.pool != target.pool:
        raise DifferentPoolsError()

    balance = ledger_repository.get_account_balance(db, user_id, source.id)
    if balance < data.amount:
        raise InsufficientBalanceError("That is more than the account holds")

    entry = ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.TRANSFER.value,
        amount=data.amount,
        occurred_on=data.occurred_on,
        from_account_id=source.id,
        to_account_id=target.id,
        description=data.note,
        reference_type="transfer",
    )
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, user_id: uuid.UUID, entry_id: uuid.UUID) -> None:
    entry = ledger_repository.get_by_id(db, user_id, entry_id)
    if entry is None:
        raise EntryNotFoundError()
    if entry.entry_type not in MANUAL_TYPES:
        raise NotManualEntryError()

    if entry.to_account_id is not None:
        balance = ledger_repository.get_account_balance(
            db, user_id, entry.to_account_id
        )
        if balance < entry.amount:
            raise InsufficientBalanceError(
                "Deleting this would take the account below zero, because the money has already been spent or moved"
            )

    ledger_repository.remove(db, entry)
    db.commit()