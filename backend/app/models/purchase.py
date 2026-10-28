import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_purchases_price_positive"),
        CheckConstraint(
            "finance_charges >= 0", name="ck_purchases_charges_nonnegative"
        ),
        CheckConstraint(
            "kind IN ('cash', 'financed')", name="ck_purchases_kind_valid"
        ),
        Index("ix_purchases_user_date", "user_id", "purchased_on"),
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
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    finance_charges: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), server_default="0", nullable=False
    )
    lender: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purchased_on: Mapped[date] = mapped_column(Date, nullable=False)
    installment_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    frequency: Mapped[str | None] = mapped_column(String(20), nullable=True)
    first_due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    asset_value: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    payments: Mapped[list["PurchasePayment"]] = relationship(
        back_populates="purchase",
        cascade="all, delete-orphan",
        order_by="PurchasePayment.paid_on.desc()",
    )


class PurchasePayment(Base):
    __tablename__ = "purchase_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    is_deposit: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    purchase: Mapped["Purchase"] = relationship(back_populates="payments")
    allocations: Mapped[list["PurchaseAllocation"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )


class PurchaseAllocation(Base):
    __tablename__ = "purchase_allocations"
    __table_args__ = (
        CheckConstraint(
            "amount > 0", name="ck_purchase_allocations_amount_positive"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    payment: Mapped["PurchasePayment"] = relationship(back_populates="allocations")