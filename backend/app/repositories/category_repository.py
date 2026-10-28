import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category


def get_by_id(
    db: Session, user_id: uuid.UUID, category_id: uuid.UUID
) -> Category | None:
    statement = select(Category).where(
        Category.id == category_id, Category.user_id == user_id
    )
    return db.scalars(statement).first()


def get_by_name(db: Session, user_id: uuid.UUID, name: str) -> Category | None:
    statement = select(Category).where(
        Category.user_id == user_id, func.lower(Category.name) == name.lower()
    )
    return db.scalars(statement).first()


def count_for_user(db: Session, user_id: uuid.UUID) -> int:
    statement = (
        select(func.count()).select_from(Category).where(Category.user_id == user_id)
    )
    return db.scalar(statement) or 0


def list_for_user(
    db: Session, user_id: uuid.UUID, include_inactive: bool = False
) -> list[Category]:
    statement = select(Category).where(Category.user_id == user_id)
    if not include_inactive:
        statement = statement.where(Category.is_active.is_(True))
    statement = statement.order_by(Category.name)
    return list(db.scalars(statement).all())


def create(db: Session, *, user_id: uuid.UUID, name: str, icon: str) -> Category:
    category = Category(user_id=user_id, name=name, icon=icon)
    db.add(category)
    db.flush()
    db.refresh(category)
    return category