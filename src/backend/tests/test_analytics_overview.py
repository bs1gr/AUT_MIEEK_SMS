"""Analytics overview endpoints: figures are per live enrollment, from final grades.

Scenario (numbers checked by hand):
- MATH has rules Homework 40% / Final Exam 60%; PHYS has no rules; CHEM is only reached through
  a dropped enrollment.
- s1 (A, A1): MATH 80/70 -> 0.4*80 + 0.6*70 = 74; PHYS 60, 80 -> plain mean 70;
  CHEM dropped (grade 10 must not count). MATH attendance Present, Late, Absent, Excused.
- s2 (A, A2): MATH 40/30 -> 34 (failing); 5 Absent in MATH -> over the 10% Class Participation limit
  (4 of 42 periods), well under the 30% fail limit (12).
- s3 (B, B1): PHYS, no grades -> no final grade (not 0).
- s4 (A, A1): MATH 100/100 but inactive -> left out everywhere.
"""

from __future__ import annotations

import pytest

from backend.models import CourseEnrollment, Student
from backend.routers.routers_analytics import _build_dashboard_export_data
from backend.tests.test_analytics_router import (
    _create_att,
    _create_course,
    _create_grade,
    _post_with_csrf,
)


def _student(client, i: int, year: str, division: str) -> dict:
    response = _post_with_csrf(
        client,
        "/api/v1/students/",
        {
            "first_name": f"S{i}",
            "last_name": f"Overview{i}",
            "email": f"overview{i}@example.com",
            "student_id": f"OV{i:04d}",
            "academic_year": year,
            "class_division": division,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _enroll(client, course_id: int, *student_ids: int) -> None:
    response = _post_with_csrf(client, f"/api/v1/enrollments/course/{course_id}", {"student_ids": list(student_ids)})
    assert response.status_code in (200, 201), response.text


def _grade(client, sid: int, cid: int, category: str, value: float) -> None:
    response = _create_grade(client, sid, cid, f"{category} {value}", category, value)
    assert response.status_code == 201, response.text


def _att(client, sid: int, cid: int, *statuses: str) -> None:
    for period, status in enumerate(statuses, start=1):
        response = _create_att(client, sid, cid, status, period=period)
        assert response.status_code == 201, response.text


@pytest.fixture
def scenario(client, db):
    rules = [{"category": "Homework", "weight": 40.0}, {"category": "Final Exam", "weight": 60.0}]
    math = _create_course(client, "MATH", rules=rules)
    phys = _create_course(client, "PHYS")
    chem = _create_course(client, "CHEM", rules=rules)

    s1 = _student(client, 1, "A", "A1")
    s2 = _student(client, 2, "A", "A2")
    s3 = _student(client, 3, "B", "B1")
    s4 = _student(client, 4, "A", "A1")

    _enroll(client, math["id"], s1["id"], s2["id"], s4["id"])
    _enroll(client, phys["id"], s1["id"], s3["id"])
    _enroll(client, chem["id"], s1["id"])

    _grade(client, s1["id"], math["id"], "Homework", 80)
    _grade(client, s1["id"], math["id"], "Final Exam", 70)
    _grade(client, s1["id"], phys["id"], "Quiz", 60)
    _grade(client, s1["id"], phys["id"], "Quiz", 80)
    _grade(client, s1["id"], chem["id"], "Final Exam", 10)
    _grade(client, s2["id"], math["id"], "Homework", 40)
    _grade(client, s2["id"], math["id"], "Final Exam", 30)
    _grade(client, s4["id"], math["id"], "Homework", 100)
    _grade(client, s4["id"], math["id"], "Final Exam", 100)

    _att(client, s1["id"], math["id"], "Present", "Late", "Absent", "Excused")
    _att(client, s2["id"], math["id"], "Absent", "Absent", "Absent", "Absent", "Absent")

    db.query(CourseEnrollment).filter(
        CourseEnrollment.student_id == s1["id"], CourseEnrollment.course_id == chem["id"]
    ).update({"status": "dropped"})
    db.query(Student).filter(Student.id == s4["id"]).update({"is_active": False})
    db.commit()

    return {"math": math, "phys": phys, "chem": chem, "s1": s1, "s2": s2, "s3": s3, "s4": s4}


def test_student_overview_only_lists_the_students_live_courses(client, scenario):
    response = client.get(f"/api/v1/analytics/student/{scenario['s1']['id']}/overview")
    assert response.status_code == 200, response.text
    data = response.json()

    courses = {c["course_code"]: c for c in data["courses"]}
    assert set(courses) == {"MATH", "PHYS"}  # CHEM was dropped

    math = courses["MATH"]
    assert math["final_grade"] == 74.0
    assert math["grade_basis"] == "rules"
    assert math["class_average"] == 54.0  # (74 + 34) / 2; inactive s4's 100 is left out
    assert (math["rank"], math["ranked_of"]) == (1, 2)
    assert math["attendance"] == {"present": 1, "late": 1, "absent": 1, "excused": 1, "recorded": 4, "rate": 50.0}
    assert math["absence"]["absences"] == 2  # Absent + Excused, as in the absence limit
    assert math["absence"]["status"] == "ok"
    assert [g["percentage"] for g in math["grades"]] == [80.0, 70.0]

    phys = courses["PHYS"]
    assert phys["final_grade"] == 70.0
    assert phys["grade_basis"] == "average"
    assert phys["class_average"] == 70.0  # s3 has no grades yet: not counted as 0
    assert phys["ranked_of"] == 1

    summary = data["summary"]
    assert summary["courses"] == 2
    assert summary["average_final_grade"] == 72.0
    assert (summary["passing"], summary["failing"]) == (2, 0)
    assert summary["attendance"]["rate"] == 50.0
    assert summary["at_risk"] is False


def test_student_overview_ungraded_course_has_no_final_grade(client, scenario):
    data = client.get(f"/api/v1/analytics/student/{scenario['s3']['id']}/overview").json()
    (phys,) = data["courses"]
    assert phys["final_grade"] is None
    assert phys["passing"] is None
    assert phys["rank"] is None
    assert data["summary"]["average_final_grade"] is None
    assert data["summary"]["attendance"]["rate"] is None


def test_student_overview_flags_failing_and_lost_participation(client, scenario):
    data = client.get(f"/api/v1/analytics/student/{scenario['s2']['id']}/overview").json()
    (math,) = data["courses"]
    assert math["final_grade"] == 34.0
    assert math["passing"] is False
    assert math["absence"]["status"] == "ok"
    assert math["absence"]["participation_forfeited"] is True
    assert (math["absence"]["allowed_absences"], math["absence"]["participation_allowed_absences"]) == (12, 4)
    assert math["attendance"]["rate"] == 0.0
    assert data["summary"]["at_risk"] is True


def test_student_overview_unknown_student_is_404(client):
    assert client.get("/api/v1/analytics/student/999999/overview").status_code == 404


def test_class_overview_all_active_students(client, scenario):
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200, response.text
    data = response.json()

    summary = data["summary"]
    assert summary["students"] == 3  # s4 is inactive
    assert summary["courses"] == 2  # CHEM only had a dropped enrollment
    assert summary["enrollments"] == 4
    assert summary["graded_enrollments"] == 3
    assert summary["average_final_grade"] == 59.33  # (74 + 34 + 70) / 3
    assert summary["pass_rate"] == 66.67
    assert summary["attendance_rate"] == 22.22  # 2 attended of 9 recorded
    assert summary["at_risk_students"] == 1

    bands = {b["band"]: b["count"] for b in data["distribution"]}
    assert bands["70-79"] == 2 and bands["0-49"] == 1 and sum(bands.values()) == 3

    courses = {c["course_code"]: c for c in data["courses"]}
    assert courses["MATH"]["average_final_grade"] == 54.0
    assert (courses["MATH"]["passing"], courses["MATH"]["failing"]) == (1, 1)
    assert courses["MATH"]["absence_warning"] == 0
    assert courses["MATH"]["participation_forfeited"] == 1
    assert courses["MATH"]["attendance"] == {
        "present": 1,
        "late": 1,
        "absent": 6,
        "excused": 1,
        "recorded": 9,
        "rate": 22.22,
    }
    assert courses["PHYS"]["students"] == 2 and courses["PHYS"]["graded"] == 1

    students = {s["student_id"]: s for s in data["students"]}
    assert students["OV0002"]["at_risk"] is True
    assert students["OV0002"]["failing_courses"] == ["Course MATH"]
    assert students["OV0002"]["participation_forfeited"] == ["Course MATH"]
    assert students["OV0003"]["average_final_grade"] is None

    assert data["filters"]["academic_years"] == ["A", "B"]


def test_class_overview_filters_by_year_division_and_course(client, scenario):
    year = client.get("/api/v1/analytics/overview", params={"academic_year": "A"}).json()
    assert {s["student_id"] for s in year["students"]} == {"OV0001", "OV0002"}
    assert year["filters"]["class_divisions"] == ["A1", "A2"]

    division = client.get("/api/v1/analytics/overview", params={"academic_year": "A", "class_division": "A2"}).json()
    assert [s["student_id"] for s in division["students"]] == ["OV0002"]
    assert [c["course_code"] for c in division["courses"]] == ["MATH"]
    assert division["summary"]["average_final_grade"] == 34.0

    course = client.get("/api/v1/analytics/overview", params={"course_id": scenario["phys"]["id"]}).json()
    assert {s["student_id"] for s in course["students"]} == {"OV0001", "OV0003"}
    assert [c["course_code"] for c in course["courses"]] == ["PHYS"]
    assert course["summary"]["average_final_grade"] == 70.0


def test_export_uses_the_overview_figures(db, scenario):
    data = _build_dashboard_export_data(db)
    assert data["summary"] == {
        "total_students": 3,
        "total_courses": 2,
        "average_grade": 59.33,
        "average_attendance": 22.22,
    }
    courses = {c["label"]: c for c in data["course_averages"]}
    assert courses["Course MATH"] == {"label": "Course MATH", "count": 2, "average": 54.0}
    classes = {c["label"]: c for c in data["class_averages"]}
    assert classes["A"]["count"] == 2 and classes["A"]["average"] == 53.0  # mean of 72 and 34
    assert classes["B"]["average"] == 0  # nothing graded yet
