# Authentication & Test Infrastructure Guide

**Last Updated:** December 27, 2025
**Version:** 1.12.8
**Status:** Current Implementation

---

## Overview

This document describes the authentication bypass logic and test infrastructure for the Student Management System, including how tests work with authentication disabled, how auth endpoints generate tokens, and how configuration validation is tested.

---

## Table of Contents

1. [Authentication Bypass Logic](#authentication-bypass-logic)
2. [Test Infrastructure](#test-infrastructure)
3. [SECRET_KEY Validation](#secret_key-validation)
4. [Database Configuration for Tests](#database-configuration-for-tests)
5. [Common Testing Patterns](#common-testing-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Authentication Bypass Logic

### Overview

The authentication system supports three modes controlled by `AUTH_ENABLED` and `AUTH_MODE` settings:

- **Disabled Mode** (`AUTH_ENABLED=False` or `AUTH_MODE=disabled`): No authentication required for non-auth endpoints
- **Permissive Mode** (`AUTH_MODE=permissive`): Authentication required but minimal role enforcement
- **Strict Mode** (`AUTH_MODE=strict`): Full RBAC enforcement with role-based access control

### Implementation (`backend/security/current_user.py`)

```python
async def get_current_user(
    request: Request,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve the current authenticated user."""
    # Detect auth endpoint
    is_auth_endpoint = "/auth/" in request.url.path
    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))
    auth_mode = str(getattr(settings, "AUTH_MODE", "disabled") or "disabled").lower()

    # Bypass auth for non-auth endpoints when disabled
    if not auth_enabled or auth_mode == "disabled":
        if not is_auth_endpoint:
            # No Authorization header? Return dummy admin user
            if not request.headers.get("Authorization", "").strip():
                return SimpleNamespace(
                    id=1,
                    email="admin@example.com",
                    role="admin",
                    is_active=True,
                    full_name="Admin User",
                )

    # Auth endpoints always require tokens (even when AUTH disabled)
    # This allows login/register to work and generate tokens
    if is_auth_endpoint or auth_enabled:
        if not auth_header.startswith("Bearer "):
            raise HTTPException(401, "Missing bearer token")

    # Validate token and return user from database
    # ...

```text
### Key Behaviors

1. **Non-Auth Endpoints with AUTH Disabled**
   - No Authorization header → Return dummy admin user
   - With Authorization header → Validate token normally
   - Allows tests to run without authentication setup

2. **Auth Endpoints** (`/api/v1/auth/*`)
   - Always require proper authentication flow
   - Login endpoint validates credentials and returns JWT token
   - Register endpoint creates user and returns token
   - Works correctly even when `AUTH_ENABLED=False` for test helpers

3. **Non-Auth Endpoints with AUTH Enabled**
   - Always require valid Bearer token
   - Token validated against database
   - Role-based access control enforced per endpoint

---

## Test Infrastructure

### Test Configuration (`backend/tests/conftest.py`)

The test suite uses automatic fixtures to configure the environment:

```python
@pytest.fixture(scope="function", autouse=True)
def patch_settings_for_tests(request, monkeypatch):
    """Patch application settings before any tests run."""

    # Skip for tests marked with 'no_app_context'
    if "no_app_context" in request.keywords:
        return

    from backend.config import settings

    # 1. Disable Auth for most tests
    safe_patch(settings, "AUTH_ENABLED", False)

    # 2. Ensure REFRESH_TOKEN_EXPIRE_DAYS exists
    if not hasattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS"):
        safe_patch(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 30)

    # 3. Disable CSRF in tests
    safe_patch(settings, "CSRF_ENABLED", False)

    # 4. Disable rate limiting
    from backend.rate_limiting import limiter
    limiter.enabled = False

    # 5. Reset login throttle state
    from backend.security.login_throttle import login_throttle
    login_throttle.clear()

```text
### Database Setup

Each test function gets a clean database:

```python
@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Ensure a clean database schema for each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

```text
### Test Client

The `client` fixture provides a TestClient with dependency overrides:

```python
@pytest.fixture(scope="function")
def client(db):
    """Get a TestClient instance that uses the test database."""
    from backend.main import app
    from backend.db import get_session

    def _override_session():
        yield db

    app.dependency_overrides[get_session] = _override_session
    with TestClient(app) as c:
        yield _ClientProxy(c)
    app.dependency_overrides.clear()

```text
---

## SECRET_KEY Validation

### Configuration Validation (`backend/config.py`)

The `SECRET_KEY` validation supports multiple modes:

```python
@model_validator(mode="after")
def check_secret_key(self) -> "Settings":
    """Validate SECRET_KEY strength."""

    # Detect CI/pytest environment
    is_ci = bool(os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"))
    is_pytest = bool(os.environ.get("PYTEST_CURRENT_TEST") or "pytest" in sys.argv)

    # Check for security issues
    is_placeholder = "placeholder" in normalized_secret.lower()
    is_too_short = len(normalized_secret) < 32

    if not security_issue:
        return self  # No issues, continue

    # Determine enforcement level
    is_production = self.SMS_ENV.lower() in ("production", "prod", "staging")
    enforcement_active = bool(self.SECRET_KEY_STRICT_ENFORCEMENT or self.AUTH_ENABLED)

    # Handle based on context
    if enforcement_active:
        # In CI/pytest non-production: auto-generate secure key
        if (is_ci or is_pytest) and not is_production:
            secure_key = secrets.token_urlsafe(48)
            object.__setattr__(self, "SECRET_KEY", secure_key)
            logger.warning("Auto-generated temporary secure SECRET_KEY for tests/CI.")
            return self
        # Otherwise: raise error
        raise ValueError(f"SECRET_KEY SECURITY ISSUE: {security_issue}")
    else:
        # Warning mode: log but allow
        logger.warning(f"SECRET_KEY SECURITY ISSUE: {security_issue}")
        return self

```text
### Testing SECRET_KEY Validation

Tests can explicitly control SECRET_KEY behavior:

```python
def test_secret_key_placeholder_generates_random_key_when_enforced(monkeypatch):
    """Test that placeholder secret generates random key when enforced."""
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")

    settings = Settings(
        SECRET_KEY="dev-placeholder-secret",
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=True,  # Enable enforcement
    )

    # Should auto-generate secure key in test environment
    assert settings.SECRET_KEY != "dev-placeholder-secret"
    assert len(settings.SECRET_KEY) >= 32


def test_secret_key_placeholder_allowed_when_not_enforced(monkeypatch):
    """Test that placeholder secret is allowed when not enforced."""
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")

    settings = Settings(
        SECRET_KEY="dev-placeholder-secret",
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,  # Disable enforcement
    )

    # Should keep provided value
    assert settings.SECRET_KEY == "dev-placeholder-secret"

```text
### Key Points

1. **Default Behavior**: Warns but allows weak keys (backward compatible)
2. **Enforcement Active**: Requires secure keys (or auto-generates in tests)
3. **Test Control**: Tests can set explicit values by using non-default keys
4. **Production**: Always enforces secure keys in production environment

---

## Database Configuration for Tests

### Thread Safety (`backend/tests/db_setup.py`)

SQLite in test mode uses special configuration for thread safety:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

# In-memory SQLite with thread-safe configuration

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},  # Allow cross-thread access
    poolclass=NullPool,  # No connection pooling
)

```text
### Why `check_same_thread=False`?

- **Problem**: SQLite default behavior raises errors when accessed from different threads
- **Solution**: Disable thread checking for test environment only
- **Safety**: Tests use isolated transactions, preventing race conditions
- **Performance**: NullPool ensures fresh connections for each test

### Connection Management

```python
@pytest.fixture(scope="function")
def db(setup_db):
    """Creates a new database session for a test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

```text
---

## Common Testing Patterns

### Pattern 1: Testing Without Authentication

Most tests run with `AUTH_ENABLED=False` automatically:

```python
def test_create_student_success(client):
    """Test creating a student without authentication."""
    payload = {
        "email": "test@example.com",
        "student_id": "S001",
        "first_name": "Test",
        "last_name": "Student"
    }

    # No auth header needed - conftest disables AUTH
    response = client.post("/api/v1/students/", json=payload)
    assert response.status_code == 201

```text
### Pattern 2: Testing With Authentication

For auth-specific tests, use helper to get tokens:

```python
def get_auth_headers(client, email="test@example.com", password="Test123!"):
    """Helper to register user and get auth token."""
    # Register
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "role": "teacher"
    })

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_sessions_export_requires_auth():
    """Test that session export requires authentication."""
    headers = get_auth_headers(client)
    response = client.get("/api/v1/sessions/export",
                         params={"semester": "2025-Fall"},
                         headers=headers)
    assert response.status_code == 200

```text
### Pattern 3: Testing Configuration

Config tests control settings explicitly:

```python
def test_auth_disabled_allows_placeholder_secret_key(monkeypatch):
    """Test that weak keys are allowed when auth is disabled."""
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")

    # Explicitly disable enforcement
    settings = Settings(
        SECRET_KEY="change-me",
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False
    )

    # Should keep the weak key (no enforcement)
    assert settings.SECRET_KEY == "change-me"

```text
### Pattern 4: Testing Admin Bootstrap

Admin bootstrap tests mock environment appropriately:

```python
def test_admin_bootstrap_creates_user(db, monkeypatch):
    """Test that bootstrap creates default admin user."""
    # Mock settings
    monkeypatch.setattr("backend.scripts.admin.bootstrap.settings.DEFAULT_ADMIN_EMAIL",
                       "admin@test.com")
    monkeypatch.setattr("backend.scripts.admin.bootstrap.settings.DEFAULT_ADMIN_PASSWORD",
                       "SecurePass123!")

    # Run bootstrap
    from backend.scripts.admin.bootstrap import bootstrap_default_admin_user
    bootstrap_default_admin_user(db)

    # Verify user created
    user = db.query(User).filter_by(email="admin@test.com").first()
    assert user is not None
    assert user.role == "admin"

```text
---

## Troubleshooting

### Issue: Tests Getting 401 Unauthorized

**Symptom**: Tests fail with "Missing bearer token" errors

**Causes**:
1. `AUTH_ENABLED` not patched to `False` in conftest
2. Test marked with `no_app_context` (skips conftest patch)
3. Settings cached before conftest runs

**Solutions**:

```python
# Check conftest is patching AUTH_ENABLED

def patch_settings_for_tests(request, monkeypatch):
    safe_patch(settings, "AUTH_ENABLED", False)  # Must be False

# Or use auth helper for tests that need tokens

headers = get_auth_headers(client)
response = client.get("/api/v1/endpoint", headers=headers)

```text
### Issue: SECRET_KEY Validation Errors

**Symptom**: `ValidationError: SECRET_KEY SECURITY ISSUE`

**Causes**:
1. Test trying to use weak key with enforcement enabled
2. Production environment without secure key

**Solutions**:

```python
# For tests: Use non-default key to bypass auto-generation

settings = Settings(
    SECRET_KEY="test-key-with-exactly-32-chars!",  # Explicit, non-default
    AUTH_ENABLED=False
)

# For production: Set strong key in .env

SECRET_KEY=<output of: python -c "import secrets; print(secrets.token_urlsafe(48))">

```text
### Issue: SQLite Thread Errors

**Symptom**: "SQLite objects created in a thread can only be used in that same thread"

**Cause**: Missing `check_same_thread=False` in engine configuration

**Solution**:

```python
# In db_setup.py or models.py for tests

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},  # Required for tests
    poolclass=NullPool
)

```text
### Issue: Auth Endpoints Not Generating Tokens

**Symptom**: `KeyError: 'access_token'` in test helpers

**Cause**: Auth endpoints broken by overly aggressive auth bypass

**Solution**: Current implementation correctly handles auth endpoints:

```python
# Auth endpoints always work, even with AUTH_ENABLED=False

is_auth_endpoint = "/auth/" in path
if is_auth_endpoint or auth_enabled:
    # Require token for auth endpoints
    ...

```text
### Issue: Config Tests Failing

**Symptom**: Tests expecting specific validation behavior get auto-generated keys

**Cause**: Early CI/pytest return bypassing test logic

**Solution**: Remove early return, let tests control behavior:

```python
# Don't do this (breaks tests):

if is_ci or is_pytest:
    return auto_generated_key  # Bypasses test control

# Do this (allows test control):

if enforcement_active:
    if (is_ci or is_pytest) and not is_production:
        return auto_generated_key  # Only when enforcement active
    raise ValueError("Weak key")

```text
---

## Best Practices

### For Test Writers

1. **Use Default Configuration**: Most tests work with default conftest setup
2. **Use Auth Helpers**: For tests needing tokens, use `get_auth_headers()`
3. **Explicit Config**: Config tests should set explicit non-default values
4. **Clean Database**: Rely on `setup_db` fixture for isolation
5. **No Auth Marks**: Avoid `no_app_context` unless testing config/version

### For Application Developers

1. **Check AUTH Mode**: Use `optional_require_role()` for endpoints that should respect AUTH_MODE
2. **Auth Endpoints**: Keep auth logic in `/auth/` prefix for auto-detection
3. **Config Validation**: Test both enforced and non-enforced modes
4. **Database Access**: Use dependency injection for proper test overrides
5. **Error Messages**: Include context in auth errors for debugging

### For DevOps/Operators

1. **Production Keys**: Always set strong SECRET_KEY in production
2. **AUTH Mode**: Use `AUTH_MODE=permissive` or `strict` in production
3. **Environment Files**: Use root `.env` as single source of truth
4. **Test Execution**: CI/CD should set `PYTEST_CURRENT_TEST` for auto-generation
5. **Monitoring**: Watch for SECRET_KEY warnings in logs

---

## Related Documentation

- [Configuration Strategy](../CONFIG_STRATEGY.md) - Environment configuration
- [Architecture Guide](ARCHITECTURE.md) - System architecture
- [Security Guide](../SECURITY_GUIDE_COMPLETE.md) - Security best practices
- [RBAC Documentation](../ROLE_PERMISSIONS_MODEL.md) - Role-based access control

---

**Document Version**: 1.0
**Last Review**: December 27, 2025
**Next Review**: January 27, 2026

