import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import EntryType, Pool
from app.models.account import Account
from app.repositories import account_repository, ledger_repository
from app.schemas.account import (
    AccountCreate,
    AccountRead,
    AccountSummary,
    AccountUpdate,
)


class AccountNotFoundError(Exception):
    pass


class AccountNameTakenError(Exception):
    pass


class AccountHasBalanceError(Exception):
    pass


def to_read(account: Account, balance: Decimal) -> AccountRead:
    result = AccountRead.model_validate(account)
    result.balance = balance
    return result


def list_accounts(
    db: Session, user_id: uuid.UUID, include_inactive: bool = False
) -> list[AccountRead]:
    accounts = account_repository.list_for_user(db, user_id, include_inactive)
    balances = ledger_repository.get_account_balances(db, user_id)
    return [
        to_read(account, balances.get(account.id, Decimal("0")))
        for account in accounts
    ]


def get_summary(db: Session, user_id: uuid.UUID) -> AccountSummary:
    accounts = account_repository.list_for_user(db, user_id, include_inactive=True)
    balances = ledger_repository.get_account_balances(db, user_id)

    available = Decimal("0")
    savings = Decimal("0")
    for account in accounts:
        balance = balances.get(account.id, Decimal("0"))
        if account.pool == Pool.SAVINGS:
            savings += balance
        else:
            available += balance

    return AccountSummary(
        available=available, savings=savings, total=available + savings
    )


def create_account(db: Session, user_id: uuid.UUID, data: AccountCreate) -> AccountRead:
    if account_repository.get_by_name(db, user_id, data.name) is not None:
        raise AccountNameTakenError()

    try:
        account = account_repository.create(
            db,
            user_id=user_id,
            name=data.name,
            account_type=data.account_type.value,
            pool=data.pool.value,
        )
        if data.opening_balance > 0:
            ledger_repository.create(
                db,
                user_id=user_id,
                entry_type=EntryType.OPENING_BALANCE.value,
                amount=data.opening_balance,
                occurred_on=date.today(),
                to_account_id=account.id,
                description="Opening balance",
                reference_type="account",
                reference_id=account.id,
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AccountNameTakenError()

    db.refresh(account)
    return to_read(account, data.opening_balance)


def update_account(
    db: Session, user_id: uuid.UUID, account_id: uuid.UUID, data: AccountUpdate
) -> AccountRead:
    account = account_repository.get_by_id(db, user_id, account_id)
    if account is None:
        raise AccountNotFoundError()

    changes = {
        key: value
        for key, value in data.model_dump(exclude_unset=True, mode="json").items()
        if value is not None
    }

    new_name = changes.get("name")
    if new_name is not None:
        existing = account_repository.get_by_name(db, user_id, new_name)
        if existing is not None and existing.id != account.id:
            raise AccountNameTakenError()

    balance = ledger_repository.get_account_balance(db, user_id, account.id)
    if changes.get("is_active") is False and account.is_active and balance != 0:
        raise AccountHasBalanceError()

    for key, value in changes.items():
        setattr(account, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AccountNameTakenError()

    db.refresh(account)
    return to_read(account, balance)