import uuid

from sqlalchemy.orm import Session

from app.schemas.networth import NetWorth
from app.services import (
    account_service,
    investment_service,
    obligation_service,
    purchase_service,
)


def get_net_worth(db: Session, user_id: uuid.UUID) -> NetWorth:
    accounts = account_service.get_summary(db, user_id)
    investments = investment_service.get_summary(db, user_id)
    obligations = obligation_service.get_summary(db, user_id)
    purchases = purchase_service.get_summary(db, user_id)
    owned_items = purchase_service.get_assets_total(db, user_id)

    total_assets = (
        accounts.available
        + accounts.savings
        + investments.total_value
        + owned_items
    )
    total_liabilities = obligations.total_outstanding + purchases.total_outstanding

    return NetWorth(
        available=accounts.available,
        savings=accounts.savings,
        investments=investments.total_value,
        owned_items=owned_items,
        total_assets=total_assets,
        obligations=obligations.total_outstanding,
        purchases=purchases.total_outstanding,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
    )