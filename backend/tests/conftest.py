import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

# Ensure backend imports work regardless of current working dir
import sys
from pathlib import Path

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

from backend.main import app, get_db as main_get_db
from backend.rate_limiting import limiter
from backend.db import get_session as db_get_session
from backend import models
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
    yield


@pytest.fixture()
def client(admin_token):
    """TestClient that automatically includes auth headers for all requests when auth is enabled."""
    from fastapi.testclient import TestClient
    
    base_client = TestClient(app)
    
    # If we have a token, wrap all HTTP methods to add auth headers
    if admin_token:
        for method_name in ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']:
            original_method = getattr(base_client, method_name)
            
            def make_method_with_auth(orig_method):
                def _method_with_auth(url, **kwargs):
                    # Get or create headers dict
                    if "headers" not in kwargs:
                        kwargs["headers"] = {}
                    
                    # Only add auth if not already present
                    if isinstance(kwargs["headers"], dict) and "Authorization" not in kwargs["headers"]:
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
        register_resp = temp_client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@test.example.com",
                "password": "TestAdmin123!",
                "full_name": "Test Admin",
                "role": "admin"
            }
        )
        
        # Whether registration succeeded or user already exists, try to login
        login_resp = temp_client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "TestAdmin123!"
            }
        )
        
        if login_resp.status_code == 200:
            return login_resp.json().get("access_token")
    except Exception:
        pass
    
    return None
