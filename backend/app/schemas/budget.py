import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, model_validator

Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]


class BudgetItemInput(BaseModel):
    category_id: uuid.UUID
    amount: Money


class BudgetSave(BaseModel):
    total_amount: Money
    items: list[BudgetItemInput] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def check_items(self):
        category_ids = [item.category_id for item in self.items]
        if len(category_ids) != len(set(category_ids)):
            raise ValueError("Each category can only appear once")

        allocated = sum((item.amount for item in self.items), Decimal("0"))
        if allocated > self.total_amount:
            raise ValueError(
                "Category amounts add up to more than the monthly budget"
            )
        return self


class BudgetItemStatus(BaseModel):
    category_id: uuid.UUID
    allocated: Decimal
    spent: Decimal
    remaining: Decimal


class DailyBudget(BaseModel):
    base_daily: Decimal
    days_in_month: int
    days_left: int
    today_allowance: Decimal
    spent_today: Decimal
    left_today: Decimal


class BudgetStatus(BaseModel):
    period: date
    exists: bool
    total_amount: Decimal
    allocated_total: Decimal
    unallocated: Decimal
    spent_total: Decimal
    remaining: Decimal
    unbudgeted_spent: Decimal
    expected_income: Decimal
    planned_savings: Decimal
    items: list[BudgetItemStatus]
    daily: DailyBudget | None