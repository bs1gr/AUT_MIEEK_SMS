"""The requests behind the role boxes of the Permissions Catalog.

Control Panel > Maintenance > RBAC Configuration > Permissions Catalog offers "Grant To: Role"
and "Revoke: Role". Until 18 November 2026 both role boxes were empty, because the page asked
for the roles at an address the server does not have, so nobody could send these requests
from the page. Now that the page can, three things have to hold:

- the address the page reads the roles from exists and names the roles;
- a permission granted to a role opens what it names for the accounts of that role, and
  revoking it closes it again;
- ``*:*`` cannot be taken from the role ``admin``. ``POST /admin/rbac/revoke-permission`` has
  always refused that; ``POST /permissions/roles/revoke``, the request this page sends, did
  not, and after it no administrator could open the account or the role panels until a
  restart seeded the grant again.

The same day showed more requests with that effect, none of them sent by a page: switching
the permission ``*:*`` off, deleting it (two addresses) and renaming it. After the first of
them a restart did not help either (the check at start looked for the grant and not at
whether the permission was on), which left an installation with no way back short of editing
the database. They are refused now, and the check at start repairs a database that is
already in that state.

Renaming or deleting the role ``admin`` locked nobody out that day: an administrator without
the role was given a list the code kept for the word "admin". That list went the same day
(an account may do what its rows say), and with it gone the two requests would have left
every administrator with nothing, "Initialize RBAC Defaults" included, and a restart would
not have helped. The two standard roles, ``admin`` and ``teacher``, can now be neither renamed
nor deleted, and a start puts a missing one back.
"""

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_account_role_leftovers import (  # noqa: F401
    Headers,
    _create,
    _session,
    _sign_in,
    rbac_client,
    school,
)


def _ids(client: TestClient, admin: Headers) -> tuple[int, int]:
    """The numbers of the permission ``*:*`` and of the role ``admin``."""
    summary = client.get("/api/v1/admin/rbac/summary", headers=admin).json()
    wildcard = next(p["id"] for p in summary["permissions"] if p["key"] == "*:*")
    admin_role = next(r["id"] for r in summary["roles"] if r["name"] == "admin")
    return wildcard, admin_role


def _is_an_administrator(client: TestClient, admin: Headers) -> bool:
    """The account panel and the role panel answer: what a locked-out administrator loses."""
    answers = [
        client.get("/api/v1/admin/users", headers=admin).status_code,
        client.get("/api/v1/admin/rbac/summary", headers=admin).status_code,
    ]
    assert set(answers) <= {200, 403}, answers
    return answers == [200, 200]


