"""The audit log says who made a change, and has a line for every change of a role, a
permission or an account.

Two things were missing (the owner, 18 November 2026: "Fix: the audit log does not say who
changed a role"):

1. *The author.* ``AuditLogger.log_from_request`` names the author from
   ``request.state.current_user``, which nothing ever set: every entry written that way had an
   empty ``user_id`` and ``user_email``. A role change said which account it was about and
   not who made it.
2. *The entry itself.* Only the requests under ``/admin/rbac`` wrote one. What User Accounts
   does (create an account, change its role, deactivate it, delete it, reset its password)
   and what the Permissions Catalog does (grant and revoke for a role or an account) left no
   line at all, so the usual way of making somebody an administrator was not in the log.
"""

# The fixture `school` is imported and then named as an argument of every test.
# ruff: noqa: F811

from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_account_role_leftovers import (  # noqa: F401
    PASSWORD,
    Headers,
    _create,
    _session,
    _sign_in,
    rbac_client,
    school,
)

HEAD = "head@example.com"


def _entries(client: TestClient, admin: Headers, **filters: Any) -> list[dict]:
    answer = client.get("/api/v1/audit/logs", params={"page_size": 200, **filters}, headers=admin)
    assert answer.status_code == 200, answer.text
    return answer.json()["logs"]


def _last(client: TestClient, admin: Headers, operation: str) -> dict:
    found = [entry for entry in _entries(client, admin) if (entry.get("details") or {}).get("operation") == operation]
    assert found, f"no audit entry for {operation}: {[e.get('details') for e in _entries(client, admin)]}"
    return found[0]  # newest first


def _head_id(client: TestClient, admin: Headers) -> int:
    accounts = client.get("/api/v1/admin/users", headers=admin).json()
    return next(account["id"] for account in accounts if account["email"] == HEAD)


# --- the author ----------------------------------------------------------------------------------


def test_a_role_given_under_assign_role_names_the_administrator_who_gave_it(school):
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")

    given = client.post(
        "/api/v1/admin/rbac/assign-role", json={"user_id": teacher_id, "role_name": "admin"}, headers=admin
    )
    assert given.status_code == 200, given.text

    entry = next(e for e in _entries(client, admin, action="role_change") if e["resource_id"] == str(teacher_id))
    # It used to be None and None.
    assert (entry["user_id"], entry["user_email"]) == (_head_id(client, admin), HEAD)
    assert entry["details"]["role"] == "admin"


def test_each_administrator_is_named_for_what_that_one_did(school):
    client, admin = school
    second_id = _create(client, admin, "second@example.com", "admin")
    second = _sign_in(client, "second@example.com")
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")

    client.post("/api/v1/admin/rbac/revoke-role", json={"user_id": teacher_id, "role_name": "teacher"}, headers=second)
    client.post("/api/v1/admin/rbac/assign-role", json={"user_id": teacher_id, "role_name": "teacher"}, headers=admin)

    about_the_teacher = [
        e for e in _entries(client, admin, action="role_change") if e["resource_id"] == str(teacher_id)
    ]
    authors = {e["details"]["operation"]: e["user_email"] for e in about_the_teacher}
    assert authors["revoke_role"] == "second@example.com"
    assert authors["assign_role"] == HEAD
    # And the log can be asked for what one account did.
    by_second = _entries(client, admin, user_id=second_id)
    assert by_second and {e["user_email"] for e in by_second} == {"second@example.com"}


def test_the_author_is_kept_when_the_endpoint_commits_before_it_writes_the_entry(school):
    # The entry is written after the change is committed, when the account object the request
    # was resolved with may no longer be readable: what is noted is its number and address.
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")

    for _ in range(3):
        client.post(
            "/api/v1/admin/rbac/revoke-role", json={"user_id": teacher_id, "role_name": "teacher"}, headers=admin
        )
        client.post(
            "/api/v1/admin/rbac/assign-role", json={"user_id": teacher_id, "role_name": "teacher"}, headers=admin
        )

    changes = [e for e in _entries(client, admin, action="role_change") if e["resource_id"] == str(teacher_id)]
    assert len(changes) >= 6
    assert {e["user_email"] for e in changes} == {HEAD}


