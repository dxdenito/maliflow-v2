import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account


def get_by_id(db: Session, user_id: uuid.UUID, account_id: uuid.UUID) -> Account | None:
    statement = select(Account).where(
        Account.id == account_id, Account.user_id == user_id
    )
    return db.scalars(statement).first()


def get_by_name(db: Session, user_id: uuid.UUID, name: str) -> Account | None:
    statement = select(Account).where(
        Account.user_id == user_id, func.lower(Account.name) == name.lower()
    )
    return db.scalars(statement).first()


def list_for_user(
    db: Session, user_id: uuid.UUID, include_inactive: bool = False
) -> list[Account]:
    statement = select(Account).where(Account.user_id == user_id)
    if not include_inactive:
        statement = statement.where(Account.is_active.is_(True))
    statement = statement.order_by(Account.pool, Account.created_at)
    return list(db.scalars(statement).all())


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    name: str,
    account_type: str,
    pool: str,
) -> Account:
    account = Account(
        user_id=user_id, name=name, account_type=account_type, pool=pool
    )
    db.add(account)
    db.flush()
    db.refresh(account)
    return account