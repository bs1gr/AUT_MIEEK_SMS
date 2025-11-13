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
