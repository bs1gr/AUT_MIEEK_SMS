"""password_change_required is enforced by the server, not just a UI prompt.

SMS_Lite (and older templates) bootstrap an admin with a password that is
published in this public repository, and Lite listens on the LAN. The
"change your password" modal used to be the only barrier: the API accepted the
default password for everything. Now a flagged user may only see their
profile, change the password, refresh and log out.
"""

from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_rbac_enforcement import _login, _register_user, build_app_with_auth_enabled

LITE_DEFAULT = "AdminPassword123!"  # published: lite_simple_entrypoint.py
NEW_PASSWORD = "N3w-Unique!Passw0rd"


@pytest.fixture()
def strict_client() -> Generator[TestClient, None, None]:
    import backend.config as config
    from backend import models
    from backend.db import get_session as db_get_session

    app, client = build_app_with_auth_enabled()
    config.settings.AUTH_MODE = "strict"
    with next(app.dependency_overrides[db_get_session]()) as db:  # type: ignore[index]
        models.Base.metadata.drop_all(bind=db.get_bind())
        models.Base.metadata.create_all(bind=db.get_bind())
    yield client


def _set_flag(client: TestClient, email: str, value: bool) -> None:
    from backend import models
    from backend.db import get_session as db_get_session

    with next(client.app.dependency_overrides[db_get_session]()) as db:  # type: ignore[attr-defined]
        user = db.query(models.User).filter(models.User.email == email).one()
        user.password_change_required = value
        db.commit()


def _flag(client: TestClient, email: str) -> bool:
    from backend import models
    from backend.db import get_session as db_get_session

    with next(client.app.dependency_overrides[db_get_session]()) as db:  # type: ignore[attr-defined]
        return bool(db.query(models.User).filter(models.User.email == email).one().password_change_required)


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_flagged_user_can_only_change_password(strict_client: TestClient):
    _register_user(strict_client, "flagged@example.com", "Initial-Pass1!", role="admin")
    _set_flag(strict_client, "flagged@example.com", True)
    token = _login(strict_client, "flagged@example.com", "Initial-Pass1!")

    blocked = strict_client.get("/api/v1/attendance/", headers=_auth(token))
    assert blocked.status_code == 403, blocked.text
    assert "AUTH_PASSWORD_CHANGE_REQUIRED" in blocked.text

    me = strict_client.get("/api/v1/auth/me", headers=_auth(token))
    assert me.status_code == 200, me.text
    profile = me.json().get("data", me.json())  # response envelope, when the middleware wraps it
    assert profile.get("password_change_required") is True, me.json()

    changed = strict_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Initial-Pass1!", "new_password": NEW_PASSWORD},
        headers=_auth(token),
    )
    assert changed.status_code == 200, changed.text
    new_token = changed.json()["access_token"]

    assert strict_client.get("/api/v1/attendance/", headers=_auth(new_token)).status_code == 200


def test_login_with_published_default_password_forces_change(strict_client: TestClient):
    """Covers existing SMS_Lite installs whose admin never changed the public default."""
    _register_user(strict_client, "admin@sms-lite.app", LITE_DEFAULT, role="admin")
    assert _flag(strict_client, "admin@sms-lite.app") is False  # e.g. an old install

    token = _login(strict_client, "admin@sms-lite.app", LITE_DEFAULT)

    assert _flag(strict_client, "admin@sms-lite.app") is True
    assert strict_client.get("/api/v1/attendance/", headers=_auth(token)).status_code == 403


def test_published_default_cannot_be_chosen_as_new_password(strict_client: TestClient):
    _register_user(strict_client, "owner@example.com", "Initial-Pass1!", role="admin")
    token = _login(strict_client, "owner@example.com", "Initial-Pass1!")

    r = strict_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Initial-Pass1!", "new_password": LITE_DEFAULT},
        headers=_auth(token),
    )
    assert r.status_code == 400, r.text
    assert "publicly known" in r.text


def test_ordinary_login_is_not_flagged(strict_client: TestClient):
    _register_user(strict_client, "normal@example.com", "Initial-Pass1!", role="admin")
    token = _login(strict_client, "normal@example.com", "Initial-Pass1!")
    assert _flag(strict_client, "normal@example.com") is False
    assert strict_client.get("/api/v1/attendance/", headers=_auth(token)).status_code == 200


def test_control_api_bearer_requires_db_admin_without_pending_change(monkeypatch, strict_client: TestClient):
    """The Control API trusted the token's role claim; it must check the live user."""
    from types import SimpleNamespace

    import backend.control_auth as control_auth
    from backend.db import get_session as db_get_session

    _register_user(strict_client, "ctl@example.com", "Initial-Pass1!", role="admin")
    token = _login(strict_client, "ctl@example.com", "Initial-Pass1!")

    session_gen = strict_client.app.dependency_overrides[db_get_session]  # type: ignore[attr-defined]

    class _Session:
        def __enter__(self):
            self._gen = session_gen()
            return next(self._gen)

        def __exit__(self, *exc):
            self._gen.close()

    monkeypatch.setattr(control_auth, "SessionLocal", _Session)
    request = SimpleNamespace(headers={"Authorization": f"Bearer {token}"})

    assert control_auth._admin_from_bearer(request) is True

    _set_flag(strict_client, "ctl@example.com", True)
    assert control_auth._admin_from_bearer(request) is False  # same token, now refused

    _set_flag(strict_client, "ctl@example.com", False)
    from backend import models

    with _Session() as db:
        db.query(models.User).filter(models.User.email == "ctl@example.com").update({"is_active": False})
        db.commit()
    assert control_auth._admin_from_bearer(request) is False  # deactivated: role claim no longer enough
