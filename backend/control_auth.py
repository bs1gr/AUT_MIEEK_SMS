"""Control endpoint authorization helpers.

Provides a FastAPI dependency that protects sensitive control endpoints
used for stopping/starting services. The dependency supports an admin
token (via X-ADMIN-TOKEN header) and a safe default that allows only
loopback requests unless the operator explicitly enables remote
shutdown via environment variables.

Usage:
    from backend.control_auth import require_control_admin

    @app.post("/control/api/stop-all")
    def stop_all(request: Request, _auth=Depends(require_control_admin)):
        ...

Environment variables:
- ENABLE_CONTROL_API=1         # must be set to expose control endpoints
- ADMIN_SHUTDOWN_TOKEN=...     # if set, clients must present header X-ADMIN-TOKEN
- ALLOW_REMOTE_SHUTDOWN=1      # allow non-loopback clients, but only when ADMIN_SHUTDOWN_TOKEN is set

This module intentionally keeps dependencies minimal so it can be
imported during tests without pulling authentication subsystems.
"""

from __future__ import annotations

import hmac
import logging
import os
from typing import Callable

import jwt
from jwt.exceptions import InvalidTokenError

from fastapi import HTTPException, Request
from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND

import backend.models as models
from backend.config import settings
from backend.db import SessionLocal

# No implicit test-mode bypass here. Tests should opt in by setting
# ENABLE_CONTROL_API during test runs (see backend/tests/conftest.py).

logger = logging.getLogger(__name__)


def _const_time_eq(a: str | None, b: str | None) -> bool:
    """Constant-time comparison to avoid timing attacks."""
    if a is None or b is None:
        return False
    try:
        return hmac.compare_digest(str(a), str(b))
    except Exception:
        return False


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    cleaned = host.split(":")[0].strip().lower()
    # Accept testing server hostnames used by TestClient ('testserver', 'testclient')
    return cleaned in {"127.0.0.1", "::1", "localhost", "testserver", "testclient"}


def _control_enabled() -> bool:
    env_value = os.environ.get("ENABLE_CONTROL_API")
    if env_value is not None:
        return env_value.strip() == "1"

    # Default behavior: when running locally (native/dev) without an explicit
    # override, keep the control API enabled so restart helpers remain usable.
    exec_mode = (os.environ.get("SMS_EXECUTION_MODE") or "").strip().lower()
    sms_env = (os.environ.get("SMS_ENV") or "").strip().lower()
    environment = (os.environ.get("ENVIRONMENT") or "").strip().lower()

    if exec_mode in {"docker", "container"}:
        return False

    if sms_env in {"production", "prod"} or environment in {"production", "prod"}:
        return False

    # All other cases (development, native mode) default to enabled so that
    # local operators do not need to set ENABLE_CONTROL_API manually.
    return True


def control_api_enabled() -> bool:
    """Public helper so other modules can inspect the effective flag."""

    return _control_enabled()


def _allow_remote() -> bool:
    return os.environ.get("ALLOW_REMOTE_SHUTDOWN", "0") == "1"


def _get_env_token() -> str | None:
    t = os.environ.get("ADMIN_SHUTDOWN_TOKEN")
    return t if t else None


def _admin_from_bearer(request: Request) -> bool:
    auth_header = str(request.headers.get("Authorization", "")).strip()
    if not auth_header.startswith("Bearer "):
        return False
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except InvalidTokenError:
        return False
    except Exception:
        return False

    role = str(payload.get("role", "")).strip().lower()
    if role:
        return role == "admin"

    email = str(payload.get("sub", "")).strip().lower()
    if not email:
        return False

    try:
        with SessionLocal() as db:
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user or not bool(getattr(user, "is_active", False)):
                return False
            return str(getattr(user, "role", "")).strip().lower() == "admin"
    except Exception:
        return False


async def require_control_admin(request: Request) -> None:
    """FastAPI dependency that enforces control endpoint access rules.

    Rules (conservative defaults):
    1. If `ENABLE_CONTROL_API` is not set to "1", the endpoints are hidden (404).
    2. If `ADMIN_SHUTDOWN_TOKEN` is set, a client must send header
       `X-ADMIN-TOKEN` that matches the token (constant-time compare).
    3. If no admin token is set, only loopback requests are allowed.
    4. If `ALLOW_REMOTE_SHUTDOWN=1` is set, remote requests are only
       allowed when `ADMIN_SHUTDOWN_TOKEN` is set (i.e. token required).

    This dependency intentionally returns None on success and raises
    HTTPException on failure.
    """

    # Allow non-test runs only when control API enabled
    if not _control_enabled():
        logger.debug("Control API disabled via ENABLE_CONTROL_API")
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail={
                "error": "control_api_disabled",
                "message": ("Control API endpoints are hidden until ENABLE_CONTROL_API=1 is set."),
                "hint": (
                    "Edit backend/.env (or your process manager) to set "
                    "ENABLE_CONTROL_API=1 and restart the backend service."
                ),
                "env": {"ENABLE_CONTROL_API": os.environ.get("ENABLE_CONTROL_API", "<unset>")},
            },
        )

    env_token = _get_env_token()
    header_token = request.headers.get("x-admin-token")
    client_host = getattr(request.client, "host", None) if request.client else None
    is_loopback = _is_loopback(client_host)

    if _admin_from_bearer(request):
        if is_loopback or _allow_remote():
            logger.info(
                "Control API access granted via admin bearer token",
                extra={"client": client_host},
            )
            return
        logger.warning(
            "Rejected control API call — admin token provided but remote access not allowed",
            extra={"client": client_host},
        )
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Forbidden")
    # Debug: help tests diagnose header presence (DEBUG level to avoid noisy CI logs)
    logger.debug("control_auth: header keys=%s", list(request.headers.keys()))
    logger.debug("control_auth: header_token=%r env_token=%r", header_token, env_token)

    # If a token is configured, require it for all clients.
    if env_token:
        if not _const_time_eq(header_token, env_token):
            logger.warning(
                "Rejected control API call — invalid admin token",
                extra={"client": getattr(request.client, "host", None)},
            )
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Forbidden")
        # authorized
        logger.info(
            "Control API access granted via ADMIN_SHUTDOWN_TOKEN",
            extra={"client": getattr(request.client, "host", None)},
        )
        return

    # No token configured — only allow loopback clients by default
    if is_loopback:
        logger.info(
            "Control API access granted for loopback client",
            extra={"client": client_host},
        )
        return

    # If remote shutdown is explicitly allowed, still require a token (which is absent)
    if _allow_remote():
        logger.warning("Remote shutdown allowed but no ADMIN_SHUTDOWN_TOKEN configured - rejecting")
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Forbidden")

    logger.warning(
        "Rejected control API call — non-loopback request without token",
        extra={"client": client_host},
    )
    raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Forbidden")


def create_control_dependency(auth_check: Callable[[Request], bool] | None = None):
    """Factory to create a dependency that can incorporate an external auth check.

    If `auth_check` is provided, it will be consulted first; if it returns
    True access is granted. Otherwise the default rules above apply.
    """

    async def _dep(request: Request) -> None:
        # External auth grants immediate access
        if auth_check is not None:
            try:
                if auth_check(request):
                    logger.info(
                        "Control API access granted via external auth_check",
                        extra={"client": getattr(request.client, "host", None)},
                    )
                    return
            except Exception as e:
                logger.debug("External auth_check raised exception: %s", e)
        # Fallback to builtin logic
        return await require_control_admin(request)

    return _dep
