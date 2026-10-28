import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
ObligationStatus = Literal["open", "overdue", "settled"]
Frequency = Literal["daily", "weekly", "monthly"]
PLAN_FIELDS = ("installment_amount", "frequency", "first_due_on")
PLAN_MESSAGE = "Send installment_amount, frequency and first_due_on together"


def clean_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Name cannot be empty")
    return cleaned


def clean_note(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


def plan_given(model: BaseModel) -> list[bool]:
    return [getattr(model, field) is not None for field in PLAN_FIELDS]


class ObligationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    original_amount: Money
    due_on: date | None = None
    note: str | None = Field(default=None, max_length=255)
    installment_amount: Money | None = None
    frequency: Frequency | None = None
    first_due_on: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)

    @model_validator(mode="after")
    def check_plan(self):
        given = plan_given(self)
        if any(given) and not all(given):
            raise ValueError(PLAN_MESSAGE)
        if all(given):
            self.due_on = None
        return self


class ObligationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    original_amount: Money | None = None
    due_on: date | None = None
    note: str | None = Field(default=None, max_length=255)
    installment_amount: Money | None = None
    frequency: Frequency | None = None
    first_due_on: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return clean_name(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)

    @model_validator(mode="after")
    def check_plan(self):
        sent = [field in self.model_fields_set for field in PLAN_FIELDS]
        if any(sent) and not all(sent):
            raise ValueError(PLAN_MESSAGE)

        given = plan_given(self)
        if any(given) and not all(given):
            raise ValueError(PLAN_MESSAGE)
        return self


class PaymentCreate(BaseModel):
    account_id: uuid.UUID
    amount: Money
    paid_on: date
    note: str | None = Field(default=None, max_length=255)

    @field_validator("paid_on")
    @classmethod
    def validate_paid_on(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date cannot be in the future")
        return value

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    obligation_id: uuid.UUID
    account_id: uuid.UUID
    amount: Decimal
    paid_on: date
    note: str | None
    created_at: datetime


class ObligationPlan(BaseModel):
    installment_amount: Decimal
    frequency: Frequency
    first_due_on: date
    installments_total: int
    installments_paid: int
    next_due_on: date | None
    next_due_amount: Decimal
    due_now: Decimal
    overdue_amount: Decimal
    overdue_count: int


class ObligationRead(BaseModel):
    id: uuid.UUID
    name: str
    original_amount: Decimal
    paid_total: Decimal
    outstanding: Decimal
    due_on: date | None
    note: str | None
    status: ObligationStatus
    created_at: datetime
    plan: ObligationPlan | None
    payments: list[PaymentRead]


class ObligationSummary(BaseModel):
    total_outstanding: Decimal
    overdue_total: Decimal
    overdue_count: int
    open_count: int