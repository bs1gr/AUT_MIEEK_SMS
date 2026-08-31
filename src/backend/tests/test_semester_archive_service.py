"""Unit tests for SemesterArchiveService."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models import (
    Attendance,
    Course,
    CourseEnrollment,
    DailyPerformance,
    Grade,
    SemesterArchiveExport,
    Student,
    StudentCoursePerformance,
)
from backend.services.semester_archive_service import SemesterArchiveService

SEMESTER = "Test Semester 2026"


def _make_student(db: Session, suffix: str) -> Student:
    student = Student(
        student_id=f"STU-ARCH-{suffix}",
        first_name="Test",
        last_name=f"Student{suffix}",
        email=f"archive.test.{suffix}@example.com",
        enrollment_date=date.today(),
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def _make_course(db: Session, code: str, evaluation_rules=None, semester: str = SEMESTER) -> Course:
    course = Course(
        course_code=code,
        course_name=f"Course {code}",
        semester=semester,
        credits=3,
        evaluation_rules=evaluation_rules,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def _enroll(db: Session, student: Student, course: Course) -> CourseEnrollment:
    enrollment = CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date.today())
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def _grade(db: Session, student: Student, course: Course, category: str, grade: float, max_grade: float = 100.0):
    g = Grade(
        student_id=student.id,
        course_id=course.id,
        assignment_name=f"{category} assignment",
        category=category,
        grade=grade,
        max_grade=max_grade,
    )
    db.add(g)
    db.commit()
    return g


FULL_WEIGHT_RULES = [{"category": "homework", "weight": 100}]
SPLIT_WEIGHT_RULES = [{"category": "homework", "weight": 50}, {"category": "final", "weight": 50}]


def test_preview_marks_fully_graded_passing_course_eligible(db: Session):
    student = _make_student(db, "pass")
    course = _make_course(db, "ARCH101", evaluation_rules=FULL_WEIGHT_RULES)
    _enroll(db, student, course)
    _grade(db, student, course, "homework", 80.0)

    result = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert result["eligible_count"] == 1
    assert result["excluded_count"] == 0
    assert result["eligible"][0]["final_grade"] == 80.0


def test_preview_threshold_boundary_is_inclusive(db: Session):
    student = _make_student(db, "boundary")
    course = _make_course(db, "ARCH102", evaluation_rules=FULL_WEIGHT_RULES)
    _enroll(db, student, course)
    _grade(db, student, course, "homework", 60.0)

    result = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert result["eligible_count"] == 1
    assert result["eligible"][0]["final_grade"] == 60.0


def test_preview_excludes_below_threshold_as_not_passed(db: Session):
    student = _make_student(db, "fail")
    course = _make_course(db, "ARCH103", evaluation_rules=FULL_WEIGHT_RULES)
    _enroll(db, student, course)
    _grade(db, student, course, "homework", 59.9)

    result = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert result["eligible_count"] == 0
    assert result["excluded_count"] == 1
    assert result["excluded"][0]["reason"] == "not_passed"


def test_preview_excludes_incomplete_grading(db: Session):
    student = _make_student(db, "incomplete")
    course = _make_course(db, "ARCH104", evaluation_rules=SPLIT_WEIGHT_RULES)
    _enroll(db, student, course)
    # Only the "homework" half of the evaluation rules has a grade; "final" is missing,
    # so total_weight_used will be 50, not 100.
    _grade(db, student, course, "homework", 95.0)

    result = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=10.0)

    assert result["eligible_count"] == 0
    assert result["excluded_count"] == 1
    assert result["excluded"][0]["reason"] == "incomplete_grading"
    assert result["excluded"][0]["total_weight_used"] == 50.0


def test_preview_excludes_courses_without_evaluation_rules(db: Session):
    student = _make_student(db, "norules")
    course = _make_course(db, "ARCH105", evaluation_rules=None)
    _enroll(db, student, course)

    result = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert result["eligible_count"] == 0
    assert result["excluded"][0]["reason"] == "no_evaluation_rules"


def test_execute_archives_only_passed_courses_and_keeps_profile_intact(db: Session, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)

    passing_student = _make_student(db, "exec-pass")
    failing_student = _make_student(db, "exec-fail")
    course = _make_course(db, "ARCH200", evaluation_rules=FULL_WEIGHT_RULES)

    _enroll(db, passing_student, course)
    _grade(db, passing_student, course, "homework", 90.0)
    db.add(Attendance(student_id=passing_student.id, course_id=course.id, date=date.today(), status="Present"))
    db.add(DailyPerformance(student_id=passing_student.id, course_id=course.id, date=date.today(), category="homework", score=9, max_score=10))

    _enroll(db, failing_student, course)
    _grade(db, failing_student, course, "homework", 30.0)
    db.commit()

    result = SemesterArchiveService(db).execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)

    assert result["students_affected"] == 1
    assert result["courses_affected"] == 1
    assert result["enrollments_archived"] == 1
    assert result["enrollments_skipped"] == 1

    # Passing student: raw rows gone, permanent record exists, profile untouched.
    assert db.query(CourseEnrollment).filter_by(student_id=passing_student.id, course_id=course.id).first() is None
    assert db.query(Grade).filter_by(student_id=passing_student.id, course_id=course.id).count() == 0
    assert db.query(Attendance).filter_by(student_id=passing_student.id, course_id=course.id).count() == 0
    assert db.query(DailyPerformance).filter_by(student_id=passing_student.id, course_id=course.id).count() == 0

    perf = db.query(StudentCoursePerformance).filter_by(student_id=passing_student.id).first()
    assert perf is not None
    assert perf.passed is True
    assert perf.final_grade == 90.0
    assert perf.course_code == "ARCH200"

    refreshed_student = db.query(Student).filter_by(id=passing_student.id).first()
    assert refreshed_student is not None
    assert refreshed_student.first_name == "Test"

    # Failing student: nothing touched, can retake.
    assert db.query(CourseEnrollment).filter_by(student_id=failing_student.id, course_id=course.id).first() is not None
    assert db.query(Grade).filter_by(student_id=failing_student.id, course_id=course.id).count() == 1

    export_row = db.query(SemesterArchiveExport).filter_by(semester=SEMESTER).first()
    assert export_row.status == "completed"
    assert export_row.export_filename is not None


def test_execute_is_idempotent_on_rerun(db: Session, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)

    student = _make_student(db, "idempotent")
    course = _make_course(db, "ARCH300", evaluation_rules=FULL_WEIGHT_RULES)
    _enroll(db, student, course)
    _grade(db, student, course, "homework", 85.0)

    service = SemesterArchiveService(db)
    first = service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)
    assert first["enrollments_archived"] == 1

    second = service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)
    assert second["enrollments_archived"] == 0
    assert second["enrollments_skipped"] == 0

    assert db.query(StudentCoursePerformance).filter_by(student_id=student.id).count() == 1


def test_execute_rolls_back_all_changes_on_mid_loop_failure(db: Session, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)

    student_a = _make_student(db, "rollback-a")
    student_b = _make_student(db, "rollback-b")
    course = _make_course(db, "ARCH400", evaluation_rules=FULL_WEIGHT_RULES)

    _enroll(db, student_a, course)
    _grade(db, student_a, course, "homework", 90.0)
    _enroll(db, student_b, course)
    _grade(db, student_b, course, "homework", 95.0)

    service = SemesterArchiveService(db)

    original_delete = db.delete
    call_count = {"n": 0}

    def flaky_delete(instance):
        call_count["n"] += 1
        if call_count["n"] == 2:
            raise RuntimeError("simulated failure during archive loop")
        return original_delete(instance)

    monkeypatch.setattr(db, "delete", flaky_delete)

    with pytest.raises(HTTPException) as exc_info:
        service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)
    assert exc_info.value.status_code == 500

    # The failure path records a fresh audit row (via a clean insert issued after the
    # rollback, independent of any ORM state the rollback may have invalidated).
    export_row = db.query(SemesterArchiveExport).filter_by(semester=SEMESTER).first()
    assert export_row is not None
    assert export_row.status == "failed"
    assert export_row.error_message
    # StudentCoursePerformance rows are only ever committed together with a
    # "completed" export in the same transaction as the rest of the archive run,
    # so a mid-loop failure must never leave one behind.
    assert db.query(StudentCoursePerformance).count() == 0
