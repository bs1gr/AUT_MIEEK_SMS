from fastapi import Request, Depends, status
from sqlalchemy.orm import Session
from typing import Any
from jwt.exceptions import InvalidTokenError
from backend.errors import ErrorCode, http_error

# password hashing helpers are available in backend.security.password_hash if needed
from backend.db import get_session as get_db
from backend.config import settings
import backend.models as models
import jwt


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


async def get_current_user(
    request: Request,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve the current authenticated user (moved from routers_auth to break circular import)."""
    # Respect AUTH feature flags
    try:
        path = str(getattr(request.url, "path", ""))
    except Exception:
        path = ""
    is_auth_endpoint = "/auth/" in path
    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))
    auth_mode = str(getattr(settings, "AUTH_MODE", "disabled") or "disabled").lower()

    # In disabled auth mode, allow anonymous access for non-auth endpoints by returning a dummy user
    if not auth_enabled or auth_mode == "disabled":
        if not is_auth_endpoint:
            try:
                auth_header_probe = str(request.headers.get("Authorization", "")).strip()
            except Exception:
                auth_header_probe = ""
            if not auth_header_probe:
                from types import SimpleNamespace

                return SimpleNamespace(
                    id=1,
                    email="admin@example.com",
                    role="admin",
                    is_active=True,
                    full_name="Admin User",
                )

    if token is None:
        try:
            auth_header = str(request.headers.get("Authorization", "")).strip()
        except (KeyError, AttributeError):
            auth_header = ""
        # Require bearer token for auth endpoints always; and for non-auth when AUTH is enabled
        require_token = is_auth_endpoint or auth_enabled
        if require_token:
            if not auth_header.startswith("Bearer "):
                raise http_error(
                    status.HTTP_401_UNAUTHORIZED,
                    ErrorCode.UNAUTHORIZED,
                    "Missing bearer token",
                    request,
                    headers={"WWW-Authenticate": "Bearer"},
                )
            token = auth_header.split(" ", 1)[1].strip()
        else:
            # When AUTH is disabled and not an auth endpoint, if header is present use it; else return dummy
            if not auth_header.startswith("Bearer "):
                from types import SimpleNamespace

                return SimpleNamespace(
                    id=1,
                    email="admin@example.com",
                    role="admin",
                    is_active=True,
                    full_name="Admin User",
                )
            token = auth_header.split(" ", 1)[1].strip()
    credentials_exception = http_error(
        status.HTTP_401_UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        "Could not validate credentials",
        request,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        email_val = payload.get("sub")
        email: str = str(email_val) if email_val is not None else ""
        if not email:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    except Exception:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not bool(getattr(user, "is_active", False)):
        raise credentials_exception
    return user
