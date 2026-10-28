import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.core.enums import EntryType
from app.models.user import User
from app.schemas.ledger import (
    AdjustmentCreate,
    LedgerEntryRead,
    LedgerSummary,
    TransferCreate,
)
from app.services import ledger_service

router = APIRouter(prefix="/ledger", tags=["ledger"])


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose your own active accounts",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


@router.get("", response_model=list[LedgerEntryRead])
def list_entries(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    entry_type: EntryType | None = None,
    account_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return ledger_service.list_entries(
        db,
        current_user.id,
        period,
        entry_type.value if entry_type else None,
        account_id,
    )


@router.get("/summary", response_model=LedgerSummary)
def get_summary(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return ledger_service.get_summary(db, current_user.id, period)


@router.post(
    "/adjustments",
    response_model=LedgerEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_adjustment(
    data: AdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ledger_service.adjust_balance(db, current_user.id, data)
    except ledger_service.InvalidAccountError:
        raise account_error()
    except ledger_service.NoChangeError:
        raise conflict("The account already has that balance")


@router.post(
    "/transfers",
    response_model=LedgerEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ledger_service.transfer(db, current_user.id, data)
    except ledger_service.InvalidAccountError:
        raise account_error()
    except ledger_service.DifferentPoolsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfers are between accounts in the same pool. Use Savings to move money between Available and Savings.",
        )
    except ledger_service.InsufficientBalanceError as error:
        raise conflict(str(error))


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ledger_service.delete_entry(db, current_user.id, entry_id)
    except ledger_service.EntryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )
    except ledger_service.NotManualEntryError:
        raise conflict(
            "This entry belongs to another part of MaliFlow. Change it from there."
        )
    except ledger_service.InsufficientBalanceError as error:
        raise conflict(str(error))