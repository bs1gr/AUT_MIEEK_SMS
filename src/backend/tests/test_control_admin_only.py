"""Backups, restore, the database's contents and the server's settings need a signed-in administrator.

The Control API lets a request from the server's own machine through when no
ADMIN_SHUTDOWN_TOKEN is set, for the PC's own tools. With SMS Lite, or a server run from source,
the browser is on that machine as well, so anyone at the PC could list, make, download and
restore backups, or empty the database, signed in as a teacher or not at all. The owner decided
on 2026-11-20 (plan todo 58) that these need an administrator's sign-in wherever the request
comes from; the same day, the sign-in settings, the import of database credentials and an
update's install joined them. The test client counts as the same machine here, as it does for
the rule itself.
"""

from __future__ import annotations

import pytest

# Every address of the family, with a request that reaches its access check.
GUARDED = [
    ("get", "/control/api/operations/database-backups"),
    ("post", "/control/api/operations/database-backup"),
    ("get", "/control/api/operations/database-backups/x.db/download"),
    ("get", "/control/api/operations/database-backups/archive.zip"),
    ("post", "/control/api/operations/database-backups/delete-selected"),
    ("post", "/control/api/operations/database-restore?backup_filename=x.db"),
    ("post", "/control/api/operations/database-upload"),
    ("get", "/control/api/database/backups"),
    ("post", "/control/api/database/instances/default/backup"),
    ("get", "/control/api/database/backups/x.sql/download"),
    ("delete", "/control/api/database/backups/x.sql"),
    ("post", "/control/api/database/backups/x.sql/restore"),
    ("get", "/api/v1/admin/list-encrypted-backups"),
    ("post", "/api/v1/admin/reset-database"),
    ("post", "/api/v1/admin/sample-data"),
    ("get", "/control/api/maintenance/auth-settings"),
    ("post", "/control/api/maintenance/auth-settings"),
    ("post", "/control/api/database/import-credentials"),
    ("post", "/control/api/maintenance/updates/auto-install"),
    ("get", "/control/api/maintenance/updates/auto-install/x/status"),
]


def _call(client, method, path, headers=None):
    return getattr(client, method)(path, headers=headers or {})


@pytest.mark.parametrize(("method", "path"), GUARDED)
def test_nobody_signed_in_is_refused_on_the_same_machine(client, method, path):
    response = _call(client, method, path)
    assert response.status_code == 403, response.text


@pytest.mark.parametrize(("method", "path"), GUARDED)
def test_a_teacher_is_refused_on_the_same_machine(client, teacher_token, method, path):
    response = _call(client, method, path, {"Authorization": f"Bearer {teacher_token}"})
    assert response.status_code == 403, response.text


def test_an_administrator_lists_the_backups(client, control_admin_headers):
    response = client.get("/control/api/operations/database-backups", headers=control_admin_headers)
    assert response.status_code == 200, response.text
    assert "backups" in response.json()


def test_the_operator_token_still_opens_them(client, monkeypatch):
    monkeypatch.setenv("ADMIN_SHUTDOWN_TOKEN", "operator-secret")
    assert client.get("/control/api/operations/database-backups").status_code == 403
    response = client.get("/control/api/operations/database-backups", headers={"X-ADMIN-TOKEN": "operator-secret"})
    assert response.status_code == 200, response.text


def test_the_rest_of_the_control_api_still_trusts_the_machine(client):
    # Start, stop, restart and the status keep the same-machine rule the PC's tools rely on.
    assert client.get("/control/api/status").status_code == 200