def test_the_page_can_read_the_roles(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school

    answer = client.get("/api/v1/admin/rbac/roles", headers=admin)

    assert answer.status_code == 200, answer.text
    assert {role["name"] for role in answer.json()} == {"admin", "teacher"}
    # The address the page used to ask. If it ever starts to exist, the page has two to choose from.
    assert client.get("/api/v1/rbac/roles", headers=admin).status_code == 404


def test_a_permission_granted_to_a_role_opens_what_it_names_until_it_is_revoked(
    school: tuple[TestClient, Headers],  # noqa: F811
) -> None:
    client, admin = school
    _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    grant = {"role_name": "teacher", "permission_key": "audit:view"}
    assert client.get("/api/v1/audit/logs", headers=teacher).status_code == 403

    granted = client.post("/api/v1/permissions/roles/grant", json=grant, headers=admin)
    assert granted.status_code == 200, granted.text
    assert granted.json()["status"] == "granted"
    assert client.get("/api/v1/audit/logs", headers=teacher).status_code == 200
    again = client.post("/api/v1/permissions/roles/grant", json=grant, headers=admin)
    assert again.json()["status"] == "already_granted"

    revoked = client.post("/api/v1/permissions/roles/revoke", json=grant, headers=admin)
    assert revoked.status_code == 200, revoked.text
    assert client.get("/api/v1/audit/logs", headers=teacher).status_code == 403
    # Nothing left to revoke: the page is told so and does not report a success.
    assert client.post("/api/v1/permissions/roles/revoke", json=grant, headers=admin).status_code == 404


def test_the_admin_role_keeps_its_wildcard(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school

    refused = client.post(
        "/api/v1/permissions/roles/revoke", json={"role_name": "admin", "permission_key": "*:*"}, headers=admin
    )

    assert refused.status_code == 400, refused.text
    assert "admin" in refused.text
    # The administrator is still one: the account panel and the role panel answer.
    assert client.get("/api/v1/admin/users", headers=admin).status_code == 200
    assert client.get("/api/v1/admin/rbac/summary", headers=admin).status_code == 200
    # A teacher cannot send either request.
    _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    for address in ("grant", "revoke"):
        answer = client.post(
            f"/api/v1/permissions/roles/{address}",
            json={"role_name": "teacher", "permission_key": "audit:view"},
            headers=teacher,
        )
        assert answer.status_code == 403, answer.text


@pytest.mark.parametrize(
    ("request_of", "why"),
    [
        (
            lambda c, a, wildcard: c.patch(f"/api/v1/permissions/{wildcard}", json={"is_active": False}, headers=a),
            "deactivated",
        ),
        (lambda c, a, wildcard: c.delete(f"/api/v1/permissions/{wildcard}", headers=a), "deleted"),
        (lambda c, a, wildcard: c.delete(f"/api/v1/admin/rbac/permissions/{wildcard}", headers=a), "deleted"),
        (
            lambda c, a, wildcard: c.put(
                f"/api/v1/admin/rbac/permissions/{wildcard}", json={"key": "all:all"}, headers=a
            ),
            "renamed",
        ),
    ],
    ids=["switch-off", "delete", "delete-rbac", "rename"],
)
def test_no_request_takes_the_wildcard_itself_away(
    school: tuple[TestClient, Headers],  # noqa: F811
    request_of,
    why: str,
) -> None:
    client, admin = school
    wildcard, _ = _ids(client, admin)

    refused = request_of(client, admin, wildcard)

    assert refused.status_code == 400, refused.text
    assert why in refused.text
    assert _is_an_administrator(client, admin)


def test_what_these_requests_may_still_do(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    wildcard, admin_role = _ids(client, admin)
    summary = client.get("/api/v1/admin/rbac/summary", headers=admin).json()
    audit = next(p["id"] for p in summary["permissions"] if p["key"] == "audit:view")

    # A description for the wildcard, or its own key again, changes nothing that matters.
    described = client.patch(f"/api/v1/permissions/{wildcard}", json={"description": "Everything"}, headers=admin)
    assert described.status_code == 200, described.text
    same_key = client.put(f"/api/v1/admin/rbac/permissions/{wildcard}", json={"key": "*:*"}, headers=admin)
    assert same_key.status_code == 200, same_key.text
    # Any other permission may be switched off.
    assert client.patch(f"/api/v1/permissions/{audit}", json={"is_active": False}, headers=admin).status_code == 200
    assert _is_an_administrator(client, admin)

    # A standard role may get another description, and be sent its own name again.
    described = client.put(
        f"/api/v1/admin/rbac/roles/{admin_role}", json={"name": "Admin", "description": "The head"}, headers=admin
    )
    assert described.status_code == 200, described.text
    assert described.json()["name"] == "admin"
    # A role of the installation's own may be renamed and deleted.
    made = client.post("/api/v1/admin/rbac/roles", json={"name": "librarian"}, headers=admin)
    assert made.status_code == 200, made.text
    own = made.json()["id"]
    assert client.put(f"/api/v1/admin/rbac/roles/{own}", json={"name": "archivist"}, headers=admin).status_code == 200
    assert client.delete(f"/api/v1/admin/rbac/roles/{own}", headers=admin).status_code == 200
    assert _is_an_administrator(client, admin)


@pytest.mark.parametrize("role_name", ["admin", "teacher"])
def test_the_two_standard_roles_can_be_neither_renamed_nor_deleted(
    school: tuple[TestClient, Headers],  # noqa: F811
    role_name: str,
) -> None:
    client, admin = school
    _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    summary = client.get("/api/v1/admin/rbac/summary", headers=admin).json()
    role_id = next(r["id"] for r in summary["roles"] if r["name"] == role_name)

    renamed = client.put(f"/api/v1/admin/rbac/roles/{role_id}", json={"name": "boss"}, headers=admin)
    deleted = client.delete(f"/api/v1/admin/rbac/roles/{role_id}", headers=admin)

    assert (renamed.status_code, deleted.status_code) == (400, 400), (renamed.text, deleted.text)
    assert role_name in renamed.text and role_name in deleted.text
    assert _is_an_administrator(client, admin)
    assert client.get("/api/v1/students/", headers=teacher).status_code == 200


@pytest.mark.parametrize("damage", ["deleted", "renamed"])
def test_a_start_puts_the_role_admin_back(
    school: tuple[TestClient, Headers],  # noqa: F811
    damage: str,
) -> None:
    """A database an earlier version let into this state. Deleted, no administrator holds
    anything; renamed, the ones that exist go on and one created afterwards holds nothing."""
    from backend import models
    from backend.routers.routers_rbac import ensure_defaults_startup

    client, admin = school
    with _session(client) as db:
        role = db.query(models.Role).filter(models.Role.name == "admin").one()
        if damage == "deleted":
            db.query(models.UserRole).filter(models.UserRole.role_id == role.id).delete()
            db.query(models.RolePermission).filter(models.RolePermission.role_id == role.id).delete()
            db.delete(role)
        else:
            role.name = "boss"
        db.commit()
    assert _is_an_administrator(client, admin) is (damage == "renamed")

    assert ensure_defaults_startup(lambda: _session(client)) is True

    assert _is_an_administrator(client, admin)
    _create(client, admin, "second@example.com", "admin")
    assert _is_an_administrator(client, _sign_in(client, "second@example.com"))
    assert ensure_defaults_startup(lambda: _session(client)) is False


@pytest.mark.parametrize("damage", ["switched off", "deleted", "renamed"])
def test_a_start_repairs_a_database_whose_wildcard_is_gone(
    school: tuple[TestClient, Headers],  # noqa: F811
    damage: str,
) -> None:
    """A database an earlier version let into this state: the next start puts it right."""
    from backend import models
    from backend.routers.routers_rbac import ensure_defaults_startup

    client, admin = school
    with _session(client) as db:
        wildcard = db.query(models.Permission).filter(models.Permission.key == "*:*").one()
        if damage == "switched off":
            wildcard.is_active = False
        elif damage == "renamed":
            wildcard.key = "all:all"
        else:
            db.query(models.RolePermission).filter(models.RolePermission.permission_id == wildcard.id).delete()
            db.delete(wildcard)
        db.commit()
    assert not _is_an_administrator(client, admin)

    assert ensure_defaults_startup(lambda: _session(client)) is True

    assert _is_an_administrator(client, admin)
    # And a database that is in order is left alone.
    assert ensure_defaults_startup(lambda: _session(client)) is False
