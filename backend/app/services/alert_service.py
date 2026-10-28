import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.schemas.alert import AlertRead
from app.services import obligation_service, purchase_service

UPCOMING_DAYS = 3
KIND_ORDER = {"overdue": 0, "due_today": 1, "upcoming": 2}


def build_alert(source: str, item, today: date) -> AlertRead | None:
    if item.status in ("settled", "paid") or item.due_on is None:
        return None

    days = (item.due_on - today).days

    if item.status == "overdue":
        kind = "overdue"
    elif days == 0:
        kind = "due_today"
    elif days <= UPCOMING_DAYS:
        kind = "upcoming"
    else:
        return None

    if item.plan is None:
        amount = item.outstanding
    elif kind == "upcoming":
        amount = item.plan.next_due_amount
    else:
        amount = item.plan.due_now

    return AlertRead(
        item_id=item.id,
        source=source,
        name=item.name,
        kind=kind,
        amount=amount,
        due_on=item.due_on,
        days=days,
    )


def get_alerts(db: Session, user_id: uuid.UUID) -> list[AlertRead]:
    today = date.today()
    sources = [
        ("obligation", obligation_service.list_obligations(db, user_id)),
        ("purchase", purchase_service.list_purchases(db, user_id)),
    ]

    alerts: list[AlertRead] = []
    for source, items in sources:
        for item in items:
            alert = build_alert(source, item, today)
            if alert is not None:
                alerts.append(alert)

    alerts.sort(key=lambda alert: (KIND_ORDER[alert.kind], alert.days))
    return alerts