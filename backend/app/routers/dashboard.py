from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.dashboard import DashboardResponse, PopularItem, StatusCount

router = APIRouter(
    prefix="/api/admin/dashboard",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # 1. Orders by status
    status_rows = (
        db.query(Order.status, func.count(Order.id).label("cnt"))
        .group_by(Order.status)
        .all()
    )
    orders_by_status = [
        StatusCount(status=row[0].value, count=row[1]) for row in status_rows
    ]

    # 2. Today's revenue - use date_trunc for consistent day boundary comparison
    todays_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(
            func.date_trunc("day", Order.created_at)
            == func.date_trunc("day", func.now())
        )
        .scalar()
    ) or 0.0

    # 3. Popular items (top 5 by total quantity ordered)
    popular_rows = (
        db.query(
            MenuItem.name,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("total_qty"),
        )
        .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
        .group_by(MenuItem.id, MenuItem.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    popular_items = [
        PopularItem(name=row[0], total_quantity=row[1]) for row in popular_rows
    ]

    return DashboardResponse(
        orders_by_status=orders_by_status,
        todays_revenue=float(todays_revenue),
        popular_items=popular_items,
    )
