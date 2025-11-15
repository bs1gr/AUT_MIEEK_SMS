import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import models
from backend.config import settings
from backend.db import get_session as db_get_session
from backend.rate_limiting import limiter
from backend.routers import routers_auth, routers_courses
from backend.security import install_csrf_protection


@pytest.fixture()
def csrf_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db(_=None):
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(routers_auth.router, prefix="/api/v1")
    app.include_router(routers_courses.router, prefix="/api/v1")
    app.dependency_overrides[db_get_session] = override_get_db

    limiter.enabled = False
    app.state.limiter = limiter

    prev_enabled = settings.CSRF_ENABLED
    prev_enforce = getattr(settings, "CSRF_ENFORCE_IN_TESTS", False)
    settings.CSRF_ENABLED = True
    settings.CSRF_ENFORCE_IN_TESTS = True
    install_csrf_protection(app)

    client = TestClient(app)
    client.app.state._test_engine = engine

    try:
        yield client
    finally:
        settings.CSRF_ENABLED = prev_enabled
        settings.CSRF_ENFORCE_IN_TESTS = prev_enforce


@pytest.fixture(autouse=True)
def reset_csrf_db(csrf_client):
    engine = csrf_client.app.state._test_engine
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    yield


def _csrf_headers(client: TestClient) -> dict[str, str]:
    resp = client.get("/api/v1/security/csrf")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return {data["header_name"]: data["csrf_token"]}


def _auth_header(client: TestClient, *, email: str = "alice@example.com", password: str = "S3curePass!") -> dict[str, str]:
    payload = {"email": email, "password": password, "full_name": "Alice"}
    csrf = _csrf_headers(client)
    r = client.post("/api/v1/auth/register", json=payload, headers=csrf)
    assert r.status_code in (200, 400)

    csrf = _csrf_headers(client)
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password}, headers=csrf)
    assert login.status_code == 200
    access_token = login.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def _course_payload(code: str = "CSRF101") -> dict:
    return {
        "course_code": code,
        "course_name": "CSRF Test",
        "semester": "Fall",
        "credits": 3,
    }


def test_state_change_rejected_without_csrf(csrf_client):
    auth_headers = _auth_header(csrf_client)
    resp = csrf_client.post("/api/v1/courses", json=_course_payload("CSRF101"), headers=auth_headers)
    assert resp.status_code == 403
    body = resp.json()
    assert body["error"] == "csrf_validation_failed"


def test_state_change_allowed_with_csrf(csrf_client):
    auth_headers = _auth_header(csrf_client)
    csrf_headers = _csrf_headers(csrf_client)
    resp = csrf_client.post(
        "/api/v1/courses",
        json=_course_payload("CSRF102"),
        headers={**auth_headers, **csrf_headers},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["course_code"] == "CSRF102"


def test_csrf_token_rotation_on_refresh(csrf_client):
    _auth_header(csrf_client, email="refresh@example.com", password="StrongP@ss1")
    csrf_headers = _csrf_headers(csrf_client)
    cookie_before = csrf_client.cookies.get(settings.CSRF_COOKIE_NAME)
    refresh_resp = csrf_client.post("/api/v1/auth/refresh", headers=csrf_headers)
    assert refresh_resp.status_code == 200
    assert settings.CSRF_HEADER_NAME in refresh_resp.headers
    cookie_after = csrf_client.cookies.get(settings.CSRF_COOKIE_NAME)
    assert cookie_after and cookie_after != cookie_before


def test_csrf_endpoint_exempted(csrf_client):
    resp = csrf_client.get("/api/v1/security/csrf")
    assert resp.status_code == 200
    assert "csrf_token" in resp.json()
