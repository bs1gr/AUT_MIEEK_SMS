"""Plan todo 85: the semester archive keeps out a student who failed the course whatever the grade.

The owner, 2026-11-24: "such students should be kept out of the archive, with the reason shown in
its preview. however, they still have the opportunity to retake the course next available year".
Archiving records the course as passed and replaces the raw grades and attendance with that record,
and it cannot be undone. It looked at the final grade alone, so a student over the ΜΙΕΕΚ absence
limit (failed whatever the grade) or with a final exam retake under 50 (todo 80) was archived as
passed. Now both are kept out, their enrolment and records untouched.
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from backend.models import Attendance, Course, CourseEnrollment, Grade, Student, StudentCoursePerformance
from backend.services.semester_archive_service import SemesterArchiveService

SEMESTER = "Retake Semester 2026"
RULES = [{"category": "Homework", "weight": 40}, {"category": "Final Exam", "weight": 60}]


def _student(db: Session, suffix: str) -> Student:
    student = Student(
        student_id=f"KO-{suffix}",
        first_name="Λία",
        last_name=f"Αντωνίου {suffix}",
        email=f"kept.out.{suffix}@example.com",
        enrollment_date=date.today(),
        is_active=True,
    )
    db.add(student)
    db.commit()
    return student


def _grade(db: Session, student: Student, course: Course, category: str, grade: float, day: date, retake=False):
    db.add(
        Grade(
            student_id=student.id,
            course_id=course.id,
            assignment_name=category,
            category=category,
            grade=grade,
            max_grade=100.0,
            date_submitted=day,
            is_retake=retake,
        )
    )


@pytest.fixture
def semester(db: Session):
    """42 periods (3 a week, 14 weeks): over 30 % is 13 absences. Every student 90 in homework.

    - over: final 80 (final grade 84), 13 absences: failed on the absence limit;
    - retake: final 95, then a retake of 45 (final grade 63, over the 60 threshold): failed;
    - passed: final 80 (final grade 84), 12 absences, the most allowed.
    """
    course = Course(
        course_code="KO100",
        course_name="Μηχανική",
        semester=SEMESTER,
        credits=3,
        hours_per_week=3,
        evaluation_rules=RULES,
    )
    db.add(course)
    db.commit()
    students = {name: _student(db, name) for name in ("over", "retake", "passed")}
    first, later = date(2026, 1, 30), date(2026, 2, 10)
    for student in students.values():
        db.add(CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date.today()))
        _grade(db, student, course, "Homework", 90, date(2026, 1, 15))
    _grade(db, students["over"], course, "Final Exam", 80, first)
    _grade(db, students["retake"], course, "Final Exam", 95, first)
    _grade(db, students["retake"], course, "Final Exam", 45, later, retake=True)
    _grade(db, students["passed"], course, "Final Exam", 80, first)
    for name, count in (("over", 13), ("passed", 12)):
        for i in range(count):
            db.add(
                Attendance(
                    student_id=students[name].id,
                    course_id=course.id,
                    date=date(2026, 1, 5) + timedelta(days=i),
                    period_number=1,
                    status="Absent" if i % 2 else "Excused",  # both are absences
                )
            )
    db.commit()
    return course, students


def _by_student(pairs):
    return {p["student_name"].split()[-1]: p for p in pairs}


def test_the_preview_keeps_them_out_and_says_why(db: Session, semester):
    preview = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert [p["student_name"] for p in preview["eligible"]] == ["Λία Αντωνίου passed"]
    excluded = _by_student(preview["excluded"])
    assert (excluded["over"]["reason"], excluded["over"]["final_grade"]) == ("failed_absence_limit", 84.0)
    assert (excluded["retake"]["reason"], excluded["retake"]["final_grade"]) == ("failed_final_retake", 63.0)


def test_one_pair_alone_is_judged_the_same(db: Session, semester):
    # The path without the batch of records (calculate_final_grade per pair).
    course, students = semester
    service = SemesterArchiveService(db)
    enrollments = {e.student_id: e for e in db.query(CourseEnrollment).filter_by(course_id=course.id)}

    reasons = {name: service._evaluate_pair(enrollments[s.id], 60.0).get("reason") for name, s in students.items()}

    assert reasons == {"over": "failed_absence_limit", "retake": "failed_final_retake", "passed": None}


def test_the_archive_run_leaves_them_enrolled_with_every_record(db: Session, semester, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)
    course, students = semester

    result = SemesterArchiveService(db).execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)

    assert (result["enrollments_archived"], result["enrollments_skipped"]) == (1, 2)
    archived = db.query(StudentCoursePerformance).all()
    assert [r.student_id for r in archived] == [students["passed"].id]
    for name in ("over", "retake"):
        sid = students[name].id
        assert db.query(CourseEnrollment).filter_by(student_id=sid, course_id=course.id).one() is not None
        assert db.query(Grade).filter_by(student_id=sid, course_id=course.id, deleted_at=None).count() >= 2
    assert db.query(Attendance).filter_by(student_id=students["over"].id, course_id=course.id).count() == 13
