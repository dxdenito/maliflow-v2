import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Income(Base):
    __tablename__ = "incomes"
    __table_args__ = (
        CheckConstraint("expected_amount > 0", name="ck_incomes_expected_positive"),
        CheckConstraint(
            "(status = 'expected' AND received_amount IS NULL "
            "AND received_on IS NULL AND account_id IS NULL) "
            "OR (status = 'received' AND received_amount > 0 "
            "AND received_on IS NOT NULL AND account_id IS NOT NULL)",
            name="ck_incomes_receipt_consistent",
        ),
        Index("ix_incomes_user_period", "user_id", "period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    income_type: Mapped[str] = mapped_column(String(30), nullable=False)
    expected_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    expected_on: Mapped[date] = mapped_column(Date, nullable=False)
    period: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="expected", nullable=False)
    received_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    received_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )