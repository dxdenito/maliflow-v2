import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

Severity = Literal["warning", "info", "good"]


class ReportCategory(BaseModel):
    category_id: uuid.UUID
    name: str
    amount: Decimal
    share: Decimal | None
    previous: Decimal
    change_pct: Decimal | None
    transactions: int
    limit: Decimal | None


class DayTotal(BaseModel):
    day: int
    total: Decimal


class TopExpense(BaseModel):
    id: uuid.UUID
    label: str
    category_id: uuid.UUID
    amount: Decimal
    spent_on: date


class Insight(BaseModel):
    kind: str
    severity: Severity
    title: str
    detail: str
    amount: Decimal | None = None


class IncomeUse(BaseModel):
    spent: Decimal
    obligations_paid: Decimal
    purchases_paid: Decimal
    saved: Decimal
    invested: Decimal
    left_over: Decimal


class BudgetBrief(BaseModel):
    exists: bool
    total: Decimal
    spent: Decimal
    remaining: Decimal
    expected_income: Decimal
    planned_savings: Decimal


class MonthReport(BaseModel):
    period: date
    income_received: Decimal
    spent_total: Decimal
    savings_rate: Decimal | None
    average_per_day: Decimal
    use: IncomeUse
    budget: BudgetBrief
    categories: list[ReportCategory]
    daily: list[DayTotal]
    daily_budget: Decimal | None
    days_over_budget: int
    top_expenses: list[TopExpense]
    insights: list[Insight]


class TrendPoint(BaseModel):
    period: date
    income: Decimal
    spent: Decimal
    saved: Decimal
    budget: Decimal | None
    savings_rate: Decimal | None


class Trend(BaseModel):
    points: list[TrendPoint]