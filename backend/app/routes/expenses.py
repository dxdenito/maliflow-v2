import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseRead,
    ExpenseSummary,
    ExpenseUpdate,
)
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


def category_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose one of your active categories",
    )


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose one of your active accounts",
    )


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Expense not found",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    category_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return expense_service.list_expenses(db, current_user.id, period, category_id)


@router.get("/summary", response_model=ExpenseSummary)
def get_summary(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return expense_service.get_summary(db, current_user.id, period)


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return expense_service.create_expense(db, current_user.id, data)
    except expense_service.InvalidCategoryError:
        raise category_error()
    except expense_service.InvalidAccountError:
        raise account_error()


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: uuid.UUID,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return expense_service.update_expense(db, current_user.id, expense_id, data)
    except expense_service.ExpenseNotFoundError:
        raise not_found_error()
    except expense_service.InvalidCategoryError:
        raise category_error()
    except expense_service.InvalidAccountError:
        raise account_error()
    except expense_service.PayerLockedError:
        raise conflict(
            "Someone else paid for this, so it has no account to change. Delete it and add it again to change that."
        )
    except expense_service.AmountBelowRefundedError:
        raise conflict(
            "The amount can't be less than what you have already paid back"
        )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        expense_service.delete_expense(db, current_user.id, expense_id)
    except expense_service.ExpenseNotFoundError:
        raise not_found_error()
    except expense_service.RefundMadeError:
        raise conflict(
            "You have already paid some of this back. Delete those payments in Obligations first."
        )