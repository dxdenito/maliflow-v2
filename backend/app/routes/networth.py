from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.networth import NetWorth
from app.services import networth_service

router = APIRouter(prefix="/networth", tags=["networth"])


@router.get("", response_model=NetWorth)
def get_net_worth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return networth_service.get_net_worth(db, current_user.id)