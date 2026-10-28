import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.savings import (
    SavingsEntryRead,
    SavingsSummary,
    SavingsTransferCreate,
)
from app.services import savings_service

router = APIRouter(prefix="/savings", tags=["savings"])


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose your own active accounts from the right pools",
    )


def balance_error(error: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))


@router.get("", response_model=list[SavingsEntryRead])
def list_entries(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return savings_service.list_entries(db, current_user.id, period)


@router.get("/summary", response_model=SavingsSummary)
def get_summary(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return savings_service.get_summary(db, current_user.id, period)


@router.post(
    "/deposits", response_model=SavingsEntryRead, status_code=status.HTTP_201_CREATED
)
def create_deposit(
    data: SavingsTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return savings_service.deposit(db, current_user.id, data)
    except savings_service.InvalidAccountError:
        raise account_error()
    except savings_service.InsufficientBalanceError as error:
        raise balance_error(error)


@router.post(
    "/withdrawals",
    response_model=SavingsEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_withdrawal(
    data: SavingsTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return savings_service.withdraw(db, current_user.id, data)
    except savings_service.InvalidAccountError:
        raise account_error()
    except savings_service.InsufficientBalanceError as error:
        raise balance_error(error)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        savings_service.delete_entry(db, current_user.id, entry_id)
    except savings_service.EntryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings entry not found",
        )
    except savings_service.InsufficientBalanceError as error:
        raise balance_error(error)