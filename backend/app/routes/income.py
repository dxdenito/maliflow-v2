import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeReceive, IncomeSummary
from app.services import income_service

router = APIRouter(prefix="/income", tags=["income"])

MONTH_PATTERN = r"^(19|20)\d{2}-(0[1-9]|1[0-2])$"


def parse_month(month: str | None) -> date | None:
    if month is None:
        return None
    year, month_number = month.split("-")
    return date(int(year), int(month_number), 1)


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


@router.post("/{income_id}/receive", response_model=IncomeRead)
def receive_income(
    income_id: uuid.UUID,
    data: IncomeReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_service.receive_income(db, current_user.id, income_id, data)
    except income_service.IncomeNotFoundError:
        raise not_found_error()
    except income_service.IncomeAlreadyReceivedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This income has already been received",
        )
    except income_service.InvalidAccountError:
        raise account_error()

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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleting this would take the account below zero, because the money has already been spent or moved",
        )