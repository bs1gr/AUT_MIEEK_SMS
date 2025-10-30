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


def test_root_endpoint(client):
    """Test the root endpoint returns API metadata."""
    r = client.get("/")
    assert r.status_code == 200

    data = r.json()
    assert data["message"] == "Student Management System API"
    assert "version" in data
    assert data["status"] == "running"
    assert "documentation" in data
    assert "endpoints" in data
