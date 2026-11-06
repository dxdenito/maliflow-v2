import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.income import (
    IncomeCreate,
    IncomeRead,
    IncomeSummary,
    IncomeUpdate,
    ReceiptCreate,
)
from app.services import income_service

router = APIRouter(prefix="/income", tags=["income"])


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose one of your active accounts",
    )


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Income not found",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


NOT_ENOUGH = "Deleting this would take the account below zero, because the money has already been spent or moved"


@router.get("", response_model=list[IncomeRead])
def list_income(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    income_status: str | None = Query(
        default=None, alias="status", pattern=r"^(expected|received)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return income_service.list_income(
        db, current_user.id, parse_month(month), income_status
    )


@router.get("/summary", response_model=IncomeSummary)
def get_summary(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return income_service.get_summary(db, current_user.id, period)


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(
    data: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_service.create_income(db, current_user.id, data)
    except income_service.InvalidAccountError:
        raise account_error()


@router.patch("/{income_id}", response_model=IncomeRead)
def update_income(
    income_id: uuid.UUID,
    data: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_service.update_income(db, current_user.id, income_id, data)
    except income_service.IncomeNotFoundError:
        raise not_found_error()
    except income_service.NothingReceivedError:
        raise conflict(
            "Nothing has been received yet, so there is nothing to close out. Delete this income instead."
        )


@router.post(
    "/{income_id}/receipts",
    response_model=IncomeRead,
    status_code=status.HTTP_201_CREATED,
)
def add_receipt(
    income_id: uuid.UUID,
    data: ReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_service.add_receipt(db, current_user.id, income_id, data)
    except income_service.IncomeNotFoundError:
        raise not_found_error()
    except income_service.IncomeAlreadyReceivedError:
        raise conflict(
            "This income is already fully received. Edit the expected amount if you were paid more."
        )
    except income_service.InvalidAccountError:
        raise account_error()


@router.delete("/receipts/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(
    receipt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        income_service.delete_receipt(db, current_user.id, receipt_id)
    except income_service.ReceiptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    except income_service.InsufficientBalanceError:
        raise conflict(NOT_ENOUGH)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        income_service.delete_income(db, current_user.id, income_id)
    except income_service.IncomeNotFoundError:
        raise not_found_error()
    except income_service.InsufficientBalanceError:
        raise conflict(NOT_ENOUGH)