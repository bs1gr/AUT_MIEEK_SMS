"""Tests for backend.middleware_config.register_middlewares.

Regression coverage for the TrustedHostMiddleware wildcard fix: Docker mode
used to register allowed_hosts=[..., "*"], which disables Host-header
validation entirely. It must now be an explicit list, extensible via the
TRUSTED_HOSTS setting.
"""

from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from backend.middleware_config import register_middlewares


def _get_trusted_host_kwargs(app: FastAPI):
    for m in app.user_middleware:
        if m.cls is TrustedHostMiddleware:
            return m.kwargs
    return None


def test_docker_mode_does_not_wildcard_trusted_hosts(monkeypatch):
    monkeypatch.setattr("backend.config.settings.SMS_EXECUTION_MODE", "docker")
    monkeypatch.setattr("backend.config.settings.TRUSTED_HOSTS", "")

    app = FastAPI()
    register_middlewares(app)

    kwargs = _get_trusted_host_kwargs(app)
    assert kwargs is not None, "TrustedHostMiddleware should be registered in docker mode"
    allowed_hosts = kwargs["allowed_hosts"]
    assert "*" not in allowed_hosts
    assert set(allowed_hosts) == {"localhost", "127.0.0.1", "backend"}


def test_docker_mode_includes_operator_configured_trusted_hosts(monkeypatch):
    monkeypatch.setattr("backend.config.settings.SMS_EXECUTION_MODE", "docker")
    monkeypatch.setattr("backend.config.settings.TRUSTED_HOSTS", "sms.example.com, 100.64.0.5")

    app = FastAPI()
    register_middlewares(app)

    allowed_hosts = _get_trusted_host_kwargs(app)["allowed_hosts"]
    assert "*" not in allowed_hosts
    assert "sms.example.com" in allowed_hosts
    assert "100.64.0.5" in allowed_hosts
    assert {"localhost", "127.0.0.1", "backend"}.issubset(set(allowed_hosts))


def test_native_mode_does_not_register_trusted_host_middleware(monkeypatch):
    monkeypatch.setattr("backend.config.settings.SMS_EXECUTION_MODE", "native")

    app = FastAPI()
    register_middlewares(app)

    assert _get_trusted_host_kwargs(app) is None
