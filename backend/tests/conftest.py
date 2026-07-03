"""Test configuration - SQLite in-memory, dependency overrides, fixtures.

Uses SQLite in-memory so tests are fully isolated and require no external DB.
Enum columns degrade to VARCHAR automatically. The pgvector import gracefully
falls back to String when the extension is absent.
"""

import os
from typing import Any, Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# ── Override DATABASE_URL before any app module is imported ──
os.environ["DATABASE_URL"] = "sqlite:///./test.db?check_same_thread=False"
os.environ["JWT_SECRET"] = "test-secret-not-for-prod"
os.environ["DEEPSEEK_API_KEY"] = ""  # disable LLM for tests

from app.core.security import hash_password, create_access_token
from app.db import Base, get_db
from app.main import app as _app
from app.models.menu_item import MenuItem, CookingMethod
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.user import User, UserRole

# ── Test engine & session ──────────────────────────────────

_test_engine = create_engine(
    "sqlite:///./test.db?check_same_thread=False",
    connect_args={"check_same_thread": False},
)

_TestSessionLocal = None


def _get_test_session():
    global _TestSessionLocal
    if _TestSessionLocal is None:
        _TestSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=_test_engine
        )
    return _TestSessionLocal()


def _override_get_db() -> Generator[Session, Any, None]:
    db = _get_test_session()
    try:
        yield db
    finally:
        db.close()


_app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ───────────────────────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once per session."""
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, Any, None]:
    """Per-test database session with auto cleanup."""
    session = _get_test_session()
    # Clean all tables before each test
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, Any, None]:
    """FastAPI TestClient with overridden dependencies."""
    with TestClient(_app) as c:
        yield c


@pytest.fixture(scope="function")
def admin_user(db: Session) -> User:
    """Seeded admin user."""
    user = User(
        name="Admin",
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        role=UserRole.admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def customer_user(db: Session) -> User:
    """Seeded customer user."""
    user = User(
        name="Customer",
        email="cust@test.com",
        password_hash=hash_password("cust123"),
        role=UserRole.customer,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_token(admin_user: User) -> str:
    return create_access_token(data={"sub": str(admin_user.id), "role": "admin"})


@pytest.fixture(scope="function")
def customer_token(customer_user: User) -> str:
    return create_access_token(data={"sub": str(customer_user.id), "role": "customer"})


@pytest.fixture(scope="function")
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def customer_headers(customer_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {customer_token}"}


@pytest.fixture(scope="function")
def menu_items(db: Session) -> list[MenuItem]:
    """Three seeded menu items for order/search tests."""
    items = [
        MenuItem(name="Butter Chicken", category="Main Course", price=350.00,
                 is_vegetarian=False, is_spicy=True, available=True,
                 cooking_method=CookingMethod.none),
        MenuItem(name="Dal Makhani", category="Main Course", price=250.00,
                 is_vegetarian=True, is_spicy=False, available=True,
                 cooking_method=CookingMethod.none),
        MenuItem(name="Naan", category="Breads", price=45.00,
                 is_vegetarian=True, is_spicy=False, available=True,
                 cooking_method=CookingMethod.none),
        MenuItem(name="Spring Roll", category="Starters", price=120.00,
                 is_vegetarian=True, is_spicy=False, available=True,
                 cooking_method=CookingMethod.fried),
        MenuItem(name="Grilled Chicken", category="Starters", price=220.00,
                 is_vegetarian=False, is_spicy=True, available=True,
                 cooking_method=CookingMethod.grilled),
        MenuItem(name="Unavailable Item", category="Main Course", price=300.00,
                 is_vegetarian=True, is_spicy=False, available=False,
                 cooking_method=CookingMethod.none),
    ]
    for item in items:
        db.add(item)
    db.commit()
    for item in items:
        db.refresh(item)
    return items


@pytest.fixture(scope="function")
def placed_order(db: Session, menu_items: list[MenuItem]) -> Order:
    """A placed order with two line items."""
    items_data = [
        (menu_items[0], 2),  # Butter Chicken x2
        (menu_items[1], 1),  # Dal Makhani x1
    ]
    total = sum(item.price * qty for item, qty in items_data)
    order = Order(status=OrderStatus.placed, total_amount=total)
    for item, qty in items_data:
        order.items.append(OrderItem(
            menu_item_id=item.id,
            quantity=qty,
            unit_price=item.price,
        ))
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
