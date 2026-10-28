import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import EntryType
from app.core.investing import (
    compute_position,
    event_sort_key,
    last_valued_on,
    money,
    position_as_of,
)
from app.models.investment import Investment
from app.repositories import (
    account_repository,
    investment_repository,
    ledger_repository,
)
from app.schemas.investment import (
    EventRead,
    InvestmentCreate,
    InvestmentRead,
    InvestmentSummary,
    InvestmentUpdate,
    MoneyMoveCreate,
    ValuationCreate,
)

ZERO = Decimal("0")


class InvestmentNotFoundError(Exception):
    pass


class EventNotFoundError(Exception):
    pass


class NameTakenError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class WithdrawalTooLargeError(Exception):
    pass


class HasEventsError(Exception):
    pass


def to_read(investment: Investment) -> InvestmentRead:
    events = investment.events
    position = compute_position(events)
    ordered = sorted(events, key=event_sort_key, reverse=True)

    closed = bool(events) and position.value == 0 and position.withdrawn > 0

    return InvestmentRead(
        id=investment.id,
        name=investment.name,
        investment_type=investment.investment_type,
        note=investment.note,
        status="closed" if closed else "active",
        value=position.value,
        net_capital=position.basis,
        contributed=position.contributed,
        withdrawn=position.withdrawn,
        realized_gain=position.realized,
        unrealized_gain=position.unrealized,
        total_gain=position.total_gain,
        return_pct=position.return_pct,
        last_valued_on=last_valued_on(events),
        created_at=investment.created_at,
        events=[
            EventRead(
                id=event.id,
                kind=event.kind,
                amount=event.amount,
                occurred_on=event.occurred_on,
                account_id=event.account_id,
                note=event.note,
                created_at=event.created_at,
            )
            for event in ordered
        ],
    )


def list_investments(db: Session, user_id: uuid.UUID) -> list[InvestmentRead]:
    reads = [
        to_read(investment)
        for investment in investment_repository.list_for_user(db, user_id)
    ]
    reads.sort(
        key=lambda item: (item.status == "closed", -item.value, item.name.lower())
    )
    return reads


def get_summary(db: Session, user_id: uuid.UUID) -> InvestmentSummary:
    investments = investment_repository.list_for_user(db, user_id)
    positions = [compute_position(item.events) for item in investments]

    contributed = sum((p.contributed for p in positions), ZERO)
    realized = sum((p.realized for p in positions), ZERO)
    unrealized = sum((p.unrealized for p in positions), ZERO)
    total_gain = realized + unrealized

    return InvestmentSummary(
        count=len(investments),
        total_value=sum((p.value for p in positions), ZERO),
        net_capital=sum((p.basis for p in positions), ZERO),
        contributed=contributed,
        withdrawn=sum((p.withdrawn for p in positions), ZERO),
        realized_gain=realized,
        unrealized_gain=unrealized,
        total_gain=total_gain,
        return_pct=(
            money(total_gain / contributed * 100) if contributed > 0 else None
        ),
    )


def load(db: Session, user_id: uuid.UUID, investment_id: uuid.UUID) -> Investment:
    investment = investment_repository.get_by_id(db, user_id, investment_id)
    if investment is None:
        raise InvestmentNotFoundError()
    return investment