def test_a_request_without_a_sign_in_names_nobody(rbac_client: TestClient):  # noqa: F811
    # Registration is open to somebody who has no account yet: nobody to name, and no error.
    registered = rbac_client.post(
        "/api/v1/auth/register", json={"email": "applicant@example.com", "password": PASSWORD}
    )

    assert registered.status_code == 200, registered.text


# --- User Accounts ---------------------------------------------------------------------------------


def test_creating_an_account_is_in_the_log(school):
    client, admin = school

    new_id = _create(client, admin, "new@example.com", "teacher")

    entry = _last(client, admin, "create_account")
    assert (entry["action"], entry["resource"], entry["resource_id"]) == ("create", "user", str(new_id))
    assert entry["user_email"] == HEAD
    assert entry["details"] == {"operation": "create_account", "email": "new@example.com", "role": "teacher"}


def test_a_role_changed_from_edit_is_in_the_log_with_what_it_was(school):
    client, admin = school
    account = _create(client, admin, "promoted@example.com", "teacher")

    changed = client.patch(f"/api/v1/admin/users/{account}", json={"role": "admin"}, headers=admin)
    assert changed.status_code == 200, changed.text

    entry = _last(client, admin, "set_role")
    assert (entry["action"], entry["resource_id"], entry["user_email"]) == ("role_change", str(account), HEAD)
    assert entry["details"] == {"operation": "set_role", "email": "promoted@example.com", "from": "teacher", "role": "admin"}


def test_edit_saved_with_nothing_changed_writes_nothing(school):
    client, admin = school
    account = _create(client, admin, "same@example.com", "teacher")
    before = len(_entries(client, admin))

    for body in ({"full_name": "Same Name"}, {"role": "teacher"}, {"is_active": True}):
        assert client.patch(f"/api/v1/admin/users/{account}", json=body, headers=admin).status_code == 200

    assert len(_entries(client, admin)) == before


def test_no_role_from_edit_is_a_role_change(school):
    client, admin = school
    account = _create(client, admin, "former@example.com", "teacher")

    client.patch(f"/api/v1/admin/users/{account}", json={"role": "none"}, headers=admin)

    entry = _last(client, admin, "set_role")
    assert (entry["details"]["from"], entry["details"]["role"]) == ("teacher", "none")


def test_deactivating_and_activating_an_account_are_in_the_log(school):
    client, admin = school
    account = _create(client, admin, "paused@example.com", "teacher")

    client.patch(f"/api/v1/admin/users/{account}", json={"is_active": False}, headers=admin)
    client.patch(f"/api/v1/admin/users/{account}", json={"is_active": True}, headers=admin)

    assert _last(client, admin, "deactivate_account")["resource_id"] == str(account)
    activated = _last(client, admin, "activate_account")
    assert (activated["action"], activated["user_email"]) == ("update", HEAD)


def test_a_deleted_account_stays_in_the_log_by_its_address(school):
    client, admin = school
    account = _create(client, admin, "leaving@example.com", "teacher")

    assert client.delete(f"/api/v1/admin/users/{account}", headers=admin).status_code == 204

    entry = _last(client, admin, "delete_account")
    assert (entry["action"], entry["resource_id"], entry["user_email"]) == ("delete", str(account), HEAD)
    assert entry["details"] == {"operation": "delete_account", "email": "leaving@example.com", "role": "teacher"}


def test_a_password_reset_is_in_the_log_and_the_password_is_not(school):
    client, admin = school
    account = _create(client, admin, "forgot@example.com", "teacher")
    secret = "Reset#Passw0rd-2026"

    reset = client.post(
        f"/api/v1/admin/users/{account}/reset-password", json={"new_password": secret}, headers=admin
    )
    assert reset.status_code == 200, reset.text

    entry = _last(client, admin, "reset_password")
    assert (entry["action"], entry["resource_id"], entry["user_email"]) == ("password_change", str(account), HEAD)
    assert secret not in str(_entries(client, admin))


