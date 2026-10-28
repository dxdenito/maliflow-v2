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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Investment(Base):
    __tablename__ = "investments"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_investments_user_name"),
        CheckConstraint(
            "investment_type IN ('stock', 'mmf', 'business', 'other')",
            name="ck_investments_type_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    investment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    events: Mapped[list["InvestmentEvent"]] = relationship(
        back_populates="investment", cascade="all, delete-orphan"
    )


class InvestmentEvent(Base):
    __tablename__ = "investment_events"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('opening', 'contribution', 'withdrawal', 'valuation')",
            name="ck_investment_events_kind_valid",
        ),
        CheckConstraint(
            "(kind = 'valuation' AND amount >= 0 AND account_id IS NULL) "
            "OR (kind = 'opening' AND amount > 0 AND account_id IS NULL) "
            "OR (kind IN ('contribution', 'withdrawal') "
            "AND amount > 0 AND account_id IS NOT NULL)",
            name="ck_investment_events_shape",
        ),
        Index("ix_investment_events_investment_date", "investment_id", "occurred_on"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    investment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("investments.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    investment: Mapped["Investment"] = relationship(back_populates="events")