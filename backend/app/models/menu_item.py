import datetime
import enum

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum as SAEnum, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


class CookingMethod(str, enum.Enum):
    none = "none"
    fried = "fried"
    steamed = "steamed"
    grilled = "grilled"
    baked = "baked"
    roasted = "roasted"
    boiled = "boiled"
    raw = "raw"


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_spicy: Mapped[bool] = mapped_column(Boolean, default=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_special: Mapped[bool] = mapped_column(Boolean, default=False)
    cooking_method: Mapped[CookingMethod] = mapped_column(
        SAEnum(CookingMethod, name="cooking_method", create_constraint=True),
        nullable=False,
        default=CookingMethod.none,
    )
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384) if Vector else String,
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_menu_item_price_non_negative"),
    )
