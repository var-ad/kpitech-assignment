"""Auth endpoint tests: register, login, /me, role enforcement."""

from fastapi.testclient import TestClient


def test_register_creates_customer(client: TestClient, db):
    resp = client.post("/api/auth/register", json={
        "name": "New User", "email": "new@test.com", "password": "password123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert data["role"] == "customer"
    assert "id" in data


def test_register_duplicate_email_409(client: TestClient, db, customer_user):
    resp = client.post("/api/auth/register", json={
        "name": "Dup", "email": "cust@test.com", "password": "password123",
    })
    assert resp.status_code == 409
    assert "detail" in resp.json()


def test_login_succeeds(client: TestClient, db, customer_user):
    resp = client.post("/api/auth/login", json={
        "email": "cust@test.com", "password": "cust123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_401(client: TestClient, db, customer_user):
    resp = client.post("/api/auth/login", json={
        "email": "cust@test.com", "password": "wrongpass",
    })
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_me_returns_user(client: TestClient, db, customer_token):
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "cust@test.com"
    assert data["role"] == "customer"


def test_me_invalid_token_401(client: TestClient, db):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.here"})
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_me_missing_token_401(client: TestClient, db):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_customer_token_rejected_on_admin_route(
    client: TestClient, db, customer_token, admin_user,
):
    """A customer JWT hitting an admin-only route gets 403, not 401."""
    resp = client.get("/api/admin/dashboard",
                      headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403
    detail = resp.json().get("detail", "")
    assert "admin" in detail.lower()


def test_admin_token_accepted_on_admin_route(
    client: TestClient, db, admin_headers, menu_items,
):
    resp = client.get("/api/admin/menu-items", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
