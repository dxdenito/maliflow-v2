from decimal import Decimal

from pydantic import BaseModel


class NetWorth(BaseModel):
    available: Decimal
    savings: Decimal
    investments: Decimal
    owned_items: Decimal
    total_assets: Decimal
    obligations: Decimal
    purchases: Decimal
    total_liabilities: Decimal
    net_worth: Decimal