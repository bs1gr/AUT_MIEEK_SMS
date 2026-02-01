from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.models import User
from backend.security.password_hash import get_password_hash


def _create_admin_token(client: TestClient, db) -> str:
    email = "reports_admin@example.com"
    password = "AdminPass123!"
    admin = User(
        email=email,
        hashed_password=get_password_hash(password),
        role="admin",
        is_active=True,
        full_name="Reports Admin",
    )
    db.add(admin)
    db.commit()

    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json().get("access_token")
    assert token
    return token


def _template_payload(name: str = "Template A") -> dict:
    return {
        "name": name,
        "description": "Template description",
        "category": "academic",
        "report_type": "student",
        "fields": {"columns": ["first_name", "last_name"]},
        "filters": {"status": "active"},
        "aggregations": None,
        "sort_by": {"field": "last_name", "direction": "asc"},
        "default_export_format": "pdf",
        "default_include_charts": True,
        "is_system": False,
    }


def _report_payload(name: str = "Report A") -> dict:
    return {
        "name": name,
        "description": "Report description",
        "report_type": "student",
        "template_id": None,
        "fields": {"columns": ["first_name", "last_name", "email"]},
        "filters": {"status": "active"},
        "aggregations": {"count": "students"},
        "sort_by": {"field": "last_name", "direction": "asc"},
        "export_format": "pdf",
        "include_charts": True,
        "schedule_enabled": False,
        "schedule_frequency": None,
        "schedule_cron": None,
        "email_recipients": None,
        "email_enabled": False,
    }


def test_custom_report_requires_auth(client: TestClient):
    response = client.post("/api/v1/custom-reports", json=_report_payload())
    assert response.status_code == 401


def test_template_endpoints(client: TestClient, db):
    token = _create_admin_token(client, db)
    headers = {"Authorization": f"Bearer {token}"}

    create = client.post("/api/v1/custom-reports/templates", json=_template_payload(), headers=headers)
    assert create.status_code == 200, create.text
    payload = create.json()
    assert payload["success"] is True
    template_id = payload["data"]["id"]

    listed = client.get("/api/v1/custom-reports/templates", headers=headers)
    assert listed.status_code == 200
    listed_data = listed.json()
    assert listed_data["success"] is True
    assert any(t["id"] == template_id for t in listed_data["data"])

    fetched = client.get(f"/api/v1/custom-reports/templates/{template_id}", headers=headers)
    assert fetched.status_code == 200
    fetched_data = fetched.json()
    assert fetched_data["success"] is True
    assert fetched_data["data"]["id"] == template_id

    updated = client.put(
        f"/api/v1/custom-reports/templates/{template_id}",
        json={"name": "Template Updated", "is_active": False},
        headers=headers,
    )
    assert updated.status_code == 200
    updated_data = updated.json()
    assert updated_data["success"] is True
    assert updated_data["data"]["name"] == "Template Updated"
    assert updated_data["data"]["is_active"] is False

    deleted = client.delete(f"/api/v1/custom-reports/templates/{template_id}", headers=headers)
    assert deleted.status_code == 200
    deleted_data = deleted.json()
    assert deleted_data["success"] is True
    assert "Template" in deleted_data["data"]["message"]


def test_custom_report_flow(client: TestClient, db):
    token = _create_admin_token(client, db)
    headers = {"Authorization": f"Bearer {token}"}

    create = client.post("/api/v1/custom-reports", json=_report_payload(), headers=headers)
    assert create.status_code == 200
    create_data = create.json()
    assert create_data["success"] is True
    report_id = create_data["data"]["id"]

    listed = client.get("/api/v1/custom-reports", headers=headers)
    assert listed.status_code == 200
    listed_data = listed.json()
    assert listed_data["success"] is True
    assert any(r["id"] == report_id for r in listed_data["data"])

    fetched = client.get(f"/api/v1/custom-reports/{report_id}", headers=headers)
    assert fetched.status_code == 200
    fetched_data = fetched.json()
    assert fetched_data["success"] is True
    assert fetched_data["data"]["id"] == report_id

    updated = client.put(
        f"/api/v1/custom-reports/{report_id}",
        json={"name": "Report Updated"},
        headers=headers,
    )
    assert updated.status_code == 200
    updated_data = updated.json()
    assert updated_data["success"] is True
    assert updated_data["data"]["name"] == "Report Updated"

    generated = client.post(
        f"/api/v1/custom-reports/{report_id}/generate",
        json={"export_format": "pdf", "include_charts": True},
        headers=headers,
    )
    assert generated.status_code == 200
    generated_data = generated.json()
    assert generated_data["success"] is True
    generated_id = generated_data["data"]["generated_report_id"]

    history = client.get(f"/api/v1/custom-reports/{report_id}/generated", headers=headers)
    assert history.status_code == 200
    history_data = history.json()
    assert history_data["success"] is True
    assert any(r["id"] == generated_id for r in history_data["data"])

    patched = client.patch(
        f"/api/v1/custom-reports/{report_id}/generated/{generated_id}",
        json={
            "status": "completed",
            "generation_duration_seconds": 1.2,
            "email_sent": True,
            "email_sent_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=headers,
    )
    assert patched.status_code == 200
    patched_data = patched.json()
    assert patched_data["success"] is True
    assert patched_data["data"]["status"] == "completed"

    stats = client.get("/api/v1/custom-reports/statistics", headers=headers)
    assert stats.status_code == 200
    stats_data = stats.json()
    assert stats_data["success"] is True
    assert stats_data["data"]["total_reports"] >= 1

    bulk = client.post(
        "/api/v1/custom-reports/bulk-generate",
        json={"report_ids": [report_id], "export_format": "pdf"},
        headers=headers,
    )
    assert bulk.status_code == 200
    bulk_data = bulk.json()
    assert bulk_data["success"] is True
    assert bulk_data["data"]["successful"] == 1

    deleted = client.delete(f"/api/v1/custom-reports/{report_id}", headers=headers)
    assert deleted.status_code == 200
    deleted_data = deleted.json()
    assert deleted_data["success"] is True
    assert "Report" in deleted_data["data"]["message"]
