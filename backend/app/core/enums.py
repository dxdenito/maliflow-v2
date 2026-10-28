from enum import StrEnum


class Pool(StrEnum):
    AVAILABLE = "available"
    SAVINGS = "savings"


class AccountType(StrEnum):
    CASH = "cash"
    BANK = "bank"
    MOBILE_MONEY = "mobile_money"
    OTHER = "other"


class EntryType(StrEnum):
    OPENING_BALANCE = "opening_balance"
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"
    SAVINGS_DEPOSIT = "savings_deposit"
    SAVINGS_WITHDRAWAL = "savings_withdrawal"
    DEBT_PAYMENT = "debt_payment"
    INVESTMENT_CONTRIBUTION = "investment_contribution"
    INVESTMENT_WITHDRAWAL = "investment_withdrawal"
    PURCHASE_PAYMENT = "purchase_payment"


class IncomeType(StrEnum):
    SALARY = "salary"
    SIDE_HUSTLE = "side_hustle"
    BUSINESS = "business"
    OTHER = "other"


class IncomeStatus(StrEnum):
    EXPECTED = "expected"
    RECEIVED = "received"