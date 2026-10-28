import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.obligation import (
    PLAN_FIELDS,
    PLAN_MESSAGE,
    Frequency,
    ObligationPlan,
    clean_name,
    clean_note,
    plan_given,
)

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
Charges = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
PurchaseKind = Literal["cash", "financed"]
PurchaseStatus = Literal["open", "overdue", "paid"]
ZERO = Decimal("0")


def not_future(value: date) -> date:
    if value > date.today():
        raise ValueError("Date cannot be in the future")
    return value


class AllocationInput(BaseModel):
    account_id: uuid.UUID
    amount: Money


def allocations_total(allocations: list[AllocationInput]) -> Decimal:
    account_ids = [item.account_id for item in allocations]
    if len(account_ids) != len(set(account_ids)):
        raise ValueError("Each account can only appear once")
    return sum((item.amount for item in allocations), ZERO)


class PurchaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: PurchaseKind
    price: Money
    finance_charges: Charges = ZERO
    lender: str | None = Field(default=None, max_length=100)
    purchased_on: date
    note: str | None = Field(default=None, max_length=255)
    allocations: list[AllocationInput] = Field(default_factory=list, max_length=6)
    installment_amount: Money | None = None
    frequency: Frequency | None = None
    first_due_on: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("note", "lender")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return clean_note(value)

    @field_validator("purchased_on")
    @classmethod
    def validate_purchased_on(cls, value: date) -> date:
        return not_future(value)

    @model_validator(mode="after")
    def check_rules(self):
        paid = allocations_total(self.allocations)
        given = plan_given(self)
        if any(given) and not all(given):
            raise ValueError(PLAN_MESSAGE)

        if self.kind == "cash":
            if self.finance_charges != 0 or self.lender or any(given):
                raise ValueError(
                    "Cash purchases don't have a lender, finance charges or installments"
                )
            if paid != self.price:
                raise ValueError("The payments must add up to the price")
        elif paid > self.price + self.finance_charges:
            raise ValueError("The deposit can't be more than the total payable")

        return self


class PurchaseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price: Money | None = None
    finance_charges: Charges | None = None
    lender: str | None = Field(default=None, max_length=100)
    purchased_on: date | None = None
    note: str | None = Field(default=None, max_length=255)
    installment_amount: Money | None = None
    frequency: Frequency | None = None
    first_due_on: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return clean_name(value)

    @field_validator("note", "lender")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return clean_note(value)

    @field_validator("purchased_on")
    @classmethod
    def validate_purchased_on(cls, value: date | None) -> date | None:
        return None if value is None else not_future(value)

    @model_validator(mode="after")
    def check_plan(self):
        sent = [field in self.model_fields_set for field in PLAN_FIELDS]
        if any(sent) and not all(sent):
            raise ValueError(PLAN_MESSAGE)

        given = plan_given(self)
        if any(given) and not all(given):
            raise ValueError(PLAN_MESSAGE)
        return self


class PurchasePaymentCreate(BaseModel):
    paid_on: date
    note: str | None = Field(default=None, max_length=255)
    allocations: list[AllocationInput] = Field(min_length=1, max_length=6)

    @field_validator("paid_on")
    @classmethod
    def validate_paid_on(cls, value: date) -> date:
        return not_future(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)

    @model_validator(mode="after")
    def check_allocations(self):
        allocations_total(self.allocations)
        return self


class AllocationRead(BaseModel):
    account_id: uuid.UUID
    amount: Decimal


class PaymentRead(BaseModel):
    id: uuid.UUID
    purchase_id: uuid.UUID
    paid_on: date
    is_deposit: bool
    note: str | None
    amount: Decimal
    allocations: list[AllocationRead]
    created_at: datetime


class PurchaseRead(BaseModel):
    id: uuid.UUID
    name: str
    kind: PurchaseKind
    price: Decimal
    finance_charges: Decimal
    total_payable: Decimal
    lender: str | None
    purchased_on: date
    note: str | None
    paid_total: Decimal
    deposit_paid: Decimal
    asset_value: Decimal | None
    outstanding: Decimal
    status: PurchaseStatus
    due_on: date | None
    created_at: datetime
    plan: ObligationPlan | None
    payments: list[PaymentRead]


class PurchaseSummary(BaseModel):
    total_outstanding: Decimal
    overdue_total: Decimal
    overdue_count: int
    open_count: int

class AssetValueSet(BaseModel):
    value: Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)] | None