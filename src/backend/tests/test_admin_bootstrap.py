from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy.orm import Session

from backend.models import RefreshToken, User
from backend.scripts.admin.bootstrap import ensure_default_admin_account
from backend.security.password_hash import verify_password

def _pbkdf2_hash(password: str) -> str:
    """Create a legacy PBKDF2-SHA256 fixture hash without importing passlib in tests."""
    from passlib.context import CryptContext  # noqa: PLC0415 — lazily imported for legacy fixtures only
    return CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto").hash(password)


def _make_settings(**overrides):
    base = {
        "DEFAULT_ADMIN_EMAIL": "admin@example.com",
        "DEFAULT_ADMIN_PASSWORD": "ChangeMe123!",
        "DEFAULT_ADMIN_FULL_NAME": "System Administrator",
        "DEFAULT_ADMIN_FORCE_RESET": False,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _count_users(session: Session) -> int:
    return session.query(User).count()


def test_bootstrap_skips_without_credentials(db: Session):
    settings = _make_settings(DEFAULT_ADMIN_EMAIL=None, DEFAULT_ADMIN_PASSWORD=None)
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)
    assert _count_users(db) == 0


def test_bootstrap_warns_when_auth_enabled_without_credentials(db: Session, caplog):
    settings = _make_settings(DEFAULT_ADMIN_EMAIL=None, DEFAULT_ADMIN_PASSWORD=None, AUTH_ENABLED=True)
    with caplog.at_level("WARNING"):
        ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    assert _count_users(db) == 0

    assert "AUTH_ENABLED is True" in caplog.text


def test_bootstrap_creates_admin_user(db: Session):
    settings = _make_settings()
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    user = db.query(User).filter(User.email == "admin@example.com").one()
    assert user.role == "admin"
    assert user.is_active is True
    assert user.full_name == "System Administrator"
    assert verify_password("ChangeMe123!", user.hashed_password)


