"""Tests for backend.routers.routers_dashboards (custom dashboard CRUD).

Previously untested. DashboardService.create_dashboard requires the acting
user to exist as a real `User` row (it does `User.id == user_id` lookup and
raises ValueError otherwise) - under AUTH_ENABLED=False the router's
get_current_user dependency returns a SimpleNamespace(id=1, ...) that is
*not* backed by a database row unless something else seeded one, so a naive
test using the ambient dummy user fails with "User 1 not found". These
tests instead seed a real User row and override get_current_user to return
it, so behavior doesn't depend on incidental autoincrement id matching or
whatever admin-bootstrap state happens to exist.
"""

import pytest

from backend.models import User
from backend.security.current_user import get_current_user


@pytest.fixture
def dashboard_user(client, db):
    user = User(
        email="dashboard-owner@example.com",
        hashed_password="not-a-real-hash",
        full_name="Dashboard Owner",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    client.app.dependency_overrides[get_current_user] = lambda: user
    yield user
    client.app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def other_user(client, db):
    user = User(
        email="other-user@example.com",
        hashed_password="not-a-real-hash",
        full_name="Other User",
        role="teacher",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create(client, name="My Dashboard", charts=None):
    return client.post(
        "/api/v1/dashboards",
        json={"name": name, "configuration": {"charts": charts or ["students-count"]}},
    )


class TestCreateAndList:
    def test_create_dashboard(self, client, dashboard_user):
        response = _create(client)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["success"] is True
        assert body["data"]["name"] == "My Dashboard"
        assert body["data"]["is_default"] is False
        assert body["data"]["configuration"]["charts"] == ["students-count"]

    def test_create_dashboard_duplicate_name_rejected(self, client, dashboard_user):
        first = _create(client, name="Dup")
        assert first.json()["success"] is True

        second = _create(client, name="Dup")
        body = second.json()
        assert body["success"] is False
        assert body["error"]["code"] == "DUPLICATE_ERROR"

    def test_list_dashboards_scoped_to_current_user(self, client, db, dashboard_user, other_user):
        _create(client, name="Mine")

        client.app.dependency_overrides[get_current_user] = lambda: other_user
        try:
            other_list = client.get("/api/v1/dashboards")
        finally:
            client.app.dependency_overrides[get_current_user] = lambda: dashboard_user

        assert other_list.json()["data"] == []

        mine_list = client.get("/api/v1/dashboards")
        names = [d["name"] for d in mine_list.json()["data"]]
        assert names == ["Mine"]


class TestGetUpdateDelete:
    def test_get_own_dashboard(self, client, dashboard_user):
        dashboard_id = _create(client).json()["data"]["id"]
        response = client.get(f"/api/v1/dashboards/{dashboard_id}")
        assert response.json()["data"]["id"] == dashboard_id

    def test_get_dashboard_not_found(self, client, dashboard_user):
        response = client.get("/api/v1/dashboards/999999")
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "NOT_FOUND"

    def test_get_other_users_dashboard_forbidden(self, client, db, dashboard_user, other_user):
        dashboard_id = _create(client).json()["data"]["id"]

        client.app.dependency_overrides[get_current_user] = lambda: other_user
        try:
            response = client.get(f"/api/v1/dashboards/{dashboard_id}")
        finally:
            client.app.dependency_overrides[get_current_user] = lambda: dashboard_user

        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "FORBIDDEN"

    def test_update_dashboard(self, client, dashboard_user):
        dashboard_id = _create(client).json()["data"]["id"]
        response = client.put(
            f"/api/v1/dashboards/{dashboard_id}",
            json={"name": "Renamed"},
        )
        assert response.json()["data"]["name"] == "Renamed"

    def test_update_dashboard_not_owned_returns_not_found(self, client, db, dashboard_user, other_user):
        dashboard_id = _create(client).json()["data"]["id"]

        client.app.dependency_overrides[get_current_user] = lambda: other_user
        try:
            response = client.put(f"/api/v1/dashboards/{dashboard_id}", json={"name": "Hijacked"})
        finally:
            client.app.dependency_overrides[get_current_user] = lambda: dashboard_user

        assert response.json()["error"]["code"] == "NOT_FOUND"

    def test_delete_dashboard(self, client, dashboard_user):
        dashboard_id = _create(client).json()["data"]["id"]
        response = client.delete(f"/api/v1/dashboards/{dashboard_id}")
        assert response.json()["success"] is True

        follow_up = client.get(f"/api/v1/dashboards/{dashboard_id}")
        assert follow_up.json()["error"]["code"] == "NOT_FOUND"


class TestSetDefault:
    def test_set_default_dashboard(self, client, dashboard_user):
        dash_id = _create(client, name="First").json()["data"]["id"]
        response = client.post(f"/api/v1/dashboards/{dash_id}/set-default")
        assert response.json()["data"]["is_default"] is True

    def test_set_default_unsets_previous_default(self, client, dashboard_user):
        first_id = _create(client, name="First").json()["data"]["id"]
        second_id = _create(client, name="Second").json()["data"]["id"]

        client.post(f"/api/v1/dashboards/{first_id}/set-default")
        client.post(f"/api/v1/dashboards/{second_id}/set-default")

        first = client.get(f"/api/v1/dashboards/{first_id}").json()["data"]
        second = client.get(f"/api/v1/dashboards/{second_id}").json()["data"]
        assert first["is_default"] is False
        assert second["is_default"] is True
