import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.purchase import (
    AssetValueSet,
    PurchaseCreate,
    PurchasePaymentCreate,
    PurchaseRead,
    PurchaseSummary,
    PurchaseUpdate,
)
from app.services import purchase_service

router = APIRouter(prefix="/purchases", tags=["purchases"])


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Purchase not found",
    )


def account_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Choose your own active accounts",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


def bad_request(error: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.get("", response_model=list[PurchaseRead])
def list_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return purchase_service.list_purchases(db, current_user.id)


@router.get("/summary", response_model=PurchaseSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return purchase_service.get_summary(db, current_user.id)


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return purchase_service.create_purchase(db, current_user.id, data)
    except purchase_service.InvalidAccountError:
        raise account_error()
    except purchase_service.InsufficientBalanceError as error:
        raise conflict(str(error))
    except purchase_service.InvalidPlanError as error:
        raise bad_request(error)


@router.patch("/{purchase_id}", response_model=PurchaseRead)
def update_purchase(
    purchase_id: uuid.UUID,
    data: PurchaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return purchase_service.update_purchase(
            db, current_user.id, purchase_id, data
        )
    except purchase_service.PurchaseNotFoundError:
        raise not_found_error()
    except purchase_service.PriceLockedError:
        raise conflict(
            "The price of a cash purchase can't be changed. Delete it and add it again."
        )
    except purchase_service.AmountBelowPaidError:
        raise conflict("The total can't be less than what you have already paid")
    except purchase_service.InvalidPlanError as error:
        raise bad_request(error)
    except purchase_service.InvalidPurchaseError as error:
        raise bad_request(error)


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        purchase_service.delete_payment(db, current_user.id, payment_id)
    except purchase_service.PaymentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    except purchase_service.CashPaymentLockedError:
        raise conflict(
            "The payment on a cash purchase can't be deleted on its own. Delete the purchase instead."
        )


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        purchase_service.delete_purchase(db, current_user.id, purchase_id)
    except purchase_service.PurchaseNotFoundError:
        raise not_found_error()


@router.post(
    "/{purchase_id}/payments",
    response_model=PurchaseRead,
    status_code=status.HTTP_201_CREATED,
)
def add_payment(
    purchase_id: uuid.UUID,
    data: PurchasePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return purchase_service.add_payment(db, current_user.id, purchase_id, data)
    except purchase_service.PurchaseNotFoundError:
        raise not_found_error()
    except purchase_service.InvalidAccountError:
        raise account_error()
    except purchase_service.PaymentTooLargeError:
        raise conflict("That is more than what is still owed")
    except purchase_service.InsufficientBalanceError as error:
        raise conflict(str(error))

@router.put("/{purchase_id}/asset", response_model=PurchaseRead)
def set_asset_value(
    purchase_id: uuid.UUID,
    data: AssetValueSet,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return purchase_service.set_asset_value(
            db, current_user.id, purchase_id, data.value
        )
    except purchase_service.PurchaseNotFoundError:
        raise not_found_error()