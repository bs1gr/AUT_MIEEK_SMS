from __future__ import annotations

from datetime import date
from sqlalchemy import event

from backend.tests.conftest import engine


def _create_student(client, i: int = 1):
    return client.post(
        "/api/v1/students/",
        json={
            "first_name": f"S{i}",
            "last_name": "Test",
            "email": f"s{i}@example.com",
            "student_id": f"SID{i:04d}",
        },
    ).json()


def _create_course(client, code: str, rules=None, absence_penalty: float = 0.0, credits: int = 3):
    payload = {
        "course_code": code,
        "course_name": f"Course {code}",
        "semester": "Fall 2025",
        "credits": credits,
        "absence_penalty": absence_penalty,
    }
    if rules is not None:
        payload["evaluation_rules"] = rules
    return client.post("/api/v1/courses/", json=payload).json()


def _create_grade(
    client, student_id: int, course_id: int, name: str, category: str, grade: float, max_grade: float = 100.0
):
    return client.post(
        "/api/v1/grades/",
        json={
            "student_id": student_id,
            "course_id": course_id,
            "assignment_name": name,
            "category": category,
            "grade": grade,
            "max_grade": max_grade,
            "weight": 1.0,
            "date_assigned": date.today().isoformat(),
            "date_submitted": date.today().isoformat(),
        },
    )


def _create_dp(client, student_id: int, course_id: int, category: str, score: float, max_score: float = 10.0):
    return client.post(
        "/api/v1/daily-performance/",
        json={
            "student_id": student_id,
            "course_id": course_id,
            "date": date.today().isoformat(),
            "category": category,
            "score": score,
            "max_score": max_score,
        },
    )


def _create_att(client, student_id: int, course_id: int, status: str, period: int = 1):
    return client.post(
        "/api/v1/attendance/",
        json={
            "student_id": student_id,
            "course_id": course_id,
            "date": date.today().isoformat(),
            "status": status,
            "period_number": period,
        },
    )


def test_final_grade_with_grades_dailyperf_and_absence_penalty(client):
    """End-to-end check of final grade with: rules, grades, daily perf (multiplier), and absence penalty."""
    s = _create_student(client)
    rules = [
        {"category": "Homework", "weight": 30.0, "includeDailyPerformance": True, "dailyPerformanceMultiplier": 1.0},
        {"category": "Midterm", "weight": 30.0},
        {"category": "Final Exam", "weight": 40.0},
    ]
    c = _create_course(client, "CS101", rules=rules, absence_penalty=2.0)

    # Grades: Homework (80/100, 90/100), Midterm (70/100), Final (85/100)
    assert _create_grade(client, s["id"], c["id"], "HW1", "Homework", 80).status_code == 201
    assert _create_grade(client, s["id"], c["id"], "HW2", "Homework", 90).status_code == 201
    assert _create_grade(client, s["id"], c["id"], "Midterm", "Midterm", 70).status_code == 201
    assert _create_grade(client, s["id"], c["id"], "Final", "Final Exam", 85).status_code == 201

    # Daily performance for Homework (included, multiplier=1.0): 9/10 (90%), 7/10 (70%)
    assert _create_dp(client, s["id"], c["id"], "Homework", 9, 10).status_code == 200
    assert _create_dp(client, s["id"], c["id"], "Homework", 7, 10).status_code == 200

    # Attendance: 4 Present, 1 Absent (absence penalty applies: 1 * 2 = 2 points deduction)
    for i, st in enumerate(("Present", "Present", "Present", "Present", "Absent"), start=1):
        assert _create_att(client, s["id"], c["id"], st, period=i).status_code == 201

    r = client.get(f"/api/v1/analytics/student/{s['id']}/course/{c['id']}/final-grade")
    assert r.status_code == 200, r.text
    data = r.json()

    # Expected computation (rounded to 2 decimals): 77.75%
    assert data["percentage"] == 77.75
    assert data["final_grade"] == 77.75
    assert data["letter_grade"] == "C"
    assert data["gpa"] == round(77.75 / 100 * 4, 2)
    assert data["total_weight_used"] == 100.0
    assert data["absence_penalty"] == 2.0
    assert data["unexcused_absences"] == 1
    assert data["absence_deduction"] == 2.0

    # Category breakdown sanity checks
    breakdown = data["category_breakdown"]
    assert set(breakdown.keys()) == {"Homework", "Midterm", "Final Exam"}
    # Homework average should be around 82.5 with our weighted approach
    assert round(breakdown["Homework"]["average"], 2) == 82.5


def test_final_grade_without_rules_returns_error(client):
    s = _create_student(client, 2)
    c = _create_course(client, "C0", rules=[], absence_penalty=0.0)

    r = client.get(f"/api/v1/analytics/student/{s['id']}/course/{c['id']}/final-grade")
    assert r.status_code == 200
    data = r.json()
    assert "error" in data
    assert "rules" in data["error"].lower()


def test_final_grade_with_attendance_category(client):
    """When Attendance is a category, it contributes Present/Total percentage to that category."""
    s = _create_student(client, 3)
    rules = [
        {"category": "Attendance", "weight": 20.0},
        {"category": "Homework", "weight": 80.0, "includeDailyPerformance": False},
    ]
    c = _create_course(client, "CATT", rules=rules, absence_penalty=0.0)

    # Homework perfect score -> 100% average in Homework
    assert _create_grade(client, s["id"], c["id"], "HW1", "Homework", 100).status_code == 201

    # Attendance: 2 present, 1 absent => 66.67% attendance category
    for i, st in enumerate(("Present", "Present", "Absent"), start=1):
        assert _create_att(client, s["id"], c["id"], st, period=i).status_code == 201

    r = client.get(f"/api/v1/analytics/student/{s['id']}/course/{c['id']}/final-grade")
    assert r.status_code == 200
    data = r.json()

    # 80% from Homework + 13.33% from Attendance ≈ 93.33%
    assert data["percentage"] == 93.33
    assert data["letter_grade"] == "A"
    assert data["absence_penalty"] == 0.0
    assert data["absence_deduction"] == 0.0
    assert data["unexcused_absences"] == 0


