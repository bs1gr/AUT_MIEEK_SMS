"""What an account keeps when its role is taken away, and what is left when it is deleted.

Two ways an account held access that the list of accounts said it did not have. Both were
found on 17 November 2026, while the permission documents were being checked against a
running copy.

1. ``PATCH /admin/users/{id}`` with the role "student" changed the word in the account's Role
   column and left its rows in ``user_roles`` alone ("student" has no row in ``roles``, and the
   code returned early for a role without one). A former teacher went on reading and changing
   every record; a former administrator kept ``*:*``.

2. ``DELETE /admin/users/{id}`` left the account's rows in ``user_roles``, ``user_permissions``,
   ``notifications`` and the other tables that point at an account. PostgreSQL removes them
   through the foreign keys. SQLite does not (the application runs it without foreign-key
   enforcement) and hands the next account the number of the last one deleted: an account
   created as a student after an administrator was deleted was an administrator to the server.

A database may still hold what an account deleted by an earlier version left behind, so the
same rows are cleared under a new account's number when the account is created.

Since 18 November 2026 "student" is not a role an account can have. The word that takes every
role away is "none" ("No role" in User Accounts), and an account is created as an
administrator or as a teacher. The first defect is tested with that word.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_rbac_enforcement import _login, _register_user, rbac_client  # noqa: F401

PASSWORD = "Str0ngPass!123"  # pragma: allowlist secret
Headers = dict[str, str]


def _session(client: TestClient) -> Any:
    from backend.db import get_session as db_get_session

    return next(client.app.dependency_overrides[db_get_session]())  # type: ignore[attr-defined]


@pytest.fixture()
def school(rbac_client: TestClient) -> tuple[TestClient, Headers]:  # noqa: F811
    """The roles and permissions of a new installation, and an administrator who is signed in."""
    from backend.routers.routers_rbac import _seed_defaults

    client = rbac_client
    _register_user(client, "head@example.com", PASSWORD, role="admin")
    with _session(client) as db:
        _seed_defaults(db)  # also gives the administrator its role row
    return client, _sign_in(client, "head@example.com")


def _sign_in(client: TestClient, email: str) -> Headers:
    return {"Authorization": f"Bearer {_login(client, email, PASSWORD)}"}


def _create(client: TestClient, admin: Headers, email: str, role: str) -> int:
    created = client.post(
        "/api/v1/admin/users", json={"email": email, "password": PASSWORD, "role": role}, headers=admin
    )
    assert created.status_code == 201, created.text
    return int(created.json()["id"])


def _set_role(client: TestClient, admin: Headers, user_id: int, role: str) -> None:
    changed = client.patch(f"/api/v1/admin/users/{user_id}", json={"role": role}, headers=admin)
    assert changed.status_code == 200, changed.text
    assert changed.json()["role"] == role


def _roles(client: TestClient, user_id: int) -> set[str]:
    from backend import models

    with _session(client) as db:
        rows = (
            db.query(models.Role.name)
            .join(models.UserRole, models.UserRole.role_id == models.Role.id)
            .filter(models.UserRole.user_id == user_id)
            .all()
        )
        return {name for (name,) in rows}


def _rows_pointing_at(client: TestClient, user_id: int) -> dict[str, int]:
    """How many rows each table still holds for that account number."""
    from backend import models

    counts: dict[str, int] = {}
    with _session(client) as db:
        for model in (
            models.UserRole,
            models.UserPermission,
            models.Notification,
            models.NotificationPreference,
            models.SavedSearch,
            models.CustomDashboard,
        ):
            counts[model.__tablename__] = db.query(model).filter(model.user_id == user_id).count()
    return counts


def _status(client: TestClient, method: str, path: str, headers: Headers) -> int:
    return client.request(method, f"/api/v1{path}", headers=headers).status_code


# --- "No role" -----------------------------------------------------------------------------------


def test_a_teacher_changed_to_no_role_loses_the_teachers_access(school):
    client, admin = school
    user_id = _create(client, admin, "was.teacher@example.com", "teacher")
    account = _sign_in(client, "was.teacher@example.com")
    assert _roles(client, user_id) == {"teacher"}
    assert _status(client, "GET", "/students/", account) == 200

    _set_role(client, admin, user_id, "none")

    assert _roles(client, user_id) == set()
    # The same sign-in: a permission is looked up at every request.
    assert _status(client, "GET", "/students/", account) == 403
    assert _status(client, "GET", "/grades/", account) == 403
    assert _status(client, "GET", "/export/students/csv", account) == 403
    # ... and a new one.
    assert _status(client, "GET", "/students/", _sign_in(client, "was.teacher@example.com")) == 403


def test_an_administrator_changed_to_no_role_loses_every_permission(school):
    client, admin = school
    user_id = _create(client, admin, "was.admin@example.com", "admin")
    account = _sign_in(client, "was.admin@example.com")
    assert _roles(client, user_id) == {"admin"}
    assert _status(client, "GET", "/admin/users", account) == 200

    _set_role(client, admin, user_id, "none")

    assert _roles(client, user_id) == set()
    assert _status(client, "GET", "/admin/users", account) == 403
    assert _status(client, "GET", "/students/", account) == 403


def test_an_account_made_teacher_again_has_the_teachers_access_again(school):
    client, admin = school
    user_id = _create(client, admin, "back@example.com", "teacher")
    account = _sign_in(client, "back@example.com")
    _set_role(client, admin, user_id, "none")
    assert _status(client, "GET", "/students/", account) == 403

    _set_role(client, admin, user_id, "teacher")

    assert _roles(client, user_id) == {"teacher"}
    assert _status(client, "GET", "/students/", account) == 200


def test_a_change_between_administrator_and_teacher_still_swaps_the_role(school):
    client, admin = school
    user_id = _create(client, admin, "moves@example.com", "teacher")

    _set_role(client, admin, user_id, "admin")
    assert _roles(client, user_id) == {"admin"}

    _set_role(client, admin, user_id, "teacher")
    assert _roles(client, user_id) == {"teacher"}


def test_a_role_that_is_not_one_of_the_two_is_left_alone(school):
    # Only the two standard roles are tied to the Role column. One made through the API stays.
    from backend import models

    client, admin = school
    user_id = _create(client, admin, "librarian@example.com", "teacher")
    with _session(client) as db:
        role = models.Role(name="librarian", description="Made through the API")
        db.add(role)
        db.commit()
        db.add(models.UserRole(user_id=user_id, role_id=role.id))
        db.commit()

    _set_role(client, admin, user_id, "none")

    assert _roles(client, user_id) == {"librarian"}


@pytest.mark.parametrize("word", ["student", "viewer", "guest", "staff"])
def test_an_account_cannot_be_given_a_word_that_names_no_role(school, word):
    client, admin = school
    user_id = _create(client, admin, "stays@example.com", "teacher")

    refused = client.patch(f"/api/v1/admin/users/{user_id}", json={"role": word}, headers=admin)
    made = client.post(
        "/api/v1/admin/users", json={"email": "new@example.com", "password": PASSWORD, "role": word}, headers=admin
    )

    assert (refused.status_code, made.status_code) == (422, 422), (refused.text, made.text)
    assert _roles(client, user_id) == {"teacher"}


def test_an_account_cannot_be_created_without_a_role(school):
    # "No role" takes roles away from an account that exists; a new one is made with a role.
    client, admin = school

    made = client.post(
        "/api/v1/admin/users", json={"email": "new@example.com", "password": PASSWORD, "role": "none"}, headers=admin
    )

    assert made.status_code == 422, made.text


# --- a deleted account ---------------------------------------------------------------------------


def _give_the_account_things_of_its_own(client: TestClient, admin: Headers, user_id: int, account: Headers) -> None:
    from backend import models

    granted = client.post(
        "/api/v1/permissions/users/grant", json={"user_id": user_id, "permission_key": "audit:view"}, headers=admin
    )
    assert granted.status_code == 200, granted.text
    sent = client.post(
        "/api/v1/notifications/broadcast",
        json={"notification_type": "announcement", "title": "For the old account", "message": "Private."},
        headers=admin,
    )
    assert sent.status_code == 200, sent.text
    saved = client.put("/api/v1/notifications/preferences", json={"in_app_enabled": True}, headers=account)
    assert saved.status_code == 200, saved.text
    with _session(client) as db:
        db.add(models.SavedSearch(user_id=user_id, name="Mine", search_type="students", query="a", filters={}))
        db.add(models.CustomDashboard(user_id=user_id, name="Mine", configuration={}))
        db.commit()


def test_a_deleted_account_leaves_no_role_no_grant_and_nothing_of_its_own_behind(school):
    client, admin = school
    user_id = _create(client, admin, "leaving@example.com", "admin")
    account = _sign_in(client, "leaving@example.com")
    _give_the_account_things_of_its_own(client, admin, user_id, account)
    before = _rows_pointing_at(client, user_id)
    assert all(count >= 1 for count in before.values()), before

    deleted = client.delete(f"/api/v1/admin/users/{user_id}", headers=admin)

    assert deleted.status_code == 204, deleted.text
    assert _rows_pointing_at(client, user_id) == dict.fromkeys(before, 0)


def test_the_next_account_does_not_inherit_what_the_deleted_one_had(school):
    client, admin = school
    old_id = _create(client, admin, "leaving@example.com", "admin")
    _give_the_account_things_of_its_own(client, admin, old_id, _sign_in(client, "leaving@example.com"))
    assert client.delete(f"/api/v1/admin/users/{old_id}", headers=admin).status_code == 204

    new_id = _create(client, admin, "new.teacher@example.com", "teacher")
    newcomer = _sign_in(client, "new.teacher@example.com")

    # SQLite hands out the number that was freed: that is the case this test is about.
    assert new_id == old_id
    assert _roles(client, new_id) == {"teacher"}
    assert _status(client, "GET", "/admin/users", newcomer) == 403
    assert _status(client, "GET", "/audit/logs", newcomer) == 403
    assert _status(client, "GET", "/students/", newcomer) == 200
    notifications = client.get("/api/v1/notifications/", headers=newcomer)
    assert notifications.status_code == 200, notifications.text
    body = notifications.json()
    assert (body.get("items", body) if isinstance(body, dict) else body) == []


def test_what_another_account_was_given_by_the_deleted_one_stays_without_its_name(school):
    # ``granted_by`` is SET NULL: the grant is the other account's, only its author is gone.
    from backend import models

    client, admin = school
    granter_id = _create(client, admin, "granter@example.com", "admin")
    granter = _sign_in(client, "granter@example.com")
    teacher_id = _create(client, admin, "kept@example.com", "teacher")
    granted = client.post(
        "/api/v1/permissions/users/grant", json={"user_id": teacher_id, "permission_key": "audit:view"}, headers=granter
    )
    assert granted.status_code == 200, granted.text
    with _session(client) as db:
        assert db.query(models.UserPermission).filter_by(user_id=teacher_id).one().granted_by == granter_id

    assert client.delete(f"/api/v1/admin/users/{granter_id}", headers=admin).status_code == 204

    with _session(client) as db:
        assert db.query(models.UserPermission).filter_by(user_id=teacher_id).one().granted_by is None
    assert _status(client, "GET", "/audit/logs", _sign_in(client, "kept@example.com")) == 200


# --- what an earlier version left behind -------------------------------------------------------


def _next_account_number(client: TestClient) -> int:
    from sqlalchemy import func

    from backend import models

    with _session(client) as db:
        return int(db.query(func.max(models.User.id)).scalar() or 0) + 1


def _leave_rows_behind_under(client: TestClient, user_id: int) -> None:
    """What a deletion by an earlier version left on SQLite: rows of an account that is gone."""
    from backend import models

    with _session(client) as db:
        admin_role = db.query(models.Role).filter_by(name="admin").one()
        permission = db.query(models.Permission).filter_by(key="audit:view").one()
        db.add(models.UserRole(user_id=user_id, role_id=admin_role.id))
        db.add(models.UserPermission(user_id=user_id, permission_id=permission.id))
        db.add(
            models.Notification(
                user_id=user_id, notification_type="announcement", title="For the old account", message="Private."
            )
        )
        db.commit()


def test_an_account_made_by_an_administrator_gets_nothing_that_was_left_under_its_number(school):
    client, admin = school
    number = _next_account_number(client)
    _leave_rows_behind_under(client, number)

    new_id = _create(client, admin, "fresh@example.com", "teacher")
    newcomer = _sign_in(client, "fresh@example.com")

    assert new_id == number
    assert _roles(client, new_id) == {"teacher"}
    counts = _rows_pointing_at(client, new_id)
    assert (counts["user_roles"], counts["user_permissions"], counts["notifications"]) == (1, 0, 0), counts
    assert _status(client, "GET", "/admin/users", newcomer) == 403
    assert _status(client, "GET", "/audit/logs", newcomer) == 403


def test_an_account_that_registers_itself_gets_the_teacher_role_and_nothing_else(school):
    from backend import models

    client, _admin = school
    number = _next_account_number(client)
    _leave_rows_behind_under(client, number)

    _register_user(client, "applicant@example.com", PASSWORD)

    with _session(client) as db:
        assert db.query(models.User).filter_by(email="applicant@example.com").one().id == number
    assert _roles(client, number) == {"teacher"}
    counts = _rows_pointing_at(client, number)
    assert (counts["user_permissions"], counts["notifications"]) == (0, 0), counts
