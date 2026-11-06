import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.enums import IncomeType

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
IncomeState = Literal["expected", "partial", "received"]


def ensure_not_future(value: date | None) -> date | None:
    if value is not None and value > date.today():
        raise ValueError("Received date cannot be in the future")
    return value


def clean_source(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Source cannot be empty")
    return cleaned


def clean_note(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


class IncomeCreate(BaseModel):
    source: str = Field(min_length=1, max_length=100)
    income_type: IncomeType
    expected_amount: Money
    expected_on: date
    period: date | None = None
    note: str | None = Field(default=None, max_length=255)
    received_amount: Money | None = None
    received_on: date | None = None
    account_id: uuid.UUID | None = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        return clean_source(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)

    @field_validator("received_on")
    @classmethod
    def validate_received_on(cls, value: date | None) -> date | None:
        return ensure_not_future(value)

    @model_validator(mode="after")
    def check_receipt(self):
        given = [
            self.received_amount is not None,
            self.received_on is not None,
            self.account_id is not None,
        ]
        if any(given) and not all(given):
            raise ValueError(
                "To record a payment, send received_amount, received_on and account_id together"
            )
        return self


class IncomeUpdate(BaseModel):
    source: str | None = Field(default=None, min_length=1, max_length=100)
    income_type: IncomeType | None = None
    expected_amount: Money | None = None
    expected_on: date | None = None
    period: date | None = None
    note: str | None = Field(default=None, max_length=255)
    closed: bool | None = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        return clean_source(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class ReceiptCreate(BaseModel):
    amount: Money
    received_on: date
    account_id: uuid.UUID
    note: str | None = Field(default=None, max_length=255)
    close: bool = False

    @field_validator("received_on")
    @classmethod
    def validate_received_on(cls, value: date) -> date:
        return ensure_not_future(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    received_on: date
    account_id: uuid.UUID
    note: str | None
    created_at: datetime


class IncomeRead(BaseModel):
    id: uuid.UUID
    source: str
    income_type: IncomeType
    expected_amount: Decimal
    expected_on: date
    period: date
    closed: bool
    status: IncomeState
    received_total: Decimal
    remaining: Decimal
    note: str | None
    created_at: datetime
    receipts: list[ReceiptRead]


class IncomeSummary(BaseModel):
    period: date
    expected_total: Decimal
    received_total: Decimal
    pending_total: Decimal