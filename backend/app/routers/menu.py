import datetime
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db import get_db
from app.models.menu_item import MenuItem
from app.models.user import User
from app.schemas.menu_item import (
    MenuItemAvailabilityUpdate,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
)

router = APIRouter(dependencies=[Depends(get_current_admin)])


def _get_menu_item_or_404(db: Session, item_id: int) -> MenuItem:
    """Look up by ID — allows soft-deleted items so admin can inspect order history."""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found"
        )
    return item


def _non_deleted(query):
    return query.filter(MenuItem.deleted_at.is_(None))


@router.post("", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(
    body: MenuItemCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    item = MenuItem(**body.model_dump())
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create menu item",
        )
    return item


@router.get("", response_model=list[MenuItemRead])
async def list_items(
    category: str | None = Query(default=None),
    available: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = _non_deleted(db.query(MenuItem))
    if category is not None:
        query = query.filter(MenuItem.category == category)
    if available is not None:
        query = query.filter(MenuItem.available == available)
    return query.order_by(MenuItem.id).all()


@router.get("/{item_id}", response_model=MenuItemRead)
async def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return _get_menu_item_or_404(db, item_id)


@router.put("/{item_id}", response_model=MenuItemRead)
async def update_item(
    item_id: int,
    body: MenuItemUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    item = _get_menu_item_or_404(db, item_id)

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        return item

    for field, value in update_data.items():
        setattr(item, field, value)

    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update menu item",
        )
    return item


@router.patch("/{item_id}/availability", response_model=MenuItemRead)
async def toggle_availability(
    item_id: int,
    body: MenuItemAvailabilityUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    item = _get_menu_item_or_404(db, item_id)
    item.available = body.available
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update availability",
        )
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    item = _get_menu_item_or_404(db, item_id)
    item.deleted_at = datetime.datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete menu item",
        )
    return None
