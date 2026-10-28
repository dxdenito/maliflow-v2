import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]


class SavingsTransferCreate(BaseModel):
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    amount: Money
    occurred_on: date
    note: str | None = Field(default=None, max_length=255)

    @field_validator("occurred_on")
    @classmethod
    def validate_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date cannot be in the future")
        return value

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def check_accounts(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("Choose two different accounts")
        return self


class SavingsEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_type: str
    amount: Decimal
    from_account_id: uuid.UUID | None
    to_account_id: uuid.UUID | None
    occurred_on: date
    description: str | None


class SavingsSummary(BaseModel):
    period: date
    savings_balance: Decimal
    deposited: Decimal
    withdrawn: Decimal
    net_saved: Decimal
    planned_savings: Decimal | None
    income_received: Decimal
    spent: Decimal
    left_unsaved: Decimal