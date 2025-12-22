import pytest


@pytest.fixture(scope="function")
def bootstrap_admin(client):
    """Create the first admin user using the same DB session as TestClient for test bootstrapping."""
    admin_email = "bootstrap_admin@example.com"
    admin_password = "AdminPass123!"
    from backend.models import User
    from backend.routers.routers_auth import get_password_hash
    from backend.db import get_session as db_get_session

    db_gen = next(client.app.dependency_overrides[db_get_session]())
    with db_gen as db:
        if not db.query(User).filter(User.email == admin_email).first():
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role="admin",
                is_active=True,
                full_name="Bootstrap Admin",
                password_change_required=False,
                failed_login_attempts=0,
                last_failed_login_at=None,
                lockout_until=None,
            )
            db.add(admin_user)
            db.commit()
    return {"email": admin_email, "password": admin_password}


from backend.models import User
from backend.routers.routers_auth import get_password_hash


@pytest.fixture
def admin_and_student(client):
    """Create an admin user and a student in the same session before the test client is used."""
    admin_email = "admin_fixture@example.com"
    admin_password = "AdminPass123!"
    student_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "student_id": "STD9999",
        "enrollment_date": "2025-12-19",
        "study_year": 1,
    }
    from backend.db import get_session as db_get_session

    db_gen = next(client.app.dependency_overrides[db_get_session]())
    with db_gen as db:
        if not db.query(User).filter(User.email == admin_email).first():
            admin_user = User(
                email=admin_email, hashed_password=get_password_hash(admin_password), role="admin", is_active=True
            )
            db.add(admin_user)
        db.commit()
    # Create student via API to ensure proper creation
    r = client.post("/api/v1/students/", json=student_payload)
    sid = r.json().get("id")
    # Obtain admin token
    r_login = client.post("/api/v1/auth/login", json={"email": admin_email, "password": admin_password})
    admin_token_val = r_login.json().get("access_token")
    return {"admin_token": admin_token_val, "student_id": sid}


import os

# Ensure backend imports work regardless of current working dir
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT.parent) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT.parent))

# Ensure control API is enabled in tests. Tests should opt in explicitly.
os.environ.setdefault("ENABLE_CONTROL_API", "1")
os.environ.setdefault("ALLOW_REMOTE_SHUTDOWN", "0")
# Prevent heavy startup tasks (migrations, external HTTP calls, subprocesses)
# during unit tests which run the ASGI app in-process via TestClient. This
# environment variable is checked by `backend.main` to skip long-running
# or external operations during test runs.
os.environ.setdefault("DISABLE_STARTUP_TASKS", "1")
# Disable CSRF in tests since TestClient doesn't handle CSRF token cookies easily
os.environ.setdefault("CSRF_ENABLED", "0")
os.environ.setdefault("CSRF_ENFORCE_IN_TESTS", "0")
# Disable frontend serving in tests to ensure API metadata is returned at root endpoint
os.environ.setdefault("SERVE_FRONTEND", "0")

from backend import models
from backend.config import settings
from backend.db import get_session as db_get_session
from backend.main import app
from backend.main import get_db as main_get_db
from backend.rate_limiting import limiter
from backend.security.login_throttle import login_throttle

# Create an in-memory SQLite database shared across connections
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

# Create all tables once per test session
models.Base.metadata.create_all(bind=engine)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db(_=None):
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Apply the dependency override for all tests
app.dependency_overrides[main_get_db] = override_get_db
app.dependency_overrides[db_get_session] = override_get_db

# Disable rate limiting in tests to avoid 429s from SlowAPI
try:
    limiter.enabled = False
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
except Exception:
    pass


@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean tables before each test function for isolation."""
    # Truncate all tables by dropping and recreating schema
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    login_throttle.clear()
    # Reset auth feature flags between tests so individual tests enabling
    # AUTH explicitly (e.g., RBAC tests) do not leak state to subsequent ones.
    try:
        settings.AUTH_ENABLED = True  # type: ignore[attr-defined]
        settings.AUTH_MODE = "strict"  # type: ignore[attr-defined]
    except Exception:
        pass
    # Yield a database session for tests that need direct DB access
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(admin_token):
    """TestClient that automatically includes auth headers for all requests when auth is enabled, unless add_auth=False is passed."""
    from fastapi.testclient import TestClient

    base_client = TestClient(app)

    # If we have a token, wrap all HTTP methods to add auth headers unless add_auth=False
    if admin_token:
        for method_name in ["get", "post", "put", "patch", "delete", "head", "options"]:
            original_method = getattr(base_client, method_name)

            def make_method_with_auth(orig_method):
                def _method_with_auth(url, add_auth=True, **kwargs):
                    # Get or create headers dict
                    if "headers" not in kwargs:
                        kwargs["headers"] = {}

                    # Only add auth if not already present and add_auth is True
                    if add_auth and isinstance(kwargs["headers"], dict) and "Authorization" not in kwargs["headers"]:
                        kwargs["headers"]["Authorization"] = f"Bearer {admin_token}"

                    return orig_method(url, **kwargs)

                return _method_with_auth

            setattr(base_client, method_name, make_method_with_auth(original_method))

    return base_client


@pytest.fixture()
def admin_token():
    """Generate an admin JWT token for authenticated test requests."""
    from backend.config import settings

    if not settings.AUTH_ENABLED:
        return None

    # Create a temporary test client without auth to register
    from fastapi.testclient import TestClient

    temp_client = TestClient(app)

    try:
        # Try to register a test admin user
        temp_client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@test.example.com",
                "password": "TestAdmin123!",
                "full_name": "Test Admin",
                "role": "admin",
            },
        )

        # Whether registration succeeded or user already exists, try to login
        login_resp = temp_client.post(
            "/api/v1/auth/login", json={"email": "admin@test.example.com", "password": "TestAdmin123!"}
        )

        if login_resp.status_code == 200:
            return login_resp.json().get("access_token")
    except Exception:
        pass

    return None
