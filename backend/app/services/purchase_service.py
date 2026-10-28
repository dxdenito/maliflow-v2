import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import EntryType
from app.core.schedule import MAX_INSTALLMENTS, compute_plan, installment_count
from app.models.purchase import Purchase, PurchasePayment
from app.repositories import (
    account_repository,
    ledger_repository,
    purchase_repository,
)
from app.schemas.obligation import ObligationPlan
from app.schemas.purchase import (
    AllocationInput,
    AllocationRead,
    PaymentRead,
    PurchaseCreate,
    PurchasePaymentCreate,
    PurchaseRead,
    PurchaseSummary,
    PurchaseUpdate,
)

ZERO = Decimal("0")
STATUS_ORDER = {"overdue": 0, "open": 1, "paid": 2}


class PurchaseNotFoundError(Exception):
    pass


class PaymentNotFoundError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class PaymentTooLargeError(Exception):
    pass


class PriceLockedError(Exception):
    pass


class AmountBelowPaidError(Exception):
    pass


class InvalidPlanError(Exception):
    pass


class InvalidPurchaseError(Exception):
    pass


class CashPaymentLockedError(Exception):
    pass


def payment_total(payment: PurchasePayment) -> Decimal:
    return sum((item.amount for item in payment.allocations), ZERO)


def paid_total(purchase: Purchase) -> Decimal:
    return sum((payment_total(payment) for payment in purchase.payments), ZERO)


def deposit_total(purchase: Purchase) -> Decimal:
    return sum(
        (payment_total(p) for p in purchase.payments if p.is_deposit), ZERO
    )


def total_payable(purchase: Purchase) -> Decimal:
    return purchase.price + purchase.finance_charges


def check_plan(financed_amount: Decimal, installment_amount: Decimal | None) -> None:
    if installment_amount is None:
        return
    if financed_amount <= 0:
        raise InvalidPlanError(
            "There is nothing left to finance, so there is nothing to spread into installments"
        )
    if installment_amount > financed_amount:
        raise InvalidPlanError(
            "The installment can't be more than the amount being financed"
        )
    if installment_count(financed_amount, installment_amount) > MAX_INSTALLMENTS:
        raise InvalidPlanError(
            f"That would take more than {MAX_INSTALLMENTS} installments. Choose a larger installment."
        )


def check_accounts(
    db: Session, user_id: uuid.UUID, allocations: list[AllocationInput]
) -> None:
    for item in allocations:
        account = account_repository.get_by_id(db, user_id, item.account_id)
        if account is None or not account.is_active:
            raise InvalidAccountError()

        balance = ledger_repository.get_account_balance(db, user_id, account.id)
        if balance < item.amount:
            raise InsufficientBalanceError(
                f"{account.name} doesn't hold enough for that"
            )


def record_payment(
    db: Session,
    user_id: uuid.UUID,
    purchase: Purchase,
    paid_on: date,
    note: str | None,
    allocations: list[AllocationInput],
    is_deposit: bool,
) -> PurchasePayment:
    payment = purchase_repository.add_payment(
        db,
        purchase,
        user_id=user_id,
        paid_on=paid_on,
        is_deposit=is_deposit,
        note=note,
        allocations=[(item.account_id, item.amount) for item in allocations],
    )
    for item in allocations:
        ledger_repository.create(
            db,
            user_id=user_id,
            entry_type=EntryType.PURCHASE_PAYMENT.value,
            amount=item.amount,
            occurred_on=paid_on,
            from_account_id=item.account_id,
            description=purchase.name,
            reference_type="purchase_payment",
            reference_id=payment.id,
        )
    return payment


def payment_read(payment: PurchasePayment) -> PaymentRead:
    return PaymentRead(
        id=payment.id,
        purchase_id=payment.purchase_id,
        paid_on=payment.paid_on,
        is_deposit=payment.is_deposit,
        note=payment.note,
        amount=payment_total(payment),
        allocations=[
            AllocationRead(account_id=item.account_id, amount=item.amount)
            for item in payment.allocations
        ],
        created_at=payment.created_at,
    )


def to_read(purchase: Purchase, today: date) -> PurchaseRead:
    paid = paid_total(purchase)
    deposit = deposit_total(purchase)
    payable = total_payable(purchase)
    outstanding = payable - paid

    plan = None
    due_on = None
    behind = False

    if purchase.installment_amount is not None:
        state = compute_plan(
            payable - deposit,
            purchase.installment_amount,
            purchase.frequency,
            purchase.first_due_on,
            paid - deposit,
            today,
        )
        plan = ObligationPlan(
            installment_amount=purchase.installment_amount,
            frequency=purchase.frequency,
            first_due_on=purchase.first_due_on,
            installments_total=state.installments_total,
            installments_paid=state.installments_paid,
            next_due_on=state.next_due_on,
            next_due_amount=state.next_due_amount,
            due_now=state.due_now,
            overdue_amount=state.overdue_amount,
            overdue_count=state.overdue_count,
        )
        due_on = state.next_due_on
        behind = state.overdue_amount > 0

    if outstanding <= 0:
        status = "paid"
    elif behind:
        status = "overdue"
    else:
        status = "open"

    return PurchaseRead(
        id=purchase.id,
        name=purchase.name,
        kind=purchase.kind,
        price=purchase.price,
        finance_charges=purchase.finance_charges,
        total_payable=payable,
        lender=purchase.lender,
        purchased_on=purchase.purchased_on,
        note=purchase.note,
        paid_total=paid,
        deposit_paid=deposit,
        asset_value=purchase.asset_value,
        outstanding=outstanding,
        status=status,
        due_on=due_on,
        created_at=purchase.created_at,
        plan=plan,
        payments=[payment_read(payment) for payment in purchase.payments],
    )


