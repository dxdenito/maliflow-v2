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

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]


def check_date(value: date | None) -> date | None:
    if value is not None and value > date.today():
        raise ValueError("Date cannot be in the future")
    return value


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


class ExpenseCreate(BaseModel):
    category_id: uuid.UUID
    account_id: uuid.UUID | None = None
    paid_by: str | None = Field(default=None, max_length=60)
    repay_by: date | None = None
    amount: Money
    spent_on: date
    description: str | None = Field(default=None, max_length=255)

    @field_validator("spent_on")
    @classmethod
    def validate_spent_on(cls, value: date) -> date:
        return check_date(value)

    @field_validator("description", "paid_by")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return clean_text(value)

    @model_validator(mode="after")
    def check_payer(self):
        if (self.account_id is None) == (self.paid_by is None):
            raise ValueError(
                "Choose either the account you paid from, or who paid for you"
            )
        if self.repay_by is not None and self.paid_by is None:
            raise ValueError("A pay-back date only applies when someone else paid")
        return self


class ExpenseUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    amount: Money | None = None
    spent_on: date | None = None
    description: str | None = Field(default=None, max_length=255)

    @field_validator("spent_on")
    @classmethod
    def validate_spent_on(cls, value: date | None) -> date | None:
        return check_date(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return clean_text(value)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    account_id: uuid.UUID | None
    obligation_id: uuid.UUID | None
    amount: Decimal
    spent_on: date
    description: str | None
    created_at: datetime


class CategoryTotal(BaseModel):
    category_id: uuid.UUID
    total: Decimal


class ExpenseSummary(BaseModel):
    period: date
    total: Decimal
    today_total: Decimal
    by_category: list[CategoryTotal]