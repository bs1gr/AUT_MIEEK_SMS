"""Bootstrap default admin account on startup."""

from __future__ import annotations

import importlib
import logging
from typing import Any, Callable

from passlib.context import CryptContext
from sqlalchemy.orm import Session

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def _parse_bool(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def ensure_default_admin_account(
    *,
    settings: Any,
    session_factory: Callable[[], Session],
    logger: logging.Logger | None = None,
) -> None:
    """Ensure that a default administrator account exists.

    The account is created or updated only when both `DEFAULT_ADMIN_EMAIL` and
    `DEFAULT_ADMIN_PASSWORD` are configured. When the user already exists, the
    function will ensure the role is `admin`, the account is active, and the
    full name matches the configured value. When `DEFAULT_ADMIN_FORCE_RESET`
    is enabled, the password is reset and any refresh tokens are revoked.
    """

    log = logger or logging.getLogger(__name__)

    raw_email = getattr(settings, "DEFAULT_ADMIN_EMAIL", None)
    raw_password = getattr(settings, "DEFAULT_ADMIN_PASSWORD", None)
    auth_enabled = _parse_bool(getattr(settings, "AUTH_ENABLED", False))

    email = str(raw_email or "").strip().lower()
    password = str(raw_password or "")

    if not email or not password:
        if auth_enabled:
            log.warning(
                "Bootstrap: AUTH_ENABLED is True but default admin credentials are not configured; "
                "skipping automatic administrator provisioning"
            )
        else:
            log.debug("Bootstrap: default admin credentials not configured; skipping")
        return

    full_name_raw = getattr(settings, "DEFAULT_ADMIN_FULL_NAME", None)
    full_name = str(full_name_raw).strip() if full_name_raw is not None else ""
    force_reset = _parse_bool(getattr(settings, "DEFAULT_ADMIN_FORCE_RESET", False))
    auto_reset = _parse_bool(getattr(settings, "DEFAULT_ADMIN_AUTO_RESET", False))

    try:
        models_mod = importlib.import_module("backend.models")
    except Exception:
        models_mod = importlib.import_module("models")

    RefreshToken = getattr(models_mod, "RefreshToken", None)

    session: Session | None = None
    try:
        session = session_factory()
        user = session.query(models_mod.User).filter(models_mod.User.email == email).first()

        hashed_password: str | None = None
        # Compute whether we should set/reset the password.
        # - If no user exists -> create with provided password
        # - If FORCE_RESET -> always reset
        # - If AUTO_RESET -> reset when the configured password doesn't match the DB
        if user is None or force_reset:
            hashed_password = _hash_password(password)
        elif auto_reset:
            # If the stored hash doesn't match the desired password, prepare a reset
            try:
                # Use same hashing context to verify
                if not _pwd_context.verify(password, getattr(user, "hashed_password", "")):
                    hashed_password = _hash_password(password)
            except Exception:
                # If verification raises (e.g., corrupted/unsupported hash), be slightly
                # less conservative: perform the reset so administrators can recover
                # from an invalid stored hash by setting the configured password.
                hashed_password = _hash_password(password)

        if user is None:
            user = models_mod.User(
                email=email,
                full_name=full_name or None,
                role="admin",
                hashed_password=hashed_password or _hash_password(password),
                is_active=True,
                password_change_required=True,
            )
            session.add(user)
            session.commit()
            log.info("Bootstrap: created default admin user %s (password_change_required=True)", email)
            return

        changed_fields: list[str] = []

        if user.role != "admin":
            user.role = "admin"
            changed_fields.append("role")

        if not bool(getattr(user, "is_active", False)):
            user.is_active = True
            changed_fields.append("is_active")

        if full_name and (user.full_name or "") != full_name:
            user.full_name = full_name
            changed_fields.append("full_name")

        if (force_reset or (auto_reset and hashed_password is not None)) and hashed_password is not None:
            user.hashed_password = hashed_password
            user.password_change_required = True
            changed_fields.append("password")
            if RefreshToken is not None and getattr(user, "id", None) is not None:
                session.query(RefreshToken).filter(RefreshToken.user_id == user.id).update(
                    {"revoked": True}, synchronize_session=False
                )

        if changed_fields:
            session.add(user)
            session.commit()
            log.info(
                "Bootstrap: updated default admin user %s (%s)",
                email,
                ", ".join(changed_fields),
            )
        else:
            log.debug("Bootstrap: default admin user %s already up to date", email)
    except Exception as exc:
        if session is not None:
            session.rollback()
        log.warning("Bootstrap: failed to ensure default admin user %s: %s", email, exc, exc_info=True)
    finally:
        if session is not None:
            try:
                session.close()
            except Exception:
                pass
