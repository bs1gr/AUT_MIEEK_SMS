"""POST /api/v1/attendance/sheet: one course's attendance and daily performance for one date.

The endpoint replaces a burst of per-record requests, so the tests check that it leaves the
database exactly as those requests would have: existing rows updated, missing ones created,
nothing else touched.
"""

from datetime import date, timedelta

import pytest

pytestmark = pytest.mark.auth_required

TODAY = str(date.today())
SHEET_URL = "/api/v1/attendance/sheet"


def _student(client, code: str) -> int:
    response = client.post(
        "/api/v1/students/",
        json={"student_id": code, "email": f"{code.lower()}@test.com", "first_name": "Sheet", "last_name": code},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _course(client, code: str = "SHEET101") -> int:
    response = client.post(
        "/api/v1/courses/",
        json={"course_code": code, "course_name": "Sheet course", "semester": "Fall 2026", "credits": 3},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _attendance(client, course_id: int, day: str = TODAY) -> dict:
    response = client.get(f"/api/v1/attendance/date/{day}/course/{course_id}")
    assert response.status_code == 200, response.text
    return {(row["student_id"], row["period_number"]): row for row in response.json()}


def _performance(client, course_id: int, day: str = TODAY) -> dict:
    response = client.get(f"/api/v1/daily-performance/date/{day}/course/{course_id}")
    assert response.status_code == 200, response.text
    return {(row["student_id"], row["category"]): row for row in response.json()}


def test_sheet_creates_a_whole_class_in_one_request(client):
    course_id = _course(client)
    students = [_student(client, f"SH{i:03d}") for i in range(5)]

    response = client.post(
        SHEET_URL,
        json={
            "course_id": course_id,
            "date": TODAY,
            "attendance": [
                {"student_id": student_id, "period_number": period, "status": "Present"}
                for student_id in students
                for period in (1, 2)
            ],
            "daily_performance": [{"student_id": students[0], "category": "Class Participation", "score": 8}],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["attendance_created"] == 10
    assert body["performance_created"] == 1
    assert body["skipped_student_ids"] == []

    saved = _attendance(client, course_id)
    assert len(saved) == 10
    assert {row["status"] for row in saved.values()} == {"Present"}
    assert _performance(client, course_id)[(students[0], "Class Participation")]["score"] == 8


def test_sheet_updates_existing_rows_instead_of_duplicating_them(client):
    course_id = _course(client)
    first, second = _student(client, "SHU001"), _student(client, "SHU002")
    sheet = {
        "course_id": course_id,
        "date": TODAY,
        "attendance": [
            {"student_id": first, "period_number": 1, "status": "Present"},
            {"student_id": second, "period_number": 1, "status": "Present"},
        ],
        "daily_performance": [{"student_id": first, "category": "Homework", "score": 5}],
    }
    assert client.post(SHEET_URL, json=sheet).status_code == 200
    ids_before = {key: row["id"] for key, row in _attendance(client, course_id).items()}

    sheet["attendance"][1]["status"] = "Absent"
    sheet["daily_performance"][0]["score"] = 9
    response = client.post(SHEET_URL, json=sheet)

    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["attendance_created"], body["attendance_updated"], body["attendance_unchanged"]) == (0, 1, 1)
    assert (body["performance_created"], body["performance_updated"]) == (0, 1)

    saved = _attendance(client, course_id)
    assert {key: row["id"] for key, row in saved.items()} == ids_before  # same rows, no duplicates
    assert saved[(first, 1)]["status"] == "Present"
    assert saved[(second, 1)]["status"] == "Absent"
    performance = _performance(client, course_id)
    assert len(performance) == 1
    assert performance[(first, "Homework")]["score"] == 9


def test_sheet_updates_a_row_created_by_the_per_record_endpoint(client):
    course_id = _course(client)
    student_id = _student(client, "SHP001")
    created = client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": TODAY, "status": "Late", "period_number": 2},
    )
    assert created.status_code == 201

    response = client.post(
        SHEET_URL,
        json={
            "course_id": course_id,
            "date": TODAY,
            "attendance": [{"student_id": student_id, "period_number": 2, "status": "Excused"}],
        },
    )

    assert response.status_code == 200, response.text
    saved = _attendance(client, course_id)
    assert list(saved) == [(student_id, 2)]
    assert saved[(student_id, 2)]["id"] == created.json()["id"]
    assert saved[(student_id, 2)]["status"] == "Excused"


def test_sheet_removes_performance_scores_and_leaves_other_days_alone(client):
    course_id = _course(client)
    student_id = _student(client, "SHD001")
    yesterday = str(date.today() - timedelta(days=1))
    for day in (yesterday, TODAY):
        response = client.post(
            SHEET_URL,
            json={
                "course_id": course_id,
                "date": day,
                "attendance": [{"student_id": student_id, "status": "Present"}],
                "daily_performance": [
                    {"student_id": student_id, "category": "Homework", "score": 7},
                    {"student_id": student_id, "category": "Behaviour", "score": 6},
                ],
            },
        )
        assert response.status_code == 200, response.text

    response = client.post(
        SHEET_URL,
        json={
            "course_id": course_id,
            "date": TODAY,
            "daily_performance_deletes": [{"student_id": student_id, "category": "Homework"}],
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["performance_deleted"] == 1
    assert list(_performance(client, course_id)) == [(student_id, "Behaviour")]
    assert len(_performance(client, course_id, yesterday)) == 2
    assert len(_attendance(client, course_id)) == 1  # attendance not mentioned, not touched


def test_sheet_skips_a_student_that_no_longer_exists_and_saves_the_rest(client):
    course_id = _course(client)
    student_id = _student(client, "SHS001")

    response = client.post(
        SHEET_URL,
        json={
            "course_id": course_id,
            "date": TODAY,
            "attendance": [
                {"student_id": student_id, "status": "Present"},
                {"student_id": 987654, "status": "Absent"},
            ],
            "daily_performance": [{"student_id": 987654, "category": "Homework", "score": 3}],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["skipped_student_ids"] == [987654]
    assert body["attendance_created"] == 1
    assert body["performance_created"] == 0
    assert list(_attendance(client, course_id)) == [(student_id, 1)]


def test_sheet_for_an_unknown_course_is_404(client):
    response = client.post(SHEET_URL, json={"course_id": 999999, "date": TODAY, "attendance": []})
    assert response.status_code == 404


def test_sheet_rejects_an_invalid_status(client):
    course_id = _course(client)
    student_id = _student(client, "SHV001")
    response = client.post(
        SHEET_URL,
        json={
            "course_id": course_id,
            "date": TODAY,
            "attendance": [{"student_id": student_id, "status": "Sleeping"}],
        },
    )
    assert response.status_code == 422
    assert _attendance(client, course_id) == {}


def test_an_empty_sheet_is_accepted_and_changes_nothing(client):
    course_id = _course(client)
    response = client.post(SHEET_URL, json={"course_id": course_id, "date": TODAY})
    assert response.status_code == 200
    assert response.json()["attendance_created"] == 0
