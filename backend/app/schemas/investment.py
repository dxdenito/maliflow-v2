import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.obligation import clean_name, clean_note

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
Value = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
InvestmentType = Literal["stock", "mmf", "business", "other"]
EventKind = Literal["opening", "contribution", "withdrawal", "valuation"]
InvestmentStatus = Literal["active", "closed"]


def not_future(value: date | None) -> date | None:
    if value is not None and value > date.today():
        raise ValueError("Date cannot be in the future")
    return value


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    investment_type: InvestmentType
    note: str | None = Field(default=None, max_length=255)
    initial_capital: Money | None = None
    current_value: Value | None = None
    as_of: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)

    @field_validator("as_of")
    @classmethod
    def validate_as_of(cls, value: date | None) -> date | None:
        return not_future(value)

    @model_validator(mode="after")
    def check_values(self):
        if self.current_value is not None and self.initial_capital is None:
            raise ValueError(
                "Enter how much you originally invested along with its current value"
            )
        return self


class InvestmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    investment_type: InvestmentType | None = None
    note: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return clean_name(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class MoneyMoveCreate(BaseModel):
    account_id: uuid.UUID
    amount: Money
    occurred_on: date
    note: str | None = Field(default=None, max_length=255)

    @field_validator("occurred_on")
    @classmethod
    def validate_occurred_on(cls, value: date) -> date:
        return not_future(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class ValuationCreate(BaseModel):
    value: Value
    occurred_on: date
    note: str | None = Field(default=None, max_length=255)

    @field_validator("occurred_on")
    @classmethod
    def validate_occurred_on(cls, value: date) -> date:
        return not_future(value)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        return clean_note(value)


class EventRead(BaseModel):
    id: uuid.UUID
    kind: EventKind
    amount: Decimal
    occurred_on: date
    account_id: uuid.UUID | None
    note: str | None
    created_at: datetime


class InvestmentRead(BaseModel):
    id: uuid.UUID
    name: str
    investment_type: InvestmentType
    note: str | None
    status: InvestmentStatus
    value: Decimal
    net_capital: Decimal
    contributed: Decimal
    withdrawn: Decimal
    realized_gain: Decimal
    unrealized_gain: Decimal
    total_gain: Decimal
    return_pct: Decimal | None
    last_valued_on: date | None
    created_at: datetime
    events: list[EventRead]


class InvestmentSummary(BaseModel):
    count: int
    total_value: Decimal
    net_capital: Decimal
    contributed: Decimal
    withdrawn: Decimal
    realized_gain: Decimal
    unrealized_gain: Decimal
    total_gain: Decimal
    return_pct: Decimal | None