def test_bootstrap_updates_existing_user_with_force_reset(db: Session):
    user = User(
        email="admin@example.com",
        hashed_password=_pbkdf2_hash("OldPass123!"),
        full_name="Legacy User",
        role="teacher",
        is_active=False,
    )
    db.add(user)
    db.commit()

    token = RefreshToken(
        user_id=user.id,
        jti="test",
        token_hash="hash",
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(token)
    db.commit()

    settings = _make_settings(DEFAULT_ADMIN_PASSWORD="NewPass456!", DEFAULT_ADMIN_FORCE_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    db.refresh(user)
    assert user.role == "admin"
    assert user.is_active is True
    assert user.full_name == "System Administrator"
    assert verify_password("NewPass456!", user.hashed_password)

    db.refresh(token)
    assert token.revoked is True


def test_bootstrap_keeps_a_deactivated_or_demoted_default_admin_as_it_is(db: Session):
    # An administrator deactivated or demoted the default account; a restart must not undo it.
    original_hash = _pbkdf2_hash("StablePass789!")
    user = User(
        email="admin@example.com",
        hashed_password=original_hash,
        full_name="Old Name",
        role="teacher",
        is_active=False,
    )
    db.add(user)
    db.commit()

    settings = _make_settings(DEFAULT_ADMIN_FULL_NAME="Updated Admin")
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    db.refresh(user)
    assert user.role == "teacher"
    assert user.is_active is False
    assert user.full_name == "Updated Admin"
    assert user.hashed_password == original_hash


def test_bootstrap_adds_no_default_admin_to_a_database_that_has_accounts(db: Session):
    # The shared QNAP database: SMS Lite's public default admin must not be created there.
    owner = User(email="owner@example.com", hashed_password=_pbkdf2_hash("Owner123!"), role="admin")
    db.add(owner)
    db.commit()

    settings = _make_settings(DEFAULT_ADMIN_EMAIL="admin@sms-lite.app", DEFAULT_ADMIN_PASSWORD="AdminPassword123!")
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    assert db.query(User).filter(User.email == "admin@sms-lite.app").first() is None
    assert _count_users(db) == 1


def test_bootstrap_force_reset_creates_the_account_even_when_others_exist(db: Session):
    # Break-glass: an operator who sets FORCE_RESET asked for this account explicitly.
    db.add(User(email="owner@example.com", hashed_password=_pbkdf2_hash("Owner123!"), role="teacher"))
    db.commit()

    settings = _make_settings(DEFAULT_ADMIN_PASSWORD="Recover123!", DEFAULT_ADMIN_FORCE_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    user = db.query(User).filter(User.email == "admin@example.com").one()
    assert user.role == "admin"
    assert verify_password("Recover123!", user.hashed_password)


def test_console_that_cannot_encode_emoji_does_not_fail_the_bootstrap(db: Session, monkeypatch):
    # Frozen SMS Lite: stdout uses the Windows code page. The emoji print raised after the account
    # was created, so Lite kept the installer's plaintext admin file (smoke test, 2026-10-12).
    import io
    import sys

    monkeypatch.setattr(sys, "stdout", io.TextIOWrapper(io.BytesIO(), encoding="cp1253"))
    ensure_default_admin_account(settings=_make_settings(), session_factory=lambda: db, close_session=False)

    assert db.query(User).filter(User.email == "admin@example.com").one().role == "admin"


def test_new_default_admin_must_change_password_unless_configured_otherwise(db: Session):
    ensure_default_admin_account(settings=_make_settings(), session_factory=lambda: db, close_session=False)
    assert db.query(User).filter(User.email == "admin@example.com").one().password_change_required is True

    db.query(User).delete()
    db.commit()

    # SMS Lite: the installer asked the user for this password
    settings = _make_settings(DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED="false")
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)
    assert db.query(User).filter(User.email == "admin@example.com").one().password_change_required is False


def test_bootstrap_creates_user_and_allows_login(db: Session, client, monkeypatch):
    from backend.config import settings

    # Configure bootstrap credentials
    # Use monkeypatch to avoid modifying the global settings object directly
    try:
        monkeypatch.setattr(settings, "DEFAULT_ADMIN_EMAIL", "bootstrap-login@example.com", raising=False)
        monkeypatch.setattr(settings, "DEFAULT_ADMIN_PASSWORD", "Bootstrap1!", raising=False)
        monkeypatch.setattr(settings, "DEFAULT_ADMIN_FORCE_RESET", True, raising=False)
    except Exception:
        object.__setattr__(settings, "DEFAULT_ADMIN_EMAIL", "bootstrap-login@example.com")
        object.__setattr__(settings, "DEFAULT_ADMIN_PASSWORD", "Bootstrap1!")
        object.__setattr__(settings, "DEFAULT_ADMIN_FORCE_RESET", True)

    # Run bootstrap
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    # Try to login using the created credentials
    resp = client.post("/api/v1/auth/login", json={"email": "bootstrap-login@example.com", "password": "Bootstrap1!"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data


def test_bootstrap_auto_resets_when_enabled(db: Session):
    # Existing admin with different password should be auto-reset when enabled
    user = User(
        email="auto-reset@example.com",
        hashed_password=_pbkdf2_hash("OldSecret!"),
        full_name="Legacy Admin",
        role="teacher",
        is_active=False,
    )
    db.add(user)
    db.commit()

    token = RefreshToken(
        user_id=user.id,
        jti="auto",
        token_hash="hash",
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(token)
    db.commit()

    settings = _make_settings(
        DEFAULT_ADMIN_EMAIL="auto-reset@example.com",
        DEFAULT_ADMIN_PASSWORD="NewAuto987!",
        DEFAULT_ADMIN_AUTO_RESET=True,
    )
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    db.refresh(user)
    assert user.role == "admin"
    assert user.is_active is True
    assert user.full_name == "System Administrator"
    assert verify_password("NewAuto987!", user.hashed_password)

    db.refresh(token)
    assert token.revoked is True


def test_bootstrap_auto_does_not_reset_if_password_matches(db: Session):
    # When the stored password already matches the configured one, AUTO_RESET should not revoke tokens
    original_hash = _pbkdf2_hash("MatchMe123!")
    user = User(
        email="auto-match@example.com",
        hashed_password=original_hash,
        full_name="Admin Match",
        role="admin",
        is_active=False,
    )
    db.add(user)
    db.commit()

    token = RefreshToken(
        user_id=user.id,
        jti="match",
        token_hash="hash",
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(token)
    db.commit()

    settings = _make_settings(
        DEFAULT_ADMIN_EMAIL="auto-match@example.com",
        DEFAULT_ADMIN_PASSWORD="MatchMe123!",
        DEFAULT_ADMIN_AUTO_RESET=True,
    )
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    db.refresh(user)
    assert user.role == "admin"
    assert user.is_active is True
    assert user.full_name == "System Administrator"
    # If password matches, the hash should remain equal to the earlier value
    assert user.hashed_password == original_hash

    db.refresh(token)
    assert token.revoked is False


def test_bootstrap_auto_resets_on_verification_error(db: Session):
    # If stored hash is invalid/corrupted and verify() raises, AUTO_RESET should still reset
    # Put an intentionally invalid hash string so CryptContext.verify will throw
    user = User(
        email="auto-error@example.com",
        hashed_password="not-a-valid-passlib-hash",
        full_name="Corrupt Hash",
        role="teacher",
        is_active=False,
    )
    db.add(user)
    db.commit()

    token = RefreshToken(
        user_id=user.id,
        jti="error",
        token_hash="hash",
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(token)
    db.commit()

    settings = _make_settings(
        DEFAULT_ADMIN_EMAIL="auto-error@example.com",
        DEFAULT_ADMIN_PASSWORD="Recover123!",
        DEFAULT_ADMIN_AUTO_RESET=True,
    )
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)

    db.refresh(user)
    # Password should be reset to the configured value
    assert verify_password("Recover123!", user.hashed_password)

    db.refresh(token)
    assert token.revoked is True
