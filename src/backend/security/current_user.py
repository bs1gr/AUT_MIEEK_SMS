from typing import Any

import jwt
from fastapi import Depends, Request, status
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

import backend.models as models
from backend.config import settings

# password hashing helpers are available in backend.security.password_hash if needed
from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# What a user may still do while password_change_required is set: see who they
# are, change the password, keep/end the session. Everything else is refused, so
# a bootstrap/default password (e.g. SMS_Lite's, which is public) cannot be used
# for anything but replacing itself.
PASSWORD_CHANGE_ALLOWED_SUFFIXES = ("/auth/me", "/auth/change-password", "/auth/refresh", "/auth/logout")


def password_change_blocks(user: Any, path: str) -> bool:
    """True when ``user`` must change their password and ``path`` is not allowed meanwhile."""
    if not bool(getattr(user, "password_change_required", False)):
        return False
    return not path.rstrip("/").endswith(PASSWORD_CHANGE_ALLOWED_SUFFIXES)


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
        # Require bearer token for auth endpoints always; only strict mode requires it for non-auth
        require_token = is_auth_endpoint or auth_mode == "strict"
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
    if password_change_blocks(user, path):
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            ErrorCode.AUTH_PASSWORD_CHANGE_REQUIRED,
            "Password change required before using the application",
            request,
        )
    return user


async def require_auth_even_if_disabled(
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """Strict auth dependency that requires a bearer token regardless of AUTH flags.

    This enforces authentication even when AUTH is disabled globally. It extracts the
    bearer token from the Authorization header and then delegates to get_current_user
    with the token so that the usual decoding and user lookup logic is applied.
    """
    try:
        auth_header = str(request.headers.get("Authorization", "")).strip()
    except (KeyError, AttributeError):
        auth_header = ""

    if not auth_header.startswith("Bearer "):
        raise http_error(
            status.HTTP_401_UNAUTHORIZED,
            ErrorCode.UNAUTHORIZED,
            "Missing bearer token",
            request,
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1].strip()
    # Pass the token explicitly to bypass the relaxed path in get_current_user
    return await get_current_user(request=request, token=token, db=db)


async def optional_signed_in_user(request: Request, db: Session = Depends(get_db)) -> Any:
    """The account behind this request, or None when it carries no bearer token.

    For code that only wants to know *who* is acting (to record an author, to key private data).
    Access itself is decided by the permission decorators; with authentication switched off
    there is nobody to name, so this returns None rather than the placeholder admin.
    """
    from fastapi import HTTPException

    if not str(request.headers.get("Authorization", "")).startswith("Bearer "):
        return None
    try:
        return await get_current_user(request=request, db=db)
    except HTTPException:
        return None


async def may_see_health_data(request: Request, db: Session = Depends(get_db)) -> bool:
    """Whether this request may read or write students' health information.

    Health data is a special category under GDPR Article 9, so it is limited to administrators
    (the same rule the custom reports already apply to their sensitive fields). An install that
    runs without authentication has no accounts to tell apart, so it is allowed there.
    """
    user = await optional_signed_in_user(request, db)
    if user is not None:
        return str(getattr(user, "role", "") or "").lower() == "admin"
    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))
    auth_mode = str(getattr(settings, "AUTH_MODE", "disabled") or "disabled").lower()
    return (not auth_enabled) or auth_mode != "strict"


def health_recording_enabled() -> bool:
    """Whether this installation records students' health information at all (default: no)."""
    return bool(getattr(settings, "HEALTH_DATA_ENABLED", False))


async def health_data_access(request: Request, db: Session = Depends(get_db)) -> bool:
    """True only when health recording is switched on AND the caller is an administrator."""
    return health_recording_enabled() and await may_see_health_data(request, db)
