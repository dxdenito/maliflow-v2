import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.obligation import clean_note

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
Balance = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]


def not_future(value: date) -> date:
    if value > date.today():
        raise ValueError("Date cannot be in the future")
    return value


class LedgerEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_type: str
    amount: Decimal
    from_account_id: uuid.UUID | None
    to_account_id: uuid.UUID | None
    occurred_on: date
    description: str | None
    reference_type: str | None
    created_at: datetime


class LedgerSummary(BaseModel):
    period: date
    money_in: Decimal
    money_out: Decimal
    adjustments_net: Decimal
    entry_count: int


class AdjustmentCreate(BaseModel):
    account_id: uuid.UUID
    new_balance: Balance
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


class TransferCreate(BaseModel):
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
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

    @model_validator(mode="after")
    def check_accounts(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("Choose two different accounts")
        return self