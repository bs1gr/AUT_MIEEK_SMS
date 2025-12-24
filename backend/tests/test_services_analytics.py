from __future__ import annotations

from datetime import date

import pytest

from backend import models
from backend.services import AnalyticsService
from backend.tests.conftest import TestingSessionLocal


@pytest.fixture()
def session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _setup_student_course(session, rules=None, absence_penalty: float = 0.0, credits: int = 3):
    student = models.Student(
        first_name="Test",
        last_name="Student",
        email="test_student@example.com",
        student_id="SID9999",
        is_active=True,
    )
    course = models.Course(
        course_code="SERV101",
        course_name="Service Layer Testing",
        semester="Fall 2025",
        credits=credits,
        absence_penalty=absence_penalty,
        evaluation_rules=rules or [],
    )
    session.add_all([student, course])
    session.commit()
    return student, course


def test_calculate_final_grade_handles_rules_and_penalties(session):
    rules = [
        {
            "category": "Homework",
            "weight": 50.0,
            "includeDailyPerformance": True,
            "dailyPerformanceMultiplier": 1.0,
        },
        {"category": "Final", "weight": 50.0},
    ]
    student, course = _setup_student_course(session, rules=rules, absence_penalty=5.0)

    session.add_all(
        [
            models.Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="HW1",
                category="Homework",
                grade=80,
                max_grade=100,
                date_assigned=date.today(),
                date_submitted=date.today(),
            ),
            models.Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="Final",
                category="Final",
                grade=90,
                max_grade=100,
                date_assigned=date.today(),
                date_submitted=date.today(),
            ),
        ]
    )
    session.add(
        models.DailyPerformance(
            student_id=student.id,
            course_id=course.id,
            date=date.today(),
            category="Homework",
            score=9,
            max_score=10,
        )
    )
    session.add(
        models.Attendance(
            student_id=student.id,
            course_id=course.id,
            date=date.today(),
            status="Absent",
            period_number=1,
        )
    )
    session.commit()

    service = AnalyticsService(session)
    result = service.calculate_final_grade(student.id, course.id)

    assert result["final_grade"] < 90  # absence penalty applied
    assert result["letter_grade"] == "B-"  # 80-82% = B-
    assert result["absence_penalty"] == 5.0
    assert result["unexcused_absences"] == 1


def test_get_student_all_courses_summary_skips_courses_without_rules(session):
    valid_rules = [{"category": "Project", "weight": 100.0, "includeDailyPerformance": False}]
    student, valid_course = _setup_student_course(session, rules=valid_rules, credits=4)
    invalid_course = models.Course(
        course_code="SERV102",
        course_name="No Rules",
        semester="Fall 2025",
        credits=3,
        evaluation_rules=[],
    )
    session.add(invalid_course)
    session.commit()

    session.add(
        models.Grade(
            student_id=student.id,
            course_id=valid_course.id,
            assignment_name="Project",
            category="Project",
            grade=95,
            max_grade=100,
            date_assigned=date.today(),
            date_submitted=date.today(),
        )
    )
    session.commit()

    service = AnalyticsService(session)
    summary = service.get_student_all_courses_summary(student.id)

    assert summary["total_credits"] == valid_course.credits
    assert len(summary["courses"]) == 1
    assert summary["courses"][0]["course_code"] == valid_course.course_code
    assert "SERV102" not in {c["course_code"] for c in summary["courses"]}


def test_get_student_summary_returns_averages(session):
    student, course = _setup_student_course(
        session,
        rules=[{"category": "Homework", "weight": 100.0}],
    )

    session.add_all(
        [
            models.Attendance(
                student_id=student.id,
                course_id=course.id,
                date=date.today(),
                status="Present",
                period_number=1,
            ),
            models.Attendance(
                student_id=student.id,
                course_id=course.id,
                date=date.today(),
                status="Absent",
                period_number=2,
            ),
            models.Attendance(
                student_id=student.id,
                course_id=course.id,
                date=date.today(),
                status="Present",
                period_number=3,
            ),
            models.Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="HW1",
                category="Homework",
                grade=80,
                max_grade=100,
                date_assigned=date.today(),
                date_submitted=date.today(),
            ),
            models.Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="HW2",
                category="Homework",
                grade=90,
                max_grade=100,
                date_assigned=date.today(),
                date_submitted=date.today(),
            ),
        ]
    )
    session.commit()

    service = AnalyticsService(session)
    summary = service.get_student_summary(student.id)

    assert summary["total_assignments"] == 2
    assert summary["average_grade"] == pytest.approx(85.0, rel=1e-2)
