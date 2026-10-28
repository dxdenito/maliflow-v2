import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories import category_repository
from app.schemas.category import CategoryCreate, CategoryUpdate

DEFAULT_CATEGORIES = [
    ("Food", "utensils"),
    ("Transport", "bus"),
    ("Rent", "home"),
    ("Utilities", "zap"),
    ("Airtime & data", "smartphone"),
    ("Clothes", "shirt"),
    ("Health", "heart-pulse"),
    ("Entertainment", "clapperboard"),
    ("Other", "tag"),
]


class CategoryNotFoundError(Exception):
    pass


class CategoryNameTakenError(Exception):
    pass


def list_categories(
    db: Session, user_id: uuid.UUID, include_inactive: bool = False
) -> list[Category]:
    if category_repository.count_for_user(db, user_id) == 0:
        try:
            for name, icon in DEFAULT_CATEGORIES:
                category_repository.create(db, user_id=user_id, name=name, icon=icon)
            db.commit()
        except IntegrityError:
            db.rollback()
    return category_repository.list_for_user(db, user_id, include_inactive)


def create_category(
    db: Session, user_id: uuid.UUID, data: CategoryCreate
) -> Category:
    if category_repository.get_by_name(db, user_id, data.name) is not None:
        raise CategoryNameTakenError()

    try:
        category = category_repository.create(
            db, user_id=user_id, name=data.name, icon=data.icon
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CategoryNameTakenError()

    db.refresh(category)
    return category


def update_category(
    db: Session, user_id: uuid.UUID, category_id: uuid.UUID, data: CategoryUpdate
) -> Category:
    category = category_repository.get_by_id(db, user_id, category_id)
    if category is None:
        raise CategoryNotFoundError()

    changes = {
        key: value
        for key, value in data.model_dump(exclude_unset=True).items()
        if value is not None
    }

    new_name = changes.get("name")
    if new_name is not None:
        existing = category_repository.get_by_name(db, user_id, new_name)
        if existing is not None and existing.id != category.id:
            raise CategoryNameTakenError()

    for key, value in changes.items():
        setattr(category, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CategoryNameTakenError()

    db.refresh(category)
    return category