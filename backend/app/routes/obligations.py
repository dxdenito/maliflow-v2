import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.obligation import (
    ObligationCreate,
    ObligationRead,
    ObligationSummary,
    ObligationUpdate,
    PaymentCreate,
)
from app.services import obligation_service

router = APIRouter(prefix="/obligations", tags=["obligations"])


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Obligation not found",
    )


@router.get("", response_model=list[ObligationRead])
def list_obligations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return obligation_service.list_obligations(db, current_user.id)


@router.get("/summary", response_model=ObligationSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return obligation_service.get_summary(db, current_user.id)


@router.post("", response_model=ObligationRead, status_code=status.HTTP_201_CREATED)
def create_obligation(
    data: ObligationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return obligation_service.create_obligation(db, current_user.id, data)
    except obligation_service.InvalidPlanError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        )


@router.patch("/{obligation_id}", response_model=ObligationRead)
def update_obligation(
    obligation_id: uuid.UUID,
    data: ObligationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return obligation_service.update_obligation(
            db, current_user.id, obligation_id, data
        )
    except obligation_service.ObligationNotFoundError:
        raise not_found_error()
    except obligation_service.AmountBelowPaidError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The amount can't be less than what you have already paid",
        )
    except obligation_service.InvalidPlanError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        )


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        obligation_service.delete_payment(db, current_user.id, payment_id)
    except obligation_service.PaymentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )


@router.delete("/{obligation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_obligation(
    obligation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        obligation_service.delete_obligation(db, current_user.id, obligation_id)
    except obligation_service.ObligationNotFoundError:
        raise not_found_error()


@router.post(
    "/{obligation_id}/payments",
    response_model=ObligationRead,
    status_code=status.HTTP_201_CREATED,
)
def add_payment(
    obligation_id: uuid.UUID,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return obligation_service.add_payment(
            db, current_user.id, obligation_id, data
        )
    except obligation_service.ObligationNotFoundError:
        raise not_found_error()
    except obligation_service.InvalidAccountError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose one of your active accounts",
        )
    except obligation_service.PaymentTooLargeError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That is more than what is still owed",
        )
    except obligation_service.InsufficientBalanceError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That is more than the account holds",
        )