def create_investment(
    db: Session, user_id: uuid.UUID, data: InvestmentCreate
) -> InvestmentRead:
    if investment_repository.get_by_name(db, user_id, data.name) is not None:
        raise NameTakenError()

    try:
        investment = investment_repository.create(
            db,
            user_id=user_id,
            name=data.name,
            investment_type=data.investment_type,
            note=data.note,
        )

        as_of = data.as_of or date.today()
        if data.initial_capital is not None:
            investment_repository.add_event(
                db,
                investment,
                user_id=user_id,
                kind="opening",
                amount=data.initial_capital,
                occurred_on=as_of,
                account_id=None,
                note="Already invested before using MaliFlow",
            )
        if data.current_value is not None:
            investment_repository.add_event(
                db,
                investment,
                user_id=user_id,
                kind="valuation",
                amount=data.current_value,
                occurred_on=as_of,
                account_id=None,
                note=None,
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise NameTakenError()

    db.refresh(investment)
    return to_read(investment)


def update_investment(
    db: Session,
    user_id: uuid.UUID,
    investment_id: uuid.UUID,
    data: InvestmentUpdate,
) -> InvestmentRead:
    investment = load(db, user_id, investment_id)

    changes = data.model_dump(exclude_unset=True)
    for key in ("name", "investment_type"):
        if key in changes and changes[key] is None:
            del changes[key]

    new_name = changes.get("name")
    if new_name is not None:
        existing = investment_repository.get_by_name(db, user_id, new_name)
        if existing is not None and existing.id != investment.id:
            raise NameTakenError()

    for key, value in changes.items():
        setattr(investment, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise NameTakenError()

    db.refresh(investment)
    return to_read(investment)


def delete_investment(
    db: Session, user_id: uuid.UUID, investment_id: uuid.UUID
) -> None:
    investment = load(db, user_id, investment_id)
    if investment.events:
        raise HasEventsError()

    investment_repository.delete(db, investment)
    db.commit()


def usable_account(db: Session, user_id: uuid.UUID, account_id: uuid.UUID):
    account = account_repository.get_by_id(db, user_id, account_id)
    if account is None or not account.is_active:
        raise InvalidAccountError()
    return account


def add_contribution(
    db: Session,
    user_id: uuid.UUID,
    investment_id: uuid.UUID,
    data: MoneyMoveCreate,
) -> InvestmentRead:
    investment = load(db, user_id, investment_id)
    account = usable_account(db, user_id, data.account_id)

    balance = ledger_repository.get_account_balance(db, user_id, account.id)
    if balance < data.amount:
        raise InsufficientBalanceError("That is more than the account holds")

    event = investment_repository.add_event(
        db,
        investment,
        user_id=user_id,
        kind="contribution",
        amount=data.amount,
        occurred_on=data.occurred_on,
        account_id=account.id,
        note=data.note,
    )
    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.INVESTMENT_CONTRIBUTION.value,
        amount=data.amount,
        occurred_on=data.occurred_on,
        from_account_id=account.id,
        description=investment.name,
        reference_type="investment_event",
        reference_id=event.id,
    )
    db.commit()

    db.refresh(investment)
    return to_read(investment)


def add_withdrawal(
    db: Session,
    user_id: uuid.UUID,
    investment_id: uuid.UUID,
    data: MoneyMoveCreate,
) -> InvestmentRead:
    investment = load(db, user_id, investment_id)
    account = usable_account(db, user_id, data.account_id)

    position = position_as_of(investment.events, data.occurred_on)
    if data.amount > position.value:
        raise WithdrawalTooLargeError(
            f"That is more than the investment is worth ({position.value:,.2f}). Update its valuation first."
        )

    event = investment_repository.add_event(
        db,
        investment,
        user_id=user_id,
        kind="withdrawal",
        amount=data.amount,
        occurred_on=data.occurred_on,
        account_id=account.id,
        note=data.note,
    )
    ledger_repository.create(
        db,
        user_id=user_id,
        entry_type=EntryType.INVESTMENT_WITHDRAWAL.value,
        amount=data.amount,
        occurred_on=data.occurred_on,
        to_account_id=account.id,
        description=investment.name,
        reference_type="investment_event",
        reference_id=event.id,
    )
    db.commit()

    db.refresh(investment)
    return to_read(investment)


def add_valuation(
    db: Session,
    user_id: uuid.UUID,
    investment_id: uuid.UUID,
    data: ValuationCreate,
) -> InvestmentRead:
    investment = load(db, user_id, investment_id)

    investment_repository.add_event(
        db,
        investment,
        user_id=user_id,
        kind="valuation",
        amount=data.value,
        occurred_on=data.occurred_on,
        account_id=None,
        note=data.note,
    )
    db.commit()

    db.refresh(investment)
    return to_read(investment)


def delete_event(db: Session, user_id: uuid.UUID, event_id: uuid.UUID) -> None:
    event = investment_repository.get_event(db, user_id, event_id)
    if event is None:
        raise EventNotFoundError()

    if event.kind == "withdrawal":
        balance = ledger_repository.get_account_balance(
            db, user_id, event.account_id
        )
        if balance < event.amount:
            raise InsufficientBalanceError(
                "Deleting this would take the account below zero, because the money has already been spent or moved"
            )

    if event.kind in ("contribution", "withdrawal"):
        ledger_repository.delete_by_reference(
            db, user_id, "investment_event", event.id
        )

    investment_repository.delete_event(db, event)
    db.commit()