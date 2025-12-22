"""Pytest fixtures for backend tests (clean, single-definition version).

This file prepares an in-memory SQLite DB, creates the FastAPI app used by
tests and provides fixtures for admin token, bootstrap admin and a TestClient
that auto-injects auth headers when available.
"""

import os
from pathlib import Path
import sys
import pytest
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure test-time environment variables are set before importing app code
os.environ.setdefault("DISABLE_STARTUP_TASKS", "0")
os.environ.setdefault("DEFAULT_ADMIN_EMAIL", "admin@test.example.com")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "YourSecurePassword123!")
os.environ.setdefault("ENABLE_CONTROL_API", "1")
os.environ.setdefault("ALLOW_REMOTE_SHUTDOWN", "0")
os.environ.setdefault("CSRF_ENABLED", "0")
os.environ.setdefault("CSRF_ENFORCE_IN_TESTS", "0")
os.environ.setdefault("SERVE_FRONTEND", "0")

# Application imports (after env prepared)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import models
from backend.config import settings
from backend.db import get_session as db_get_session
from backend.app_factory import create_app
from backend.rate_limiting import limiter
from backend.security.login_throttle import login_throttle

# Force-enable auth mode for tests by default
settings.AUTH_ENABLED = True
settings.AUTH_MODE = "strict"

# In-memory DB shared across connections for tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
models.Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = TestingSessionLocal

# Create or obtain app instance
try:
    from backend.main import app as _main_app

    app = _main_app
except Exception:
    app = create_app()


def override_get_db(_=None):
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_get_session] = override_get_db

# Disable rate limiting during tests
try:
    limiter.enabled = False
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
except Exception:
    pass


@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Reset DB before each test to ensure isolation."""
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    login_throttle.clear()
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def bootstrap_admin():
    """Ensure a default admin user exists in the test DB."""
    from backend.security.password_hash import get_password_hash
    from backend.models import User

    admin_email = os.environ.get("DEFAULT_ADMIN_EMAIL", "admin@test.example.com")
    password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "YourSecurePassword123!")

    session = TestingSessionLocal()
    try:
        user = session.query(User).filter_by(email=admin_email).first()
        if user:
            user.role = "admin"
            user.hashed_password = get_password_hash(password)
            user.is_active = True
            session.add(user)
            session.commit()
        else:
            user = User(
                email=admin_email,
                hashed_password=get_password_hash(password),
                is_active=True,
                role="admin",
            )
            session.add(user)
            session.commit()
    finally:
        session.close()

    return {"email": admin_email, "password": password}


@pytest.fixture()
def admin_token():
    """Create a CI admin and return an access token (or None if auth disabled)."""
    from backend.config import settings

    if not settings.AUTH_ENABLED:
        return None
    from fastapi.testclient import TestClient

    temp_client = TestClient(app)
    try:
        temp_client.post(
            "/api/v1/auth/register",
            json={
                "email": "ci-admin@example.com",
                "password": "TestAdmin123!",
                "full_name": "CI Test Admin",
                "role": "admin",
            },
        )
        login_resp = temp_client.post(
            "/api/v1/auth/login",
            json={"email": "ci-admin@example.com", "password": "TestAdmin123!"},
        )
        if login_resp.status_code == 200:
            return login_resp.json().get("access_token")
    except Exception:
        pass
    return None


_AUTO_AUTH_DEFAULT = True


@pytest.fixture(autouse=True)
def auth_default_control(request):
    """Per-test control for automatic auth injection in `client` fixture."""
    global _AUTO_AUTH_DEFAULT
    marker = request.node.get_closest_marker("auth_required")
    _AUTO_AUTH_DEFAULT = True if marker is None else bool(marker)
    try:
        yield
    finally:
        _AUTO_AUTH_DEFAULT = False


@pytest.fixture()
def client(admin_token):
    """TestClient that auto-injects Authorization header when available."""
    from fastapi.testclient import TestClient

    base_client = TestClient(app)
    if admin_token:
        for method_name in ["get", "post", "put", "patch", "delete", "head", "options"]:
            original_method = getattr(base_client, method_name)

            def make_method_with_auth(orig_method):
                def _method_with_auth(url, add_auth=None, **kwargs):
                    if "headers" not in kwargs:
                        kwargs["headers"] = {}
                    if add_auth is None:
                        try:
                            path = url if isinstance(url, str) else str(url)
                        except Exception:
                            path = ""
                        if path.startswith("/api/v1/auth"):
                            add_auth = False
                        else:
                            add_auth = _AUTO_AUTH_DEFAULT

                    if (
                        add_auth
                        and isinstance(kwargs["headers"], dict)
                        and "Authorization" not in kwargs["headers"]
                    ):
                        kwargs["headers"]["Authorization"] = f"Bearer {admin_token}"
                    return orig_method(url, **kwargs)

                return _method_with_auth

            setattr(base_client, method_name, make_method_with_auth(original_method))
    return base_client


@pytest.fixture()
def get_auth_headers(admin_token):
    """Return authorization headers dict for authenticated requests in tests."""
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}


@pytest.fixture()
def mock_db_engine():
    """Provide a minimal mock DB engine compatible with HealthChecker constructor."""

    class DummyEngine:
        def connect(self):
            class DummyConn:
                def close(self):
                    pass

            return DummyConn()

    return DummyEngine()
