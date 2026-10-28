import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.dates import month_bounds
from app.core.enums import EntryType, Pool
from app.models.ledger_entry import LedgerEntry
from app.repositories import (
    account_repository,
    expense_repository,
    income_repository,
    ledger_repository,
)
from app.schemas.savings import SavingsSummary, SavingsTransferCreate
from app.services import account_service, budget_service

SAVINGS_TYPES = [
    EntryType.SAVINGS_DEPOSIT.value,
    EntryType.SAVINGS_WITHDRAWAL.value,
]


class EntryNotFoundError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


def move_money(
    db: Session,
    user_id: uuid.UUID,
    data: SavingsTransferCreate,
    entry_type: str,
    source_pool: str,
    target_pool: str,
) -> LedgerEntry:
    source = account_repository.get_by_id(db, user_id, data.from_account_id)
    target = account_repository.get_by_id(db, user_id, data.to_account_id)

    if source is None or target is None:
        raise InvalidAccountError()
    if not source.is_active or not target.is_active:
        raise InvalidAccountError()
    if source.pool != source_pool or target.pool != target_pool:
        raise InvalidAccountError()

    balance = ledger_repository.get_account_balance(db, user_id, source.id)
    if balance < data.amount:
        raise InsufficientBalanceError("That is more than the account holds")

    entry = ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=entry_type,
        amount=data.amount,
        occurred_on=data.occurred_on,
        from_account_id=source.id,
        to_account_id=target.id,
        description=data.note,
    )
    db.commit()
    db.refresh(entry)
    return entry


def deposit(
    db: Session, user_id: uuid.UUID, data: SavingsTransferCreate
) -> LedgerEntry:
    return move_money(
        db,
        user_id,
        data,
        EntryType.SAVINGS_DEPOSIT.value,
        Pool.AVAILABLE.value,
        Pool.SAVINGS.value,
    )


def withdraw(
    db: Session, user_id: uuid.UUID, data: SavingsTransferCreate
) -> LedgerEntry:
    return move_money(
        db,
        user_id,
        data,
        EntryType.SAVINGS_WITHDRAWAL.value,
        Pool.SAVINGS.value,
        Pool.AVAILABLE.value,
    )


def delete_entry(db: Session, user_id: uuid.UUID, entry_id: uuid.UUID) -> None:
    entry = ledger_repository.get_by_id(db, user_id, entry_id)
    if entry is None or entry.entry_type not in SAVINGS_TYPES:
        raise EntryNotFoundError()

    balance = ledger_repository.get_account_balance(db, user_id, entry.to_account_id)
    if balance < entry.amount:
        raise InsufficientBalanceError(
            "Deleting this would take the account below zero, because the money has already been spent or moved"
        )

    ledger_repository.remove(db, entry)
    db.commit()


def list_entries(
    db: Session, user_id: uuid.UUID, period: date
) -> list[LedgerEntry]:
    start, end = month_bounds(period)
    return ledger_repository.list_by_types(db, user_id, SAVINGS_TYPES, start, end)


def get_summary(db: Session, user_id: uuid.UUID, period: date) -> SavingsSummary:
    start, end = month_bounds(period)

    deposited = ledger_repository.sum_by_type(
        db, user_id, EntryType.SAVINGS_DEPOSIT.value, start, end
    )
    withdrawn = ledger_repository.sum_by_type(
        db, user_id, EntryType.SAVINGS_WITHDRAWAL.value, start, end
    )
    debt_paid = ledger_repository.sum_by_type(
        db, user_id, EntryType.DEBT_PAYMENT.value, start, end
    )
    purchases_paid = ledger_repository.sum_by_type(
        db, user_id, EntryType.PURCHASE_PAYMENT.value, start, end
    )
    net_saved = deposited - withdrawn

    accounts = account_service.get_summary(db, user_id)
    budget = budget_service.get_status(db, user_id, start)
    _, income_received, _ = income_repository.get_period_totals(db, user_id, start)
    spent = expense_repository.get_cash_total(db, user_id, start, end)

    return SavingsSummary(
        period=start,
        savings_balance=accounts.savings,
        deposited=deposited,
        withdrawn=withdrawn,
        net_saved=net_saved,
        planned_savings=budget.planned_savings if budget.exists else None,
        income_received=income_received,
        spent=spent,
        left_unsaved=income_received
        - spent
        - debt_paid
        - purchases_paid
        - net_saved,
    )