def list_purchases(db: Session, user_id: uuid.UUID) -> list[PurchaseRead]:
    today = date.today()
    reads = [
        to_read(purchase, today)
        for purchase in purchase_repository.list_for_user(db, user_id)
    ]
    reads.sort(
        key=lambda item: (
            STATUS_ORDER[item.status],
            item.due_on or date.max,
            -item.purchased_on.toordinal(),
            item.name.lower(),
        )
    )
    return reads


def get_summary(db: Session, user_id: uuid.UUID) -> PurchaseSummary:
    reads = list_purchases(db, user_id)
    active = [item for item in reads if item.status != "paid"]
    overdue = [item for item in reads if item.status == "overdue"]

    return PurchaseSummary(
        total_outstanding=sum((item.outstanding for item in active), ZERO),
        overdue_total=sum((item.plan.overdue_amount for item in overdue), ZERO),
        overdue_count=len(overdue),
        open_count=len(active),
    )


def create_purchase(
    db: Session, user_id: uuid.UUID, data: PurchaseCreate
) -> PurchaseRead:
    deposit = sum((item.amount for item in data.allocations), ZERO)
    payable = data.price + data.finance_charges

    check_plan(payable - deposit, data.installment_amount)
    check_accounts(db, user_id, data.allocations)

    purchase = purchase_repository.create(
        db,
        user_id=user_id,
        name=data.name,
        kind=data.kind,
        price=data.price,
        finance_charges=data.finance_charges,
        lender=data.lender,
        purchased_on=data.purchased_on,
        note=data.note,
        installment_amount=data.installment_amount,
        frequency=data.frequency,
        first_due_on=data.first_due_on,
    )

    if data.allocations:
        record_payment(
            db,
            user_id,
            purchase,
            data.purchased_on,
            None,
            data.allocations,
            is_deposit=data.kind == "financed",
        )

    db.commit()
    db.refresh(purchase)
    return to_read(purchase, date.today())


def update_purchase(
    db: Session,
    user_id: uuid.UUID,
    purchase_id: uuid.UUID,
    data: PurchaseUpdate,
) -> PurchaseRead:
    purchase = purchase_repository.get_by_id(db, user_id, purchase_id)
    if purchase is None:
        raise PurchaseNotFoundError()

    changes = data.model_dump(exclude_unset=True)
    for key in ("name", "price", "finance_charges", "purchased_on"):
        if key in changes and changes[key] is None:
            del changes[key]

    if purchase.kind == "cash":
        if changes.get("price", purchase.price) != purchase.price:
            raise PriceLockedError()
        extras = [
            changes.get("finance_charges"),
            changes.get("lender"),
            changes.get("installment_amount"),
        ]
        if any(value not in (None, ZERO) for value in extras):
            raise InvalidPurchaseError(
                "Cash purchases don't have a lender, finance charges or installments"
            )

    new_price = changes.get("price", purchase.price)
    new_charges = changes.get("finance_charges", purchase.finance_charges)
    payable = new_price + new_charges
    if payable < paid_total(purchase):
        raise AmountBelowPaidError()

    if "installment_amount" in changes:
        installment = changes["installment_amount"]
    else:
        installment = purchase.installment_amount
    check_plan(payable - deposit_total(purchase), installment)

    for key, value in changes.items():
        setattr(purchase, key, value)

    db.commit()
    db.refresh(purchase)
    return to_read(purchase, date.today())


def delete_purchase(
    db: Session, user_id: uuid.UUID, purchase_id: uuid.UUID
) -> None:
    purchase = purchase_repository.get_by_id(db, user_id, purchase_id)
    if purchase is None:
        raise PurchaseNotFoundError()

    for payment in purchase.payments:
        ledger_repository.delete_by_reference(
            db, user_id, "purchase_payment", payment.id
        )

    purchase_repository.delete(db, purchase)
    db.commit()


def add_payment(
    db: Session,
    user_id: uuid.UUID,
    purchase_id: uuid.UUID,
    data: PurchasePaymentCreate,
) -> PurchaseRead:
    purchase = purchase_repository.get_by_id(db, user_id, purchase_id)
    if purchase is None:
        raise PurchaseNotFoundError()

    amount = sum((item.amount for item in data.allocations), ZERO)
    outstanding = total_payable(purchase) - paid_total(purchase)
    if amount > outstanding:
        raise PaymentTooLargeError()

    check_accounts(db, user_id, data.allocations)
    record_payment(
        db, user_id, purchase, data.paid_on, data.note, data.allocations, False
    )
    db.commit()

    db.refresh(purchase)
    return to_read(purchase, date.today())


def delete_payment(db: Session, user_id: uuid.UUID, payment_id: uuid.UUID) -> None:
    payment = purchase_repository.get_payment(db, user_id, payment_id)
    if payment is None:
        raise PaymentNotFoundError()
    if payment.purchase.kind == "cash":
        raise CashPaymentLockedError()

    ledger_repository.delete_by_reference(
        db, user_id, "purchase_payment", payment.id
    )
    purchase_repository.delete_payment(db, payment)
    db.commit()

def set_asset_value(
    db: Session,
    user_id: uuid.UUID,
    purchase_id: uuid.UUID,
    value: Decimal | None,
) -> PurchaseRead:
    purchase = purchase_repository.get_by_id(db, user_id, purchase_id)
    if purchase is None:
        raise PurchaseNotFoundError()

    purchase.asset_value = value
    db.commit()
    db.refresh(purchase)
    return to_read(purchase, date.today())


def get_assets_total(db: Session, user_id: uuid.UUID) -> Decimal:
    purchases = purchase_repository.list_for_user(db, user_id)
    return sum(
        (p.asset_value for p in purchases if p.asset_value is not None), ZERO
    )