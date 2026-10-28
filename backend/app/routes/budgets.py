from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.budget import BudgetSave, BudgetStatus
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["budgets"])

MonthPath = Annotated[str, Path(pattern=MONTH_PATTERN)]


@router.get("/{month}", response_model=BudgetStatus)
def get_budget(
    month: MonthPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.get_status(db, current_user.id, parse_month(month))


@router.put("/{month}", response_model=BudgetStatus)
def save_budget(
    month: MonthPath,
    data: BudgetSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return budget_service.save_budget(
            db, current_user.id, parse_month(month), data
        )
    except budget_service.InvalidCategoryError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose categories from your own list",
        )


@router.delete("/{month}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    month: MonthPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        budget_service.delete_budget(db, current_user.id, parse_month(month))
    except budget_service.BudgetNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budget set for that month",
        )