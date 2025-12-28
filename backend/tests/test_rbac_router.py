import importlib
from typing import Generator

import pytest
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


def build_app_with_rbac() -> tuple[TestClient, sessionmaker]:
    # Enable auth before app creation so dependencies respect it
    import backend.config as config

    try:
        config.settings.AUTH_ENABLED = True
        config.settings.AUTH_MODE = "permissive"
    except Exception:
        importlib.reload(config)
        config.settings.AUTH_ENABLED = True
        config.settings.AUTH_MODE = "permissive"

    from backend.app_factory import create_app

    app = create_app()

    # Disable rate limiting in tests
    from backend.rate_limiting import limiter

    try:
        limiter.enabled = False
        app.state.limiter = limiter
    except Exception:
        pass

    # In-memory DB with overrides
    import backend.models as models

    engine = create_inmemory_db()
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db(_=None):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    from backend.db import get_session as db_get_session

    app.dependency_overrides[db_get_session] = override_get_db

    client = TestClient(app)
    return client, SessionLocal


@pytest.fixture()
def rbac_client() -> Generator[TestClient, None, None]:
    client, SessionLocal = build_app_with_rbac()

    # Ensure clean DB per test
    import backend.models as models
    from backend.db import get_session as db_get_session

    with next(client.app.dependency_overrides[db_get_session]()) as db:  # type: ignore[index]
        models.Base.metadata.drop_all(bind=db.get_bind())
        models.Base.metadata.create_all(bind=db.get_bind())
    yield client


def _create_user_direct(client: TestClient, email: str, password: str, role: str = "teacher") -> int:
    # Insert a user directly into the test DB (for admin users especially)
    import backend.models as models
    from backend.db import get_session as db_get_session
    from backend.security.password_hash import get_password_hash

    with next(client.app.dependency_overrides[db_get_session]()) as db:  # type: ignore[index]
        u = models.User(
            email=email.lower(),
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u.id


def _register_user_via_api(client: TestClient, email: str, password: str, role: str = "teacher") -> None:
    payload = {"email": email, "password": password, "role": role}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text


def _login(client: TestClient, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_ensure_defaults_and_summary(rbac_client: TestClient):
    client = rbac_client
    strong_password = "Str0ngPass!123"  # pragma: allowlist secret

    # Create admin user directly and login
    _create_user_direct(client, "admin@example.com", strong_password, role="admin")
    admin_token = _login(client, "admin@example.com", strong_password)

    # Ensure defaults
    r = client.post("/api/v1/admin/rbac/ensure-defaults", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text

    # Summary contains default roles/permissions and wildcard grant
    s = client.get("/api/v1/admin/rbac/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert s.status_code == 200, s.text
    data = s.json()
    role_names = {r["name"] for r in data["roles"]}
    perm_names = {p["name"] for p in data["permissions"]}
    assert {"admin", "teacher", "guest"}.issubset(role_names)
    assert "*" in perm_names


def test_assign_and_revoke_role_with_last_admin_protection(rbac_client: TestClient):
    client = rbac_client
    strong_password = "Str0ngPass!123"  # pragma: allowlist secret

    # Admin setup
    _create_user_direct(client, "admin@example.com", strong_password, role="admin")
    admin_token = _login(client, "admin@example.com", strong_password)
    client.post("/api/v1/admin/rbac/ensure-defaults", headers={"Authorization": f"Bearer {admin_token}"})

    # Create a normal user via API and assign admin role
    _register_user_via_api(client, "user@example.com", strong_password, role="teacher")
    # Fetch user id via summary (could also query DB override)
    s = client.get("/api/v1/admin/rbac/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert s.status_code == 200

    # Assign admin role to the second user
    assign_payload = {"user_id": 2, "role_name": "admin"}
    ar = client.post(
        "/api/v1/admin/rbac/assign-role",
        json=assign_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert ar.status_code == 200, ar.text

    # Revoke admin from the second user (should succeed; not the last admin)
    rr = client.post(
        "/api/v1/admin/rbac/revoke-role",
        json=assign_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rr.status_code == 200, rr.text
    assert rr.json()["status"] in {"revoked", "not_assigned"}

    # Attempt to revoke admin from the only remaining admin (should be blocked)
    rr2 = client.post(
        "/api/v1/admin/rbac/revoke-role",
        json={"user_id": 1, "role_name": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rr2.status_code == 400, rr2.text
    assert "Cannot remove the last admin" in rr2.text


def test_bulk_grant_permission_and_permission_crud(rbac_client: TestClient):
    client = rbac_client
    strong_password = "Str0ngPass!123"  # pragma: allowlist secret

    _create_user_direct(client, "admin@example.com", strong_password, role="admin")
    admin_token = _login(client, "admin@example.com", strong_password)
    client.post("/api/v1/admin/rbac/ensure-defaults", headers={"Authorization": f"Bearer {admin_token}"})

    # Create a new role and permission
    cr = client.post(
        "/api/v1/admin/rbac/roles",
        json={"name": "auditor", "description": "Read-only reports"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cr.status_code == 200, cr.text

    cp = client.post(
        "/api/v1/admin/rbac/permissions",
        json={"name": "reports.read", "description": "Read reports"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cp.status_code == 200, cp.text

    # Bulk grant the new permission to auditor
    bg = client.post(
        "/api/v1/admin/rbac/bulk-grant-permission",
        json={"role_names": ["auditor"], "permission_name": "reports.read"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bg.status_code == 200, bg.text
    assert bg.json()["results"][0]["status"] in {"granted", "already_granted"}

    # List and update permission
    lp = client.get(
        "/api/v1/admin/rbac/permissions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert lp.status_code == 200
    perm_ids = {p["id"] for p in lp.json() if p["name"] == "reports.read"}
    assert perm_ids, "Permission 'reports.read' should exist"
    pid = next(iter(perm_ids))

    up = client.put(
        f"/api/v1/admin/rbac/permissions/{pid}",
        json={"description": "Read-only access to reports"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert up.status_code == 200, up.text

    # Delete permission
    dp = client.delete(
        f"/api/v1/admin/rbac/permissions/{pid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert dp.status_code == 200, dp.text
