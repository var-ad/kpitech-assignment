from pydantic import BaseModel


class StatusCount(BaseModel):
    status: str
    count: int


class PopularItem(BaseModel):
    name: str
    total_quantity: int


class DashboardResponse(BaseModel):
    orders_by_status: list[StatusCount]
    todays_revenue: float
    popular_items: list[PopularItem]
