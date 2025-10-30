from __future__ import annotations

from datetime import date


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


def _create_course(client, code: str, rules=None, absence_penalty: float = 0.0):
    payload = {
        "course_code": code,
        "course_name": f"Course {code}",
        "semester": "Fall 2025",
        "credits": 3,
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
