import datetime
from decimal import Decimal

from app.models.menu_item import CookingMethod
from pydantic import BaseModel, ConfigDict, Field, field_validator


class MenuItemCreate(BaseModel):
    name: str = Field(..., max_length=255, min_length=1)
    description: str | None = None
    category: str = Field(..., max_length=100)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    is_vegetarian: bool = False
    is_spicy: bool = False
    available: bool = True
    cooking_method: CookingMethod = CookingMethod.none

    @field_validator("category")
    @classmethod
    def category_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("category must not be empty")
        return v.strip()


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255, min_length=1)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    is_vegetarian: bool | None = None
    is_spicy: bool | None = None
    available: bool | None = None
    cooking_method: CookingMethod | None = None

    @field_validator("category")
    @classmethod
    def category_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("category must not be empty")
        return v.strip() if v else v


class MenuItemAvailabilityUpdate(BaseModel):
    available: bool


class MenuItemSpecialUpdate(BaseModel):
    is_special: bool


class MenuItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    category: str
    price: Decimal
    is_vegetarian: bool
    is_spicy: bool
    available: bool
    is_special: bool
    cooking_method: CookingMethod
    created_at: datetime.datetime
    updated_at: datetime.datetime
