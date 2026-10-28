import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import EntryType
from app.core.schedule import MAX_INSTALLMENTS, compute_plan, installment_count
from app.models.obligation import Obligation
from app.repositories import (
    account_repository,
    ledger_repository,
    obligation_repository,
)
from app.schemas.obligation import (
    ObligationCreate,
    ObligationPlan,
    ObligationRead,
    ObligationSummary,
    ObligationUpdate,
    PaymentCreate,
    PaymentRead,
)

ZERO = Decimal("0")
STATUS_ORDER = {"overdue": 0, "open": 1, "settled": 2}


class ObligationNotFoundError(Exception):
    pass


class PaymentNotFoundError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class PaymentTooLargeError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class AmountBelowPaidError(Exception):
    pass


class InvalidPlanError(Exception):
    pass


def paid_total(obligation: Obligation) -> Decimal:
    return sum((payment.amount for payment in obligation.payments), ZERO)


def check_plan(original_amount: Decimal, installment_amount: Decimal | None) -> None:
    if installment_amount is None:
        return
    if installment_amount > original_amount:
        raise InvalidPlanError("The installment can't be more than the total owed")
    if installment_count(original_amount, installment_amount) > MAX_INSTALLMENTS:
        raise InvalidPlanError(
            f"That would take more than {MAX_INSTALLMENTS} installments. Choose a larger installment."
        )


def to_read(obligation: Obligation, today: date) -> ObligationRead:
    paid = paid_total(obligation)
    outstanding = obligation.original_amount - paid

    plan = None
    due_on = obligation.due_on
    behind = False

    if obligation.installment_amount is not None:
        state = compute_plan(
            obligation.original_amount,
            obligation.installment_amount,
            obligation.frequency,
            obligation.first_due_on,
            paid,
            today,
        )
        plan = ObligationPlan(
            installment_amount=obligation.installment_amount,
            frequency=obligation.frequency,
            first_due_on=obligation.first_due_on,
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
        status = "settled"
    elif plan is not None:
        status = "overdue" if behind else "open"
    elif due_on is not None and due_on < today:
        status = "overdue"
    else:
        status = "open"

    return ObligationRead(
        id=obligation.id,
        name=obligation.name,
        original_amount=obligation.original_amount,
        paid_total=paid,
        outstanding=outstanding,
        due_on=due_on,
        note=obligation.note,
        status=status,
        created_at=obligation.created_at,
        plan=plan,
        payments=[PaymentRead.model_validate(p) for p in obligation.payments],
    )


def list_obligations(db: Session, user_id: uuid.UUID) -> list[ObligationRead]:
    today = date.today()
    reads = [
        to_read(obligation, today)
        for obligation in obligation_repository.list_for_user(db, user_id)
    ]
    reads.sort(
        key=lambda item: (
            STATUS_ORDER[item.status],
            item.due_on or date.max,
            item.name.lower(),
        )
    )
    return reads


def get_summary(db: Session, user_id: uuid.UUID) -> ObligationSummary:
    reads = list_obligations(db, user_id)
    active = [item for item in reads if item.status != "settled"]
    overdue = [item for item in reads if item.status == "overdue"]

    return ObligationSummary(
        total_outstanding=sum((item.outstanding for item in active), ZERO),
        overdue_total=sum(
            (
                item.plan.overdue_amount if item.plan else item.outstanding
                for item in overdue
            ),
            ZERO,
        ),
        overdue_count=len(overdue),
        open_count=len(active),
    )


def create_obligation(
    db: Session, user_id: uuid.UUID, data: ObligationCreate
) -> ObligationRead:
    check_plan(data.original_amount, data.installment_amount)

    obligation = obligation_repository.create(
        db,
        user_id=user_id,
        name=data.name,
        original_amount=data.original_amount,
        due_on=None if data.installment_amount is not None else data.due_on,
        note=data.note,
        installment_amount=data.installment_amount,
        frequency=data.frequency,
        first_due_on=data.first_due_on,
    )
    db.commit()
    db.refresh(obligation)
    return to_read(obligation, date.today())


def update_obligation(
    db: Session,
    user_id: uuid.UUID,
    obligation_id: uuid.UUID,
    data: ObligationUpdate,
) -> ObligationRead:
    obligation = obligation_repository.get_by_id(db, user_id, obligation_id)
    if obligation is None:
        raise ObligationNotFoundError()

    changes = data.model_dump(exclude_unset=True)
    for key in ("name", "original_amount"):
        if key in changes and changes[key] is None:
            del changes[key]

    new_amount = changes.get("original_amount", obligation.original_amount)
    if new_amount < paid_total(obligation):
        raise AmountBelowPaidError()

    if "installment_amount" in changes:
        new_installment = changes["installment_amount"]
    else:
        new_installment = obligation.installment_amount

    check_plan(new_amount, new_installment)
    if new_installment is not None:
        changes["due_on"] = None

    for key, value in changes.items():
        setattr(obligation, key, value)

    db.commit()
    db.refresh(obligation)
    return to_read(obligation, date.today())


def delete_obligation(
    db: Session, user_id: uuid.UUID, obligation_id: uuid.UUID
) -> None:
    obligation = obligation_repository.get_by_id(db, user_id, obligation_id)
    if obligation is None:
        raise ObligationNotFoundError()

    for payment in obligation.payments:
        ledger_repository.delete_by_reference(
            db, user_id, "obligation_payment", payment.id
        )

    obligation_repository.delete(db, obligation)
    db.commit()


def add_payment(
    db: Session,
    user_id: uuid.UUID,
    obligation_id: uuid.UUID,
    data: PaymentCreate,
) -> ObligationRead:
    obligation = obligation_repository.get_by_id(db, user_id, obligation_id)
    if obligation is None:
        raise ObligationNotFoundError()

    account = account_repository.get_by_id(db, user_id, data.account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()

    outstanding = obligation.original_amount - paid_total(obligation)
    if data.amount > outstanding:
        raise PaymentTooLargeError()

    balance = ledger_repository.get_account_balance(db, user_id, account.id)
    if balance < data.amount:
        raise InsufficientBalanceError()

    payment = obligation_repository.add_payment(
        db,
        obligation,
        user_id=user_id,
        account_id=account.id,
        amount=data.amount,
        paid_on=data.paid_on,
        note=data.note,
    )
    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.DEBT_PAYMENT.value,
        amount=data.amount,
        occurred_on=data.paid_on,
        from_account_id=account.id,
        description=obligation.name,
        reference_type="obligation_payment",
        reference_id=payment.id,
    )
    db.commit()

    db.refresh(obligation)
    return to_read(obligation, date.today())


def delete_payment(db: Session, user_id: uuid.UUID, payment_id: uuid.UUID) -> None:
    payment = obligation_repository.get_payment(db, user_id, payment_id)
    if payment is None:
        raise PaymentNotFoundError()

    ledger_repository.delete_by_reference(
        db, user_id, "obligation_payment", payment.id
    )
    obligation_repository.delete_payment(db, payment)
    db.commit()