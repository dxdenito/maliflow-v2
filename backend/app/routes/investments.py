import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.investment import (
    InvestmentCreate,
    InvestmentRead,
    InvestmentSummary,
    InvestmentUpdate,
    MoneyMoveCreate,
    ValuationCreate,
)
from app.services import investment_service

router = APIRouter(prefix="/investments", tags=["investments"])


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Investment not found",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose one of your active accounts",
    )


NAME_TAKEN = "You already have an investment with that name"


@router.get("", response_model=list[InvestmentRead])
def list_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return investment_service.list_investments(db, current_user.id)


@router.get("/summary", response_model=InvestmentSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return investment_service.get_summary(db, current_user.id)


@router.post("", response_model=InvestmentRead, status_code=status.HTTP_201_CREATED)
def create_investment(
    data: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return investment_service.create_investment(db, current_user.id, data)
    except investment_service.NameTakenError:
        raise conflict(NAME_TAKEN)


@router.patch("/{investment_id}", response_model=InvestmentRead)
def update_investment(
    investment_id: uuid.UUID,
    data: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return investment_service.update_investment(
            db, current_user.id, investment_id, data
        )
    except investment_service.InvestmentNotFoundError:
        raise not_found_error()
    except investment_service.NameTakenError:
        raise conflict(NAME_TAKEN)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        investment_service.delete_event(db, current_user.id, event_id)
    except investment_service.EventNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )
    except investment_service.InsufficientBalanceError as error:
        raise conflict(str(error))


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment(
    investment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        investment_service.delete_investment(db, current_user.id, investment_id)
    except investment_service.InvestmentNotFoundError:
        raise not_found_error()
    except investment_service.HasEventsError:
        raise conflict(
            "This investment has activity, so it can't be deleted. Remove its entries first."
        )


@router.post(
    "/{investment_id}/contributions",
    response_model=InvestmentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_contribution(
    investment_id: uuid.UUID,
    data: MoneyMoveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return investment_service.add_contribution(
            db, current_user.id, investment_id, data
        )
    except investment_service.InvestmentNotFoundError:
        raise not_found_error()
    except investment_service.InvalidAccountError:
        raise account_error()
    except investment_service.InsufficientBalanceError as error:
        raise conflict(str(error))


@router.post(
    "/{investment_id}/withdrawals",
    response_model=InvestmentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_withdrawal(
    investment_id: uuid.UUID,
    data: MoneyMoveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return investment_service.add_withdrawal(
            db, current_user.id, investment_id, data
        )
    except investment_service.InvestmentNotFoundError:
        raise not_found_error()
    except investment_service.InvalidAccountError:
        raise account_error()
    except investment_service.WithdrawalTooLargeError as error:
        raise conflict(str(error))


@router.post(
    "/{investment_id}/valuations",
    response_model=InvestmentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_valuation(
    investment_id: uuid.UUID,
    data: ValuationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return investment_service.add_valuation(
            db, current_user.id, investment_id, data
        )
    except investment_service.InvestmentNotFoundError:
        raise not_found_error()