import importlib
from typing import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


def create_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    return engine


def build_app_with_auth_enabled() -> tuple[FastAPI, TestClient]:
    # Import backend modules lazily to avoid early router evaluation
    import backend.config as config

    # Flip feature flag before routers are (re)loaded
    try:
        config.settings.AUTH_ENABLED = True
    except Exception:
        # Fallback: reload config (lru_cache may have cached instance)
        importlib.reload(config)
        config.settings.AUTH_ENABLED = True

    # Reload auth and target routers so their decorators see AUTH_ENABLED=True
    auth_mod = importlib.import_module("backend.routers.routers_auth")
    importlib.reload(auth_mod)

    attendance_mod = importlib.import_module("backend.routers.routers_attendance")
    importlib.reload(attendance_mod)

    adminops_mod = importlib.import_module("backend.routers.routers_adminops")
    importlib.reload(adminops_mod)

    # Minimal FastAPI app for these routers
    from backend.main import create_app

    app = create_app()

    # Disable rate limiting during tests
    from backend.rate_limiting import limiter

    try:
        limiter.enabled = False
        app.state.limiter = limiter
    except Exception:
        pass

    # Attach routers
    app.include_router(auth_mod.router, prefix="/api/v1", tags=["Auth"])
    app.include_router(attendance_mod.router, prefix="/api/v1", tags=["Attendance"])
    app.include_router(adminops_mod.router, prefix="/api/v1", tags=["AdminOps"])

    # In-memory DB with overrides
    from backend import models

    engine = create_inmemory_db()
    models.Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db(_=None):
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    # Apply overrides for both central and direct session providers
    from backend.db import get_session as db_get_session

    app.dependency_overrides[db_get_session] = override_get_db

    client = TestClient(app)
    return app, client


@pytest.fixture()
def rbac_client() -> Generator[TestClient, None, None]:
    app, client = build_app_with_auth_enabled()
    # fresh DB per test: drop/recreate tables
    from backend import models
    from backend.db import get_session as db_get_session

    # Ensure clean state
    for _ in range(1):
        with next(app.dependency_overrides[db_get_session]()) as db:  # type: ignore[index]
            models.Base.metadata.drop_all(bind=db.get_bind())
            models.Base.metadata.create_all(bind=db.get_bind())
    yield client


def _register_user(client: TestClient, email: str, password: str, role: str = "teacher") -> None:
    # Tests run against the API, but creating an admin account via the
    # public /register endpoint is disallowed by design. For tests that
    # need an admin user, insert directly into the test DB instead of
    # relying on /auth/register when role=='admin'.
    if role == "admin":
        # Use the test DB session override to create an admin user directly
        from backend import models
        from backend.db import get_session as db_get_session
        from backend.routers.routers_auth import get_password_hash

        db_gen = next(client.app.dependency_overrides[db_get_session]())
        with db_gen as db:
            u = models.User(
                email=email.lower(), hashed_password=get_password_hash(password), role="admin", is_active=True
            )
            db.add(u)
            db.commit()
            return

    payload = {"email": email, "password": password, "role": role}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text


def _login(client: TestClient, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_rbac_blocks_anonymous_on_write(rbac_client: TestClient):
    client = rbac_client

    # No token → should be 401 due to OAuth2 scheme when AUTH is enabled
    r = client.post(
        "/api/v1/attendance/",
        json={"student_id": 1, "course_id": 1, "status": "present", "date": "2025-10-10"},
    )
    assert r.status_code in (401, 403), r.text


def test_rbac_teacher_can_write_but_not_admin_ops(rbac_client: TestClient):
    client = rbac_client

    # Register users
    _register_user(client, "teacher@example.com", "password123", role="teacher")
    _register_user(client, "admin@example.com", "password123", role="admin")

    teacher_token = _login(client, "teacher@example.com", "password123")
    admin_token = _login(client, "admin@example.com", "password123")

    # Teacher can write attendance
    r = client.post(
        "/api/v1/attendance/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"student_id": 1, "course_id": 1, "status": "present", "date": "2025-10-10"},
    )
    # Could be 404 due to missing student/course; but must not be 401/403
    assert r.status_code not in (401, 403), r.text

    # Teacher cannot perform admin-only operation
    r2 = client.post("/api/v1/adminops/backup", headers={"Authorization": f"Bearer {teacher_token}"})
    assert r2.status_code == 403, r2.text

    # Admin can perform admin-only operation
    r3 = client.post("/api/v1/adminops/backup", headers={"Authorization": f"Bearer {admin_token}"})
    # Backup may succeed with 200; content not critical here
    assert r3.status_code in (200, 201), r3.text
