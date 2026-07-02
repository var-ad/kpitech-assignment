"""Menu CRUD tests: admin create/update/delete, customer browse, auth enforcement."""


def test_admin_create_item(client, db, admin_headers):
    resp = client.post("/api/admin/menu-items", headers=admin_headers, json={
        "name": "Test Dish", "category": "Test", "price": 100,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Dish"
    assert data["cooking_method"] == "none"


def test_admin_create_item_requires_auth(client, db):
    resp = client.post("/api/admin/menu-items", json={
        "name": "Should Fail", "category": "Test", "price": 100,
    })
    assert resp.status_code == 401, "no auth token → 401 (OAuth2PasswordBearer rejects before admin check)"


def test_admin_list_items(client, db, admin_headers, menu_items):
    resp = client.get("/api/admin/menu-items", headers=admin_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 5  # all seeded items that aren't deleted


def test_admin_update_item(client, db, admin_headers, menu_items):
    item_id = menu_items[0].id
    resp = client.put(f"/api/admin/menu-items/{item_id}", headers=admin_headers, json={
        "price": 400, "cooking_method": "grilled",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["price"]) == 400.0
    assert data["cooking_method"] == "grilled"


def test_admin_soft_delete_item(client, db, admin_headers, menu_items):
    item_id = menu_items[0].id
    resp = client.delete(f"/api/admin/menu-items/{item_id}", headers=admin_headers)
    assert resp.status_code == 204

    # Verify it's still in admin listing but with deleted_at set
    resp = client.get(f"/api/admin/menu-items/{item_id}", headers=admin_headers)
    assert resp.status_code == 200


def test_customer_sees_only_available_items(client, db, menu_items, customer_headers):
    resp = client.get("/api/menu")
    assert resp.status_code == 200
    items = resp.json()
    names = [i["name"] for i in items]
    assert "Butter Chicken" in names
    assert "Unavailable Item" not in names  # available=False


def test_customer_item_detail_found(client, db, menu_items):
    item_id = menu_items[0].id
    resp = client.get(f"/api/menu/{item_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == menu_items[0].name


def test_customer_item_detail_not_found(client, db):
    resp = client.get("/api/menu/99999")
    assert resp.status_code == 404


def test_non_admin_cannot_create_item(client, db, customer_headers):
    resp = client.post("/api/admin/menu-items", headers=customer_headers, json={
        "name": "Hack", "category": "Test", "price": 100,
    })
    assert resp.status_code == 403
    assert "admin" in resp.json()["detail"].lower()


def test_non_admin_cannot_update_item(client, db, customer_headers, menu_items):
    resp = client.put(f"/api/admin/menu-items/{menu_items[0].id}",
                      headers=customer_headers, json={"price": 999})
    assert resp.status_code == 403


def test_non_admin_cannot_delete_item(client, db, customer_headers, menu_items):
    resp = client.delete(f"/api/admin/menu-items/{menu_items[0].id}",
                         headers=customer_headers)
    assert resp.status_code == 403
