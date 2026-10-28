from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories import user_repository
from app.schemas.user import UserCreate


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def register_user(db: Session, data: UserCreate) -> User:
    if user_repository.get_by_email(db, data.email) is not None:
        raise EmailAlreadyRegisteredError()

    try:
        user = user_repository.create(
            db,
            email=data.email,
            full_name=data.full_name.strip(),
            hashed_password=hash_password(data.password),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyRegisteredError()

    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> str:
    user = user_repository.get_by_email(db, email)

    if user is None or not user.is_active:
        raise InvalidCredentialsError()

    if not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()

    return create_access_token(str(user.id))