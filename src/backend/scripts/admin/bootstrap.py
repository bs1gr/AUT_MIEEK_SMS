"""Bootstrap default admin account on startup."""

from __future__ import annotations

import importlib
import logging
from typing import Any, Callable

from sqlalchemy.orm import Session

from backend.security.password_hash import get_password_hash as _hash_password
from backend.security.password_hash import verify_password as _verify_password


def _echo(message: str) -> None:
    """Console note that can never fail the bootstrap.

    The frozen SMS Lite's stdout uses the Windows code page, which cannot encode the emoji:
    the print raised UnicodeEncodeError after the account was created, so Lite treated the
    bootstrap as failed and kept the installer's plaintext admin file (2026-10-12).
    """
    try:
        print(message)
    except (UnicodeError, OSError, ValueError):
        pass


def _parse_bool(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def ensure_default_admin_account(
    *,
    settings: Any,
    session_factory: Callable[[], Session],
    logger: logging.Logger | None = None,
    close_session: bool = True,
) -> None:
    """Ensure that a default administrator account exists.

    Nothing happens unless both `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`
    are configured.

    - The account is created only in a database that has no users yet (a new install),
      or when `DEFAULT_ADMIN_FORCE_RESET` asks for it. A database that already has
      accounts, such as the shared QNAP one, never gets a default admin added: the
      configured password may be a public default (SMS Lite's is in this repo), and
      whoever logged in first could claim the account.
    - An existing account is restored to an active admin only when
      `DEFAULT_ADMIN_FORCE_RESET` or `DEFAULT_ADMIN_AUTO_RESET` is set (break-glass
      recovery). Otherwise an administrator who deactivated or demoted it keeps it that
      way; only the full name follows the configured value.
    - `DEFAULT_ADMIN_FORCE_RESET` resets the password and revokes refresh tokens.
    - A new account must change its password at first login unless
      `DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED` is false (SMS Lite sets that when the
      installer asked the user for the password).
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
                "⚠️  Bootstrap: AUTH_ENABLED is True but DEFAULT_ADMIN_EMAIL/PASSWORD not configured. "
                "Application may be unusable without users!"
            )
        else:
            log.debug("Bootstrap: default admin credentials not configured; skipping")
        return

    full_name_raw = getattr(settings, "DEFAULT_ADMIN_FULL_NAME", None)
    full_name = str(full_name_raw).strip() if full_name_raw is not None else ""
    force_reset = _parse_bool(getattr(settings, "DEFAULT_ADMIN_FORCE_RESET", False))
    auto_reset = _parse_bool(getattr(settings, "DEFAULT_ADMIN_AUTO_RESET", False))
    change_required = _parse_bool(getattr(settings, "DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED", True))

    try:
        models_mod = importlib.import_module("backend.models")
    except Exception:
        models_mod = importlib.import_module("models")

    RefreshToken = getattr(models_mod, "RefreshToken", None)

    session: Session | None = None
    try:
        session = session_factory()
        user = session.query(models_mod.User).filter(models_mod.User.email == email).first()

        if user is None and not force_reset and session.query(models_mod.User).first() is not None:
            log.info(
                "Bootstrap: %s does not exist and the database already has accounts; "
                "no default admin is created (sign in with an existing account)",
                email,
            )
            return

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
                if not _verify_password(password, getattr(user, "hashed_password", "")):
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
                password_change_required=change_required,
            )
            session.add(user)
            session.commit()
            log.info(
                "✅ Bootstrap: created default admin user %s (password_change_required=%s)",
                email,
                change_required,
            )
            _echo(f"✅ Admin user created: {email}")
            return

        changed_fields: list[str] = []

        # Only break-glass recovery restores the account; otherwise an admin's decision
        # to deactivate or demote it would be undone on every start.
        if force_reset or auto_reset:
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
                "✅ Bootstrap: updated default admin user %s (%s)",
                email,
                ", ".join(changed_fields),
            )
            _echo(f"✅ Admin user updated: {email} ({', '.join(changed_fields)})")
        else:
            log.debug("✅ Bootstrap: default admin user %s already up to date", email)
    except Exception as exc:
        if session is not None:
            session.rollback()
        log.error(
            "❌ Bootstrap: failed to ensure default admin user %s: %s",
            email,
            exc,
            exc_info=True,
        )
        _echo(f"❌ BOOTSTRAP ERROR: Failed to create admin user: {exc}")
        raise  # Re-raise to ensure the error is visible
    finally:
        if close_session and session is not None:
            try:
                session.close()
            except Exception:
                pass
