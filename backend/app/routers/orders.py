from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db import get_db
from app.models.menu_item import MenuItem
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate, OrderItemRead, OrderRead, OrderStatusUpdate

# ── Customer-facing router (no auth) ──
router = APIRouter(prefix="/api/orders", tags=["orders"])

# ── Admin router (requires JWT) ──
admin_router = APIRouter(
    prefix="/api/admin/orders",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

STATUS_SEQUENCE = [
    OrderStatus.placed,
    OrderStatus.confirmed,
    OrderStatus.preparing,
    OrderStatus.ready,
    OrderStatus.picked_up,
]


def _order_to_read(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemRead(
                id=oi.id,
                menu_item_id=oi.menu_item_id,
                name=oi.menu_item.name if oi.menu_item else "",
                quantity=oi.quantity,
                unit_price=oi.unit_price,
            )
            for oi in order.items
        ],
    )


# ─────────────────────────────────────────────
#  Customer endpoints
# ─────────────────────────────────────────────


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    items_data = body.items
    if not items_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    # Look up menu items, validate availability, snapshot prices
    order_items: list[OrderItem] = []
    total = 0
    for entry in items_data:
        menu_item = (
            db.query(MenuItem)
            .filter(MenuItem.id == entry.menu_item_id)
            .first()
        )
        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Menu item {entry.menu_item_id} not found",
            )
        if not menu_item.available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Menu item '{menu_item.name}' is not available",
            )

        unit_price = menu_item.price
        total += unit_price * entry.quantity
        order_items.append(
            OrderItem(
                menu_item_id=menu_item.id,
                quantity=entry.quantity,
                unit_price=unit_price,
            )
        )

    order = Order(status=OrderStatus.placed, total_amount=total, items=order_items)
    try:
        db.add(order)
        db.commit()
        db.refresh(order)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )

    return _order_to_read(order)


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return _order_to_read(order)


# ─────────────────────────────────────────────
#  Admin endpoints
# ─────────────────────────────────────────────


@admin_router.get("", response_model=list[OrderRead])
async def list_orders(
    status: OrderStatus | None = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Order)
    if status is not None:
        query = query.filter(Order.status == status)
    orders = query.order_by(Order.created_at.desc()).all()
    return [_order_to_read(o) for o in orders]


@admin_router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    current_idx = STATUS_SEQUENCE.index(order.status)
    new_idx = STATUS_SEQUENCE.index(body.status)

    if new_idx != current_idx + 1:
        if current_idx == len(STATUS_SEQUENCE) - 1:
            msg = f"Order is already at final status '{order.status.value}' - cannot advance further"
        else:
            msg = (
                f"Cannot move from '{order.status.value}' to '{body.status.value}' directly. "
                f"Valid transition: '{order.status.value}' -> '{STATUS_SEQUENCE[current_idx + 1].value}'"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    order.status = body.status
    try:
        db.commit()
        db.refresh(order)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status",
        )

    return _order_to_read(order)
