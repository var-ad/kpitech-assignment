from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.menu_item import MenuItem
from app.schemas.menu_item import MenuItemRead

router = APIRouter(prefix="/api/menu", tags=["customer"])


def _non_deleted(query):
    return query.where(MenuItem.deleted_at.is_(None))


@router.get("", response_model=list[MenuItemRead])
async def list_available(
    category: str | None = Query(default=None),
    is_vegetarian: bool | None = Query(default=None),
    is_spicy: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(MenuItem).where(MenuItem.available == True)
    query = _non_deleted(query)
    if category is not None:
        query = query.where(MenuItem.category == category)
    if is_vegetarian is not None:
        query = query.where(MenuItem.is_vegetarian == is_vegetarian)
    if is_spicy is not None:
        query = query.where(MenuItem.is_spicy == is_spicy)
    result = db.execute(query.order_by(MenuItem.id))
    return result.scalars().all()


@router.get("/categories", response_model=list[str])
async def list_categories(
    db: Session = Depends(get_db),
):
    query = (
        select(MenuItem.category)
        .where(MenuItem.available == True)
        .where(MenuItem.deleted_at.is_(None))
        .distinct()
        .order_by(MenuItem.category)
    )
    result = db.execute(query)
    return [row[0] for row in result.all()]


@router.get("/specials", response_model=list[MenuItemRead])
async def get_specials(
    db: Session = Depends(get_db),
):
    query = select(MenuItem).where(
        MenuItem.is_special == True,
        MenuItem.available == True,
        MenuItem.deleted_at.is_(None),
    ).order_by(MenuItem.updated_at.desc())
    result = db.execute(query)
    return result.scalars().all()


@router.get("/{item_id}", response_model=MenuItemRead)
async def get_available_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    query = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.available == True,
        MenuItem.deleted_at.is_(None),
    )
    item = db.execute(query).scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found"
        )
    return item
