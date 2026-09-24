"""SMS_Lite must not serve the API to anonymous callers on the network.

Lite binds 0.0.0.0:8000. It used to run with the config default AUTH_MODE=permissive, in
which rbac.require_permission lets any request *without* a bearer token straight through -
students, grades, audit logs, RBAC and CSV exports were readable (and writable) from the LAN
with no login (verified against the v1.18.46 build, 2026-09-24). Lite now defaults to strict.
"""
import importlib
import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_rbac_enforcement import build_app_with_auth_enabled


def _import_lite_with_env(monkeypatch, **env):
    """(Re)import the Lite entrypoint with a controlled environment; return the env it produced."""
    for key in ("AUTH_MODE", "AUTH_ENABLED"):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    saved = dict(os.environ)
    try:
        mod = importlib.import_module("backend.lite_simple_entrypoint")
        importlib.reload(mod)
        return mod, {k: os.environ.get(k) for k in ("AUTH_MODE", "AUTH_ENABLED")}
    finally:
        os.environ.clear()
        os.environ.update(saved)


def test_lite_defaults_to_strict_auth(monkeypatch):
    _, env = _import_lite_with_env(monkeypatch)
    assert env == {"AUTH_MODE": "strict", "AUTH_ENABLED": "true"}


def test_lite_respects_an_explicit_auth_mode(monkeypatch):
    _, env = _import_lite_with_env(monkeypatch, AUTH_MODE="permissive")
    assert env["AUTH_MODE"] == "permissive"


@pytest.mark.parametrize(
    ("host", "local"),
    [
        ("127.0.0.1", True),
        ("::1", True),
        ("::ffff:127.0.0.1", True),
        ("172.16.0.15", False),
        ("100.104.165.6", False),
        ("", False),
    ],
)
def test_shutdown_endpoints_accept_only_local_callers(monkeypatch, host, local):
    mod, _ = _import_lite_with_env(monkeypatch)
    request = SimpleNamespace(client=SimpleNamespace(host=host))
    assert mod._is_local_request(request) is local


def test_no_client_is_not_local(monkeypatch):
    mod, _ = _import_lite_with_env(monkeypatch)
    assert mod._is_local_request(SimpleNamespace(client=None)) is False


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql+psycopg://sms_user:s3cr%21t@10.0.0.2:5432/sms", "postgresql+psycopg://sms_user:***@10.0.0.2:5432/sms"),
        ("sqlite:///C:/Users/x/sms_lite.db", "sqlite:///C:/Users/x/sms_lite.db"),
        ("NOT SET", "NOT SET"),
    ],
)
def test_database_url_password_is_redacted_for_debug_log(monkeypatch, url, expected):
    mod, _ = _import_lite_with_env(monkeypatch)
    assert mod._redact_url(url) == expected


@pytest.fixture()
def strict_client():
    import backend.config as config

    _, client = build_app_with_auth_enabled()
    config.settings.AUTH_MODE = "strict"  # what Lite now runs with
    return client


def test_strict_mode_rejects_anonymous_reads(strict_client: TestClient):
    assert strict_client.get("/api/v1/attendance/").status_code == 401


def test_strict_mode_rejects_valid_anonymous_writes(strict_client: TestClient):
    # A well-formed body, so a 422 can't mask the result (FastAPI validates the body before
    # the permission decorator runs; under permissive this same request reached the database).
    r = strict_client.post(
        "/api/v1/attendance/",
        json={"student_id": 1, "course_id": 1, "status": "Present", "date": "2026-09-24"},
    )
    assert r.status_code == 401, r.text
