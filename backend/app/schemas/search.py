from decimal import Decimal

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)


class SearchItem(BaseModel):
    id: int
    name: str
    description: str | None
    category: str
    price: Decimal
    is_vegetarian: bool
    is_spicy: bool
    available: bool
    score: float | None = None


class SearchResponse(BaseModel):
    items: list[SearchItem]
    relaxed_filters: bool = False
    relaxed_note: str | None = None