def test_final_grade_course_not_found(client):
    s = _create_student(client, 4)
    r = client.get(f"/api/v1/analytics/student/{s['id']}/course/99999/final-grade")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "not found" in detail.lower()


def test_student_all_courses_summary_with_mixed_courses(client):
    s = _create_student(client, 5)

    rules_valid_a = [
        {
            "category": "Homework",
            "weight": 50.0,
            "includeDailyPerformance": True,
            "dailyPerformanceMultiplier": 0.5,
        },
        {"category": "Final", "weight": 50.0},
    ]
    rules_valid_b = [{"category": "Project", "weight": 100.0, "includeDailyPerformance": False}]

    course_a = _create_course(client, "MIX1", rules=rules_valid_a, absence_penalty=0.0, credits=3)
    course_b = _create_course(client, "MIX2", rules=rules_valid_b, absence_penalty=0.0, credits=2)
    course_invalid = _create_course(client, "MIX0", rules=[], absence_penalty=0.0, credits=4)

    assert _create_grade(client, s["id"], course_a["id"], "HW1", "Homework", 80).status_code == 201
    assert _create_dp(client, s["id"], course_a["id"], "Homework", 8, 10).status_code == 200
    assert _create_grade(client, s["id"], course_a["id"], "Final", "Final", 90).status_code == 201

    assert _create_grade(client, s["id"], course_b["id"], "Project", "Project", 95).status_code == 201

    # Ensure the invalid course is considered when gathering course IDs but skipped due to missing rules
    assert _create_grade(client, s["id"], course_invalid["id"], "Quiz", "Quiz", 100).status_code == 201

    r = client.get(f"/api/v1/analytics/student/{s['id']}/all-courses-summary")
    assert r.status_code == 200
    data = r.json()

    assert data["student"]["id"] == s["id"]
    assert data["total_credits"] == course_a["credits"] + course_b["credits"]
    assert len(data["courses"]) == 2

    courses_by_code = {c["course_code"]: c for c in data["courses"]}
    assert set(courses_by_code.keys()) == {"MIX1", "MIX2"}

    course_a_summary = courses_by_code["MIX1"]
    assert course_a_summary["letter_grade"] == "B"
    assert course_a_summary["final_grade"] == 85.0

    course_b_summary = courses_by_code["MIX2"]
    assert course_b_summary["letter_grade"] == "A"
    assert course_b_summary["final_grade"] == 95.0

    assert round(data["overall_gpa"], 2) == 3.56


def test_student_all_courses_summary_student_not_found(client):
    r = client.get("/api/v1/analytics/student/9999/all-courses-summary")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "not found" in detail.lower()


def test_student_all_courses_summary_limits_queries(client):
    student = _create_student(client, 7)

    rules = [{"category": "Homework", "weight": 100.0}]
    courses = [
        _create_course(client, f"OPT{i}", rules=rules, absence_penalty=0.0, credits=3)
        for i in range(4)
    ]

    for idx, course in enumerate(courses):
        assert _create_grade(client, student["id"], course["id"], f"HW{idx}", "Homework", 80 + idx).status_code == 201
        assert _create_dp(client, student["id"], course["id"], "Homework", 8, 10).status_code == 200
        assert _create_att(client, student["id"], course["id"], "Present", period=idx + 1).status_code == 201

    executed_statements = []

    def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        normalized = statement.strip().upper()
        if normalized.startswith(("PRAGMA", "SAVEPOINT", "RELEASE", "ROLLBACK", "BEGIN")):
            return
        executed_statements.append(normalized)

    event.listen(engine, "before_cursor_execute", _before_cursor_execute)
    try:
        response = client.get(f"/api/v1/analytics/student/{student['id']}/all-courses-summary")
        assert response.status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", _before_cursor_execute)

    select_queries = [stmt for stmt in executed_statements if stmt.startswith("SELECT")]
    # Should remain constant regardless of number of courses (no N+1 behavior)
    assert len(select_queries) <= 12


def test_student_summary_success(client):
    s = _create_student(client, 6)
    c = _create_course(
        client,
        "SUM1",
        rules=[{"category": "Homework", "weight": 100.0}],
        absence_penalty=0.0,
    )

    for idx, status in enumerate(("Present", "Present", "Absent"), start=1):
        assert _create_att(client, s["id"], c["id"], status, period=idx).status_code == 201

    assert _create_grade(client, s["id"], c["id"], "HW1", "Homework", 80).status_code == 201
    assert _create_grade(client, s["id"], c["id"], "HW2", "Homework", 90).status_code == 201

    r = client.get(f"/api/v1/analytics/student/{s['id']}/summary")
    assert r.status_code == 200
    data = r.json()

    assert data["student"]["student_id"] == s["student_id"]
    assert data["total_classes"] == 3
    assert data["attendance_rate"] == 66.67
    assert data["average_grade"] == 85.0
    assert data["total_assignments"] == 2


def test_student_summary_not_found(client):
    r = client.get("/api/v1/analytics/student/9999/summary")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "not found" in detail.lower()