def test_an_accounts_own_new_password_is_in_the_log_under_its_own_name(school):
    client, admin = school
    account = _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    new_password = "Chosen#Passw0rd-2026"

    changed = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": PASSWORD, "new_password": new_password},
        headers=teacher,
    )
    assert changed.status_code == 200, changed.text

    entry = _last(client, admin, "change_own_password")
    assert (entry["resource_id"], entry["user_id"], entry["user_email"]) == (str(account), account, "teacher@example.com")
    assert new_password not in str(_entries(client, admin)) and PASSWORD not in str(_entries(client, admin))


# --- the Permissions Catalog -----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("address", "body", "action", "operation"),
    [
        ("roles/grant", {"role_name": "teacher", "permission_key": "audit:view"}, "permission_grant", "grant_permission"),
        ("roles/revoke", {"role_name": "teacher", "permission_key": "students:delete"}, "permission_revoke", "revoke_permission"),
    ],
)
def test_a_grant_or_a_revoke_for_a_role_is_in_the_log(school, address, body, action, operation):
    client, admin = school

    done = client.post(f"/api/v1/permissions/{address}", json=body, headers=admin)
    assert done.status_code == 200, done.text

    entry = _last(client, admin, operation)
    assert (entry["action"], entry["user_email"]) == (action, HEAD)
    assert entry["details"] == {"operation": operation, "role": "teacher", "permission": body["permission_key"]}


def test_a_grant_and_a_revoke_for_one_account_are_in_the_log(school):
    client, admin = school
    account = _create(client, admin, "teacher@example.com", "teacher")
    grant = {"user_id": account, "permission_key": "audit:view"}

    assert client.post("/api/v1/permissions/users/grant", json=grant, headers=admin).status_code == 200
    assert client.post("/api/v1/permissions/users/revoke", json=grant, headers=admin).status_code == 200

    granted = _last(client, admin, "grant_to_account")
    revoked = _last(client, admin, "revoke_from_account")
    assert (granted["action"], granted["resource_id"], granted["user_email"]) == ("permission_grant", str(account), HEAD)
    assert granted["details"]["permission"] == "audit:view"
    assert (revoked["action"], revoked["resource_id"], revoked["user_email"]) == ("permission_revoke", str(account), HEAD)


def test_a_grant_that_was_there_already_writes_nothing(school):
    client, admin = school
    grant = {"role_name": "teacher", "permission_key": "students:view"}
    before = len(_entries(client, admin))

    again = client.post("/api/v1/permissions/roles/grant", json=grant, headers=admin)

    assert again.json()["status"] == "already_granted"
    assert len(_entries(client, admin)) == before


def test_a_refused_change_writes_nothing(school):
    client, admin = school
    _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    before = len(_entries(client, admin))

    refused = [
        client.post("/api/v1/admin/rbac/assign-role", json={"user_id": 1, "role_name": "admin"}, headers=teacher),
        client.patch("/api/v1/admin/users/1", json={"role": "none"}, headers=teacher),
        client.post(
            "/api/v1/permissions/roles/grant", json={"role_name": "teacher", "permission_key": "*:*"}, headers=teacher
        ),
    ]

    assert [answer.status_code for answer in refused] == [403, 403, 403]
    assert len(_entries(client, admin)) == before


def test_the_time_of_an_entry_is_sent_with_its_zone(school):
    """The time is stored in UTC, and SQLite hands it back without saying so. A browser reads a
    time without a zone as its own local time: the page showed an entry two hours early."""
    from datetime import datetime, timedelta, timezone

    client, admin = school
    _create(client, admin, "new@example.com", "teacher")

    stamp = _last(client, admin, "create_account")["timestamp"]

    assert stamp.endswith("Z") or stamp.endswith("+00:00"), stamp
    written = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    assert abs(datetime.now(timezone.utc) - written) < timedelta(minutes=2)
    history = client.get("/api/v1/admin/rbac/change-history", headers=admin).json()["logs"]
    assert all(e["timestamp"].endswith(("Z", "+00:00")) for e in history)


def test_a_teacher_cannot_read_the_log(school):
    client, admin = school
    _create(client, admin, "teacher@example.com", "teacher")

    assert client.get("/api/v1/audit/logs", headers=_sign_in(client, "teacher@example.com")).status_code == 403
