import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountRead,
    AccountSummary,
    AccountUpdate,
)
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead])
def list_accounts(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return account_service.list_accounts(db, current_user.id, include_inactive)


@router.get("/summary", response_model=AccountSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return account_service.get_summary(db, current_user.id)


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return account_service.create_account(db, current_user.id, data)
    except account_service.AccountNameTakenError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an account with that name",
        )


@router.patch("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return account_service.update_account(db, current_user.id, account_id, data)
    except account_service.AccountNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    except account_service.AccountNameTakenError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an account with that name",
        )
    except account_service.AccountHasBalanceError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Move or spend the remaining balance before archiving this account",
        )