"""Tests for backend.routers.routers_feedback.

Previously untested despite being a public, unauthenticated write endpoint
(POST /feedback/ accepts anonymous submissions) alongside admin/teacher-only
listing, GitHub import, archive/unarchive, and delete operations.
"""

from backend.models import AuditLog


class TestSubmitFeedback:
    def test_submit_feedback_anonymous(self, client, db):
        response = client.post("/api/v1/feedback/", json={"feedback": "This app is great"})
        assert response.status_code == 201, response.text
        assert response.json() == {"status": "ok"}

        entry = db.query(AuditLog).filter(AuditLog.action == "feedback").first()
        assert entry is not None
        assert entry.user_id is None
        assert entry.details["feedback"] == "This app is great"

    def test_submit_feedback_rejects_empty(self, client):
        response = client.post("/api/v1/feedback/", json={"feedback": "   "})
        assert response.status_code == 400

    def test_submit_feedback_rejects_missing_field(self, client):
        response = client.post("/api/v1/feedback/", json={})
        assert response.status_code == 400


class TestListEntries:
    def test_list_entries_includes_submitted_feedback(self, client):
        client.post("/api/v1/feedback/", json={"feedback": "Listed feedback"})

        response = client.get("/api/v1/feedback/entries")
        assert response.status_code == 200, response.text
        body = response.json()
        bodies = [item["body"] for item in body["data"]["items"]]
        assert "Listed feedback" in bodies

    def test_list_entries_excludes_archived_by_default(self, client, db):
        client.post("/api/v1/feedback/", json={"feedback": "To be archived"})
        entry = db.query(AuditLog).filter(AuditLog.action == "feedback").first()
        client.patch(f"/api/v1/feedback/entries/{entry.id}/archive")

        response = client.get("/api/v1/feedback/entries")
        bodies = [item["body"] for item in response.json()["data"]["items"]]
        assert "To be archived" not in bodies

        included = client.get("/api/v1/feedback/entries", params={"include_archived": True})
        bodies_included = [item["body"] for item in included.json()["data"]["items"]]
        assert "To be archived" in bodies_included


class TestGithubImport:
    def test_import_github_feedback(self, client, db):
        payload = {
            "items": [
                {"kind": "issue", "title": "Bug report", "body": "Something broke", "source_id": "123"},
            ]
        }
        response = client.post("/api/v1/feedback/github/import", json=payload)
        assert response.status_code == 201, response.text
        assert response.json()["data"]["imported"] == 1

        entry = db.query(AuditLog).filter(AuditLog.action == "feedback_github").first()
        assert entry is not None
        assert entry.details["title"] == "Bug report"

    def test_import_github_feedback_rejects_empty_items(self, client):
        response = client.post("/api/v1/feedback/github/import", json={"items": []})
        assert response.status_code == 400


class TestArchiveLifecycle:
    def test_archive_then_unarchive_roundtrip(self, client, db):
        client.post("/api/v1/feedback/", json={"feedback": "Archive me"})
        entry = db.query(AuditLog).filter(AuditLog.action == "feedback").first()

        archive_resp = client.patch(f"/api/v1/feedback/entries/{entry.id}/archive")
        assert archive_resp.json()["data"]["archived"] is True
        db.refresh(entry)
        assert entry.action == "feedback_archived"

        unarchive_resp = client.patch(f"/api/v1/feedback/entries/{entry.id}/unarchive")
        assert unarchive_resp.json()["data"]["archived"] is False
        db.refresh(entry)
        assert entry.action == "feedback"

    def test_archive_missing_entry_404(self, client):
        response = client.patch("/api/v1/feedback/entries/999999/archive")
        assert response.status_code == 404

    def test_unarchive_non_archived_entry_is_noop(self, client, db):
        client.post("/api/v1/feedback/", json={"feedback": "Never archived"})
        entry = db.query(AuditLog).filter(AuditLog.action == "feedback").first()

        response = client.patch(f"/api/v1/feedback/entries/{entry.id}/unarchive")
        assert response.json()["data"]["archived"] is False
        db.refresh(entry)
        assert entry.action == "feedback"


class TestDelete:
    def test_delete_feedback_entry(self, client, db):
        client.post("/api/v1/feedback/", json={"feedback": "Delete me"})
        entry = db.query(AuditLog).filter(AuditLog.action == "feedback").first()

        response = client.delete(f"/api/v1/feedback/entries/{entry.id}")
        assert response.json()["data"]["deleted"] is True
        assert db.query(AuditLog).filter(AuditLog.id == entry.id).first() is None

    def test_delete_missing_entry_404(self, client):
        response = client.delete("/api/v1/feedback/entries/999999")
        assert response.status_code == 404

    def test_delete_unrelated_audit_log_rejected(self, client, db):
        entry = AuditLog(action="login", resource="auth", success=True)
        db.add(entry)
        db.commit()
        db.refresh(entry)

        response = client.delete(f"/api/v1/feedback/entries/{entry.id}")
        assert response.status_code == 400
