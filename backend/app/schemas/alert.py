import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

AlertKind = Literal["overdue", "due_today", "upcoming"]
AlertSource = Literal["obligation", "purchase"]


class AlertRead(BaseModel):
    item_id: uuid.UUID
    source: AlertSource
    name: str
    kind: AlertKind
    amount: Decimal
    due_on: date
    days: int