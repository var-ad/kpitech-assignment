"""Order tests: creation, validation, status transitions, auth enforcement."""


def test_create_order_succeeds(client, db, menu_items):
    resp = client.post("/api/orders", json={
        "items": [
            {"menu_item_id": menu_items[0].id, "quantity": 2},
            {"menu_item_id": menu_items[1].id, "quantity": 1},
        ],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "placed"
    # Total: 350*2 + 250*1 = 950
    assert float(data["total_amount"]) == 950.0
    assert len(data["items"]) == 2


def test_create_order_fails_empty_items(client, db):
    resp = client.post("/api/orders", json={"items": []})
    assert resp.status_code == 422  # Pydantic min_length=1


def test_create_order_fails_unavailable_item(client, db, menu_items):
    # menu_items[5] is "Unavailable Item" with available=False
    resp = client.post("/api/orders", json={
        "items": [{"menu_item_id": menu_items[5].id, "quantity": 1}],
    })
    assert resp.status_code == 400
    assert "not available" in resp.json()["detail"].lower()


def test_create_order_fails_nonexistent_item(client, db):
    resp = client.post("/api/orders", json={
        "items": [{"menu_item_id": 99999, "quantity": 1}],
    })
    assert resp.status_code == 404


def test_get_order_by_id(client, db, placed_order):
    resp = client.get(f"/api/orders/{placed_order.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == placed_order.id
    assert data["status"] == "placed"


def test_get_nonexistent_order_404(client, db):
    resp = client.get("/api/orders/99999")
    assert resp.status_code == 404


def test_status_transition_valid(client, db, admin_headers, placed_order):
    resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                        headers=admin_headers, json={"status": "confirmed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


def test_status_transition_invalid_skip(client, db, admin_headers, placed_order):
    """Cannot skip from placed to ready (must go through confirmed → preparing)."""
    resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                        headers=admin_headers, json={"status": "ready"})
    assert resp.status_code == 400
    assert "cannot move" in resp.json()["detail"].lower()


def test_status_transition_backwards(client, db, admin_headers, placed_order):
    # Advance to confirmed
    client.patch(f"/api/admin/orders/{placed_order.id}/status",
                 headers=admin_headers, json={"status": "confirmed"})
    # Try to go back to placed
    resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                        headers=admin_headers, json={"status": "placed"})
    assert resp.status_code == 400
    assert "cannot move" in resp.json()["detail"].lower()


def test_status_transition_at_final_status(client, db, admin_headers, placed_order):
    """Advancing beyond picked_up should fail."""
    for s in ["confirmed", "preparing", "ready", "picked_up"]:
        resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                            headers=admin_headers, json={"status": s})
        assert resp.status_code == 200

    # Now at picked_up — try to advance further
    resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                        headers=admin_headers, json={"status": "placed"})
    assert resp.status_code == 400
    assert "already at final status" in resp.json()["detail"].lower()


def test_admin_can_list_orders(client, db, admin_headers, placed_order):
    resp = client.get("/api/admin/orders", headers=admin_headers)
    assert resp.status_code == 200
    orders = resp.json()
    assert len(orders) >= 1
    ids = [o["id"] for o in orders]
    assert placed_order.id in ids


def test_admin_can_filter_orders_by_status(client, db, admin_headers, placed_order):
    resp = client.get("/api/admin/orders?status=placed", headers=admin_headers)
    assert resp.status_code == 200
    orders = resp.json()
    assert all(o["status"] == "placed" for o in orders)


def test_non_admin_cannot_update_status(client, db, customer_headers, placed_order):
    resp = client.patch(f"/api/admin/orders/{placed_order.id}/status",
                        headers=customer_headers, json={"status": "confirmed"})
    assert resp.status_code == 403


def test_full_lifecycle(client, db, admin_headers, menu_items):
    """Place an order and walk through all 5 status transitions."""
    # Place
    resp = client.post("/api/orders", json={
        "items": [{"menu_item_id": menu_items[0].id, "quantity": 1}],
    })
    assert resp.status_code == 201
    order_id = resp.json()["id"]

    # Advance through each status
    for status in ["confirmed", "preparing", "ready", "picked_up"]:
        resp = client.patch(f"/api/admin/orders/{order_id}/status",
                            headers=admin_headers, json={"status": status})
        assert resp.status_code == 200
        assert resp.json()["status"] == status

    # Verify final
    resp = client.get(f"/api/orders/{order_id}")
    assert resp.json()["status"] == "picked_up"
