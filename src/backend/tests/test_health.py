from __future__ import annotations


def test_health_endpoint(client):
    """Test the /health endpoint returns expected fields."""
    r = client.get("/health")
    assert r.status_code == 200

    data = r.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "timestamp" in data
    assert "statistics" in data
    assert "students" in data["statistics"]
    assert "courses" in data["statistics"]
    assert "services" in data
    assert "network" in data
    assert "database_target" in data
    assert data["database_target"]["engine"] in {"sqlite", "postgresql", "unknown"}


def test_database_target_follows_the_url_in_use(monkeypatch):
    """SMS Lite on QNAP sets a PostgreSQL DATABASE_URL but leaves DATABASE_ENGINE at "sqlite";
    the System page used to show it as SQLite with no target."""
    from backend.app_factory import _build_database_target_evidence
    from backend.config import settings

    monkeypatch.setattr(settings, "DATABASE_ENGINE", "sqlite", raising=False)
    monkeypatch.setattr(settings, "POSTGRES_HOST", None, raising=False)
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql+psycopg://sms:s3cret-pw@172.16.0.2:55433/student_management", raising=False
    )
    target = _build_database_target_evidence()
    assert target["engine"] == "postgresql"
    assert (target["host"], target["port"], target["database"]) == ("172.16.0.2", 55433, "student_management")
    assert target["is_remote"] is True
    assert "s3cret-pw" not in str(target)  # the health payload never carries credentials

    monkeypatch.setattr(settings, "DATABASE_URL", "sqlite:///./data/sms_lite.db", raising=False)
    target = _build_database_target_evidence()
    assert (target["engine"], target["database"], target["is_remote"]) == ("sqlite", "./data/sms_lite.db", False)


def test_root_endpoint(client):
    """Test the root endpoint returns API metadata (fallback when no frontend)."""
    r = client.get("/")
    assert r.status_code == 200
    # In test environment (no built frontend), returns JSON metadata
    data = r.json()
    assert data["message"] == "Student Management System API"
    assert "version" in data
    assert data["status"] == "running"
