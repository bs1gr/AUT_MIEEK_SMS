"""Tests for backend.routers.routers_highlights (student highlight CRUD).

Previously untested.
"""

import pytest

from backend.models import Student


@pytest.fixture
def student(db):
    s = Student(
        first_name="High",
        last_name="Light",
        email="highlight-student@example.com",
        student_id="HL1",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _create_payload(student_id, **overrides):
    payload = {
        "student_id": student_id,
        "semester": "Fall 2026",
        "rating": 8,
        "category": "Academic",
        "highlight_text": "Great improvement this semester",
        "is_positive": True,
    }
    payload.update(overrides)
    return payload


class TestCreate:
    def test_create_highlight(self, client, student):
        response = client.post("/api/v1/highlights/", json=_create_payload(student.id))
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["student_id"] == student.id
        assert body["highlight_text"] == "Great improvement this semester"
        assert body["is_positive"] is True

    def test_create_highlight_missing_student_404(self, client):
        response = client.post("/api/v1/highlights/", json=_create_payload(999999))
        assert response.status_code == 404, response.text

    def test_create_highlight_invalid_rating_rejected(self, client, student):
        response = client.post("/api/v1/highlights/", json=_create_payload(student.id, rating=99))
        assert response.status_code == 422


class TestListAndGet:
    def test_list_highlights(self, client, student):
        client.post("/api/v1/highlights/", json=_create_payload(student.id))

        response = client.get("/api/v1/highlights/")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total"] >= 1
        assert any(h["student_id"] == student.id for h in body["highlights"])

    def test_list_highlights_filtered_by_student(self, client, student, db):
        other = Student(first_name="Other", last_name="One", email="other-hl@example.com", student_id="HL2")
        db.add(other)
        db.commit()
        db.refresh(other)

        client.post("/api/v1/highlights/", json=_create_payload(student.id))
        client.post("/api/v1/highlights/", json=_create_payload(other.id))

        response = client.get("/api/v1/highlights/", params={"student_id": student.id})
        body = response.json()
        assert all(h["student_id"] == student.id for h in body["highlights"])

    def test_get_highlight_by_id(self, client, student):
        created = client.post("/api/v1/highlights/", json=_create_payload(student.id)).json()

        response = client.get(f"/api/v1/highlights/{created['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_get_highlight_missing_404(self, client):
        response = client.get("/api/v1/highlights/999999")
        assert response.status_code == 404

    def test_get_student_highlights(self, client, student):
        client.post("/api/v1/highlights/", json=_create_payload(student.id, semester="Fall 2026"))
        client.post("/api/v1/highlights/", json=_create_payload(student.id, semester="Spring 2027"))

        response = client.get(f"/api/v1/highlights/student/{student.id}")
        assert response.status_code == 200
        assert len(response.json()) == 2

        filtered = client.get(f"/api/v1/highlights/student/{student.id}", params={"semester": "Fall 2026"})
        assert len(filtered.json()) == 1


class TestUpdateAndDelete:
    def test_update_highlight(self, client, student):
        created = client.post("/api/v1/highlights/", json=_create_payload(student.id)).json()

        response = client.put(
            f"/api/v1/highlights/{created['id']}",
            json={"highlight_text": "Updated text", "rating": 5},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["highlight_text"] == "Updated text"
        assert body["rating"] == 5

    def test_update_highlight_missing_404(self, client):
        response = client.put("/api/v1/highlights/999999", json={"rating": 5})
        assert response.status_code == 404

    def test_delete_highlight(self, client, student):
        created = client.post("/api/v1/highlights/", json=_create_payload(student.id)).json()

        response = client.delete(f"/api/v1/highlights/{created['id']}")
        assert response.status_code == 204

        follow_up = client.get(f"/api/v1/highlights/{created['id']}")
        assert follow_up.status_code == 404

    def test_delete_highlight_missing_404(self, client):
        response = client.delete("/api/v1/highlights/999999")
        assert response.status_code == 404
