from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.admin_bootstrap import ensure_default_admin_account
from backend.models import User, RefreshToken
from backend.tests.conftest import TestingSessionLocal

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


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


def test_bootstrap_skips_without_credentials(clean_db):
    settings = _make_settings(DEFAULT_ADMIN_EMAIL=None, DEFAULT_ADMIN_PASSWORD=None)
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)
    session = TestingSessionLocal()
    try:
        assert _count_users(session) == 0
    finally:
        session.close()


def test_bootstrap_warns_when_auth_enabled_without_credentials(clean_db, caplog):
    settings = _make_settings(DEFAULT_ADMIN_EMAIL=None, DEFAULT_ADMIN_PASSWORD=None, AUTH_ENABLED=True)
    with caplog.at_level("WARNING"):
        ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        assert _count_users(session) == 0
    finally:
        session.close()

    assert "AUTH_ENABLED is True" in caplog.text


def test_bootstrap_creates_admin_user(clean_db):
    settings = _make_settings()
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "admin@example.com").one()
        assert user.role == "admin"
        assert user.is_active is True
        assert user.full_name == "System Administrator"
        assert _pwd_context.verify("ChangeMe123!", user.hashed_password)
    finally:
        session.close()


def test_bootstrap_updates_existing_user_with_force_reset(clean_db):
    session = TestingSessionLocal()
    try:
        user = User(
            email="admin@example.com",
            hashed_password=_pwd_context.hash("OldPass123!"),
            full_name="Legacy User",
            role="teacher",
            is_active=False,
        )
        session.add(user)
        session.commit()

        token = RefreshToken(
            user_id=user.id,
            jti="test",
            token_hash="hash",
            revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        session.add(token)
        session.commit()
    finally:
        session.close()

    settings = _make_settings(DEFAULT_ADMIN_PASSWORD="NewPass456!", DEFAULT_ADMIN_FORCE_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "admin@example.com").one()
        assert user.role == "admin"
        assert user.is_active is True
        assert user.full_name == "System Administrator"
        assert _pwd_context.verify("NewPass456!", user.hashed_password)

        token = session.query(RefreshToken).filter(RefreshToken.user_id == user.id).one()
        assert token.revoked is True
    finally:
        session.close()


def test_bootstrap_updates_existing_user_without_force_reset(clean_db):
    session = TestingSessionLocal()
    try:
        original_hash = _pwd_context.hash("StablePass789!")
        user = User(
            email="admin@example.com",
            hashed_password=original_hash,
            full_name="Old Name",
            role="teacher",
            is_active=False,
        )
        session.add(user)
        session.commit()
    finally:
        session.close()

    settings = _make_settings(DEFAULT_ADMIN_FULL_NAME="Updated Admin")
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "admin@example.com").one()
        assert user.role == "admin"
        assert user.is_active is True
        assert user.full_name == "Updated Admin"
        assert user.hashed_password == original_hash
    finally:
        session.close()


def test_bootstrap_creates_user_and_allows_login(clean_db):
    # Ensure bootstrap creates user and that login endpoint accepts the configured password
    from backend.config import settings
    from fastapi.testclient import TestClient

    # Configure bootstrap credentials
    settings.DEFAULT_ADMIN_EMAIL = "bootstrap-login@example.com"
    settings.DEFAULT_ADMIN_PASSWORD = "Bootstrap1!"
    settings.DEFAULT_ADMIN_FORCE_RESET = True

    # Run bootstrap
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    # Try to login using the created credentials
    client = TestClient(__import__('backend.main').main.app)
    resp = client.post("/api/v1/auth/login", json={"email": "bootstrap-login@example.com", "password": "Bootstrap1!"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data


def test_bootstrap_auto_resets_when_enabled(clean_db):
    # Existing admin with different password should be auto-reset when enabled
    session = TestingSessionLocal()
    try:
        user = User(
            email="auto-reset@example.com",
            hashed_password=_pwd_context.hash("OldSecret!"),
            full_name="Legacy Admin",
            role="teacher",
            is_active=False,
        )
        session.add(user)
        session.commit()

        token = RefreshToken(
            user_id=user.id,
            jti="auto",
            token_hash="hash",
            revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        session.add(token)
        session.commit()
    finally:
        session.close()

    settings = _make_settings(DEFAULT_ADMIN_EMAIL="auto-reset@example.com", DEFAULT_ADMIN_PASSWORD="NewAuto987!", DEFAULT_ADMIN_AUTO_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "auto-reset@example.com").one()
        assert user.role == "admin"
        assert user.is_active is True
        assert user.full_name == "System Administrator"
        assert _pwd_context.verify("NewAuto987!", user.hashed_password)

        token = session.query(RefreshToken).filter(RefreshToken.user_id == user.id).one()
        assert token.revoked is True
    finally:
        session.close()


def test_bootstrap_auto_does_not_reset_if_password_matches(clean_db):
    # When the stored password already matches the configured one, AUTO_RESET should not revoke tokens
    session = TestingSessionLocal()
    try:
        original_hash = _pwd_context.hash("MatchMe123!")
        user = User(
            email="auto-match@example.com",
            hashed_password=original_hash,
            full_name="Admin Match",
            role="admin",
            is_active=False,
        )
        session.add(user)
        session.commit()

        token = RefreshToken(
            user_id=user.id,
            jti="match",
            token_hash="hash",
            revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        session.add(token)
        session.commit()
    finally:
        session.close()

    settings = _make_settings(DEFAULT_ADMIN_EMAIL="auto-match@example.com", DEFAULT_ADMIN_PASSWORD="MatchMe123!", DEFAULT_ADMIN_AUTO_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "auto-match@example.com").one()
        assert user.role == "admin"
        assert user.is_active is True
        assert user.full_name == "System Administrator"
        # If password matches, the hash should remain equal to the earlier value
        assert user.hashed_password == original_hash

        token = session.query(RefreshToken).filter(RefreshToken.user_id == user.id).one()
        assert token.revoked is False
    finally:
        session.close()


def test_bootstrap_auto_resets_on_verification_error(clean_db):
    # If stored hash is invalid/corrupted and verify() raises, AUTO_RESET should still reset
    session = TestingSessionLocal()
    try:
        # Put an intentionally invalid hash string so CryptContext.verify will throw
        user = User(
            email="auto-error@example.com",
            hashed_password="not-a-valid-passlib-hash",
            full_name="Corrupt Hash",
            role="teacher",
            is_active=False,
        )
        session.add(user)
        session.commit()

        token = RefreshToken(
            user_id=user.id,
            jti="error",
            token_hash="hash",
            revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        session.add(token)
        session.commit()
    finally:
        session.close()

    settings = _make_settings(DEFAULT_ADMIN_EMAIL="auto-error@example.com", DEFAULT_ADMIN_PASSWORD="Recover123!", DEFAULT_ADMIN_AUTO_RESET=True)
    ensure_default_admin_account(settings=settings, session_factory=TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter(User.email == "auto-error@example.com").one()
        # Password should be reset to the configured value
        assert _pwd_context.verify("Recover123!", user.hashed_password)

        token = session.query(RefreshToken).filter(RefreshToken.user_id == user.id).one()
        assert token.revoked is True
    finally:
        session.close()
