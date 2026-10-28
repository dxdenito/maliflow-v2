from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import MONTH_PATTERN, parse_month
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.report import MonthReport, Trend
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/month", response_model=MonthReport)
def month_report(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return report_service.get_month_report(db, current_user.id, period)


@router.get("/trend", response_model=Trend)
def trend(
    month: str | None = Query(default=None, pattern=MONTH_PATTERN),
    months: int = Query(default=6, ge=2, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period = parse_month(month) or date.today().replace(day=1)
    return report_service.get_trend(db, current_user.id, period, months)