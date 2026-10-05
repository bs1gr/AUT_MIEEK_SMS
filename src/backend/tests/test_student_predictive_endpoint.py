"""GET /analytics/predictive/student feeds the Student Profile's predictions panel.

The router called AnalyticsService.get_student_predictive_analytics, which never existed
(lost when the analytics feature was deferred in March 2026), so the endpoint always
answered 500 and the panel was never shown.
"""

from datetime import date, timedelta

from backend.models import Attendance, Course, Grade, Student

URL = "/api/v1/analytics/predictive/student"


def _student_with_history(db, grades, statuses):
    student = Student(student_id="PRED1", first_name="Maria", last_name="G", email="maria@example.com")
    course = Course(course_code="AUT101", course_name="Engines", semester="2026A", credits=3)
    db.add_all([student, course])
    db.commit()
    start = date(2026, 9, 7)  # a Monday
    for i, value in enumerate(grades):
        db.add(Grade(student_id=student.id, course_id=course.id, assignment_name=f"T{i}", category="Exam",
                     grade=value, max_grade=20, date_submitted=start + timedelta(weeks=i)))
    for i, status in enumerate(statuses):
        db.add(Attendance(student_id=student.id, course_id=course.id, date=start + timedelta(days=i), status=status))
    db.commit()
    return student


def test_predictions_from_grades_and_attendance(client, db, admin_headers):
    student = _student_with_history(db, [10, 12, 14, 16], ["Present", "Absent", "Excused", "Present", "Late"])
    response = client.get(URL, params={"student_id": student.id}, headers=admin_headers)
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["insufficient_data"] == []
    assert body["grade_trend"] == "improving"
    assert len(body["grade_predictions"]) == 4
    assert {"date", "predicted_grade", "confidence"} <= set(body["grade_predictions"][0])

    # Present and Excused count as attended, as on the Students page: 3 of 5.
    risk = body["risk_assessment"]
    assert risk["attendance_rate"] == 60.0
    assert risk["risk_level"] in {"low", "medium", "high"}
    # Codes, not English sentences: the frontend translates them.
    assert all(" " not in code for code in risk["recommendations"])
    assert risk["factors"]["grades"] in {"good", "concerning", "critical"}
    assert body["final_grade_projection"]["recommendation"] in {"excellent", "good", "passing", "at_risk"}
    assert {p["day"] for p in body["attendance_predictions"]} <= {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}


def test_student_without_history_gets_empty_sections(client, db, admin_headers):
    student = _student_with_history(db, [], [])
    body = client.get(URL, params={"student_id": student.id}, headers=admin_headers).json()
    assert body["insufficient_data"] == ["grades", "attendance"]
    assert body["grade_predictions"] == []
    assert body["risk_assessment"] is None
    assert body["final_grade_projection"] is None


def test_unknown_student_is_404_and_missing_id_is_400(client, admin_headers):
    assert client.get(URL, params={"student_id": 999999}, headers=admin_headers).status_code == 404
    assert client.get(URL, headers=admin_headers).status_code == 400
