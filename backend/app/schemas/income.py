import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.enums import IncomeStatus, IncomeType

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]


def ensure_not_future(value: date | None) -> date | None:
    if value is not None and value > date.today():
        raise ValueError("Received date cannot be in the future")
    return value


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
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Source cannot be empty")
        return cleaned

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

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
                "To record receipt, send received_amount, received_on and account_id together"
            )
        return self


class IncomeReceive(BaseModel):
    received_amount: Money
    received_on: date
    account_id: uuid.UUID

    @field_validator("received_on")
    @classmethod
    def validate_received_on(cls, value: date) -> date:
        return ensure_not_future(value)


class IncomeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source: str
    income_type: IncomeType
    expected_amount: Decimal
    expected_on: date
    period: date
    status: IncomeStatus
    received_amount: Decimal | None
    received_on: date | None
    account_id: uuid.UUID | None
    note: str | None
    created_at: datetime


class IncomeSummary(BaseModel):
    period: date
    expected_total: Decimal
    received_total: Decimal
    pending_total: Decimal