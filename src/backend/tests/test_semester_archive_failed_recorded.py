"""Plan todo 87: the semester archive records a failed course as failed and clears its records.

The owner, 2026-11-24: "if the student fail, should retake the course from the beginning, nothing
remains from that course. He/She has to repeat fresh"; asked, at the archive run, and for all three
fails. Todo 85 had kept a failed student out of the archive, so the next year they were still enrolled
in the same course (a course code exists once) with last year's absences and grades counting. Now
the run records the course in the student's history as failed, with the reason (under the pass mark,
over the ΜΙΕΕΚ absence limit, a final exam retake under 50), and removes that enrolment and its
grades, ratings and attendance after the semester backup, as it does for a passed course. Grading
still in progress, or a course without rules, is left as it was.
"""

from datetime import date, timedelta

import pytest
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
    - below: final 30 (final grade 54, under the 60 threshold): failed;
    - passed: final 80 (final grade 84), 12 absences, the most allowed;
    - pending: no final exam yet (grading incomplete): left as it is.
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
    students = {name: _student(db, name) for name in ("over", "retake", "below", "passed", "pending")}
    first, later = date(2026, 1, 30), date(2026, 2, 10)
    for student in students.values():
        db.add(CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date.today()))
        _grade(db, student, course, "Homework", 90, date(2026, 1, 15))
        db.add(
            DailyPerformance(
                student_id=student.id, course_id=course.id, date=date(2026, 1, 15), category="Participation", score=8
            )
        )
    _grade(db, students["over"], course, "Final Exam", 80, first)
    _grade(db, students["retake"], course, "Final Exam", 95, first)
    _grade(db, students["retake"], course, "Final Exam", 45, later, retake=True)
    _grade(db, students["below"], course, "Final Exam", 30, first)
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


def _rows(db: Session, model, student: Student, course: Course) -> int:
    return db.query(model).filter_by(student_id=student.id, course_id=course.id).count()


def test_the_preview_lists_the_failed_with_the_reason(db: Session, semester):
    preview = SemesterArchiveService(db).preview(SEMESTER, pass_threshold=60.0)

    assert [p["student_name"] for p in preview["eligible"]] == ["Λία Αντωνίου passed"]
    failed = _by_student(preview["failed"])
    assert {name: (p["reason"], p["final_grade"]) for name, p in failed.items()} == {
        "over": ("failed_absence_limit", 84.0),
        "retake": ("failed_final_retake", 63.0),
        "below": ("not_passed", 54.0),
    }
    assert all(p["letter_grade"] for p in failed.values())
    assert [(p["student_name"], p["reason"]) for p in preview["excluded"]] == [
        ("Λία Αντωνίου pending", "incomplete_grading")
    ]
    assert (preview["eligible_count"], preview["failed_count"], preview["excluded_count"]) == (1, 3, 1)


def test_one_pair_alone_is_judged_the_same(db: Session, semester):
    # The path without the batch of records (calculate_final_grade per pair).
    course, students = semester
    service = SemesterArchiveService(db)
    enrollments = {e.student_id: e for e in db.query(CourseEnrollment).filter_by(course_id=course.id)}

    judged = {name: service._evaluate_pair(enrollments[s.id], 60.0) for name, s in students.items()}

    assert {name: (p.get("reason"), bool(p.get("fails"))) for name, p in judged.items()} == {
        "over": ("failed_absence_limit", True),
        "retake": ("failed_final_retake", True),
        "below": ("not_passed", True),
        "passed": (None, False),
        "pending": ("incomplete_grading", False),
    }


def test_the_run_records_the_failed_as_failed_and_clears_their_records(db: Session, semester, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)
    course, students = semester

    result = SemesterArchiveService(db).execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)

    assert (result["enrollments_archived"], result["enrollments_failed"], result["enrollments_skipped"]) == (1, 3, 1)
    run = db.query(SemesterArchiveExport).filter_by(status="completed").one()
    assert (run.enrollments_archived, run.enrollments_failed, run.enrollments_skipped) == (1, 3, 1)
    records = {r.student_id: r for r in db.query(StudentCoursePerformance).all()}
    assert {
        name: (records[s.id].passed, records[s.id].fail_reason) for name, s in students.items() if s.id in records
    } == {
        "over": (False, "failed_absence_limit"),
        "retake": (False, "failed_final_retake"),
        "below": (False, "not_passed"),
        "passed": (True, None),
    }
    assert (records[students["over"].id].final_grade, records[students["over"].id].semester) == (84.0, SEMESTER)
    # Nothing of the attempt is left: the student is enrolled again with a clean record.
    for name in ("over", "retake", "below", "passed"):
        for model in (CourseEnrollment, Grade, Attendance, DailyPerformance):
            assert _rows(db, model, students[name], course) == 0, (name, model.__name__)
    # Grading still in progress: untouched.
    pending = students["pending"]
    assert (_rows(db, CourseEnrollment, pending, course), _rows(db, Grade, pending, course)) == (1, 1)
    assert pending.id not in records


def test_the_course_taken_again_under_the_same_label_is_archived_as_passed(
    db: Session, semester, tmp_path, monkeypatch
):
    # A course code exists once: the repeat is the same course row, here under the same label. The
    # failed record must neither block it as "already archived" nor clash with the passed record.
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)
    course, students = semester
    service = SemesterArchiveService(db)
    service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)

    below = students["below"]
    db.add(CourseEnrollment(student_id=below.id, course_id=course.id, enrolled_at=date.today()))
    _grade(db, below, course, "Homework", 90, date(2027, 1, 15))
    _grade(db, below, course, "Final Exam", 80, date(2027, 1, 30))
    db.commit()

    preview = service.preview(SEMESTER, pass_threshold=60.0)
    assert [p["student_name"] for p in preview["eligible"]] == ["Λία Αντωνίου below"]
    result = service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)

    assert result["enrollments_archived"] == 1
    history = SemesterArchiveService(db).get_student_performance_history(below.id)
    assert sorted((r.passed, r.final_grade) for r in history) == [(False, 54.0), (True, 84.0)]


def test_a_passed_record_still_counts_as_already_archived(db: Session, semester, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)
    course, students = semester
    service = SemesterArchiveService(db)
    service.execute(SEMESTER, pass_threshold=60.0, admin_user_id=None)
    passed = students["passed"]
    db.add(CourseEnrollment(student_id=passed.id, course_id=course.id, enrolled_at=date.today()))
    db.commit()

    reasons = {p["student_name"].split()[-1]: p["reason"] for p in service.preview(SEMESTER, 60.0)["excluded"]}

    assert reasons["passed"] == "already_archived"


def test_the_endpoints_give_the_failed_list_and_the_reason_in_the_history(
    client, db: Session, semester, tmp_path, monkeypatch
):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)
    course, students = semester

    preview = client.post("/api/v1/semester-archive/preview", json={"semester": SEMESTER, "pass_threshold": 60.0})
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert {p["student_name"].split()[-1]: p["reason"] for p in body["failed"]} == {
        "over": "failed_absence_limit",
        "retake": "failed_final_retake",
        "below": "not_passed",
    }
    assert (body["eligible_count"], body["failed_count"], body["excluded_count"]) == (1, 3, 1)

    run = client.post(
        "/api/v1/semester-archive/execute",
        json={"semester": SEMESTER, "pass_threshold": 60.0, "confirm_text": SEMESTER},
    )
    assert run.status_code == 200, run.text
    assert (run.json()["enrollments_archived"], run.json()["enrollments_failed"]) == (1, 3)
    assert client.get("/api/v1/semester-archive/exports").json()[0]["enrollments_failed"] == 3

    history = client.get(f"/api/v1/enrollments/student/{students['over'].id}/performance-history")
    assert history.status_code == 200, history.text
    assert [(r["passed"], r["fail_reason"], r["course_code"]) for r in history.json()] == [
        (False, "failed_absence_limit", "KO100")
    ]


# ---------------------------------------------------------------------------
# The migration (d8b3f1a6c2e9)
# ---------------------------------------------------------------------------


def test_the_migration_keeps_the_records_limits_passed_ones_only_and_goes_back(tmp_path):
    from alembic import command
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.exc import IntegrityError

    from backend.tests.test_unmapped_legacy_columns import _alembic

    url = f"sqlite:///{(tmp_path / 'failed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, "c7d4e2a9f1b6")
    engine = create_engine(url)
    record = (
        "INSERT INTO student_course_performance (student_id, course_code, course_name, semester, final_grade, "
        "letter_grade, passed, total_weight_used, archived_at) VALUES (1, 'MIG-1', 'Μηχανική', 'S1', {grade}, 'B', "
        "{passed}, 100, '2026-11-24 10:00:00')"
    )
    run = (
        "INSERT INTO semester_archive_exports (semester, status, pass_threshold, students_affected, courses_affected, "
        "enrollments_archived, enrollments_skipped, started_at) VALUES ('S1', 'completed', 60, 1, 1, 1, 0, "
        "'2026-11-24 10:00:00')"
    )
    try:

        def columns(table: str) -> set[str]:
            return {c["name"] for c in inspect(engine).get_columns(table)}

        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO students (first_name, last_name, email, student_id) VALUES ('A', 'B', 'a@example.com', 'S-1')"
                )
            )
            conn.execute(text(record.format(grade=84, passed=1)))

        command.upgrade(cfg, "d8b3f1a6c2e9")
        assert "fail_reason" in columns("student_course_performance")
        assert "enrollments_failed" in columns("semester_archive_exports")
        with engine.begin() as conn:
            # The record already stored is passed, with no reason.
            assert conn.execute(text("SELECT passed, fail_reason FROM student_course_performance")).one() == (1, None)
            # Failed attempts under one key are not limited; a second passed record still is.
            conn.execute(text(record.format(grade=40, passed=0)))
            conn.execute(text(record.format(grade=45, passed=0)))
            # An older version's run (no enrollments_failed): the server default fills it.
            conn.execute(text(run))
            assert conn.execute(text("SELECT enrollments_failed FROM semester_archive_exports")).scalar() == 0
        with pytest.raises(IntegrityError):
            with engine.begin() as conn:
                conn.execute(text(record.format(grade=90, passed=1)))

        # Back, with a passed record and two failed attempts under one key: nothing is deleted, and
        # the index stays passed-only (the whole-table one could not hold them; said in the migration).
        command.downgrade(cfg, "c7d4e2a9f1b6")
        assert "fail_reason" not in columns("student_course_performance")
        assert "enrollments_failed" not in columns("semester_archive_exports")
        with engine.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM student_course_performance")).scalar() == 3
        unique = [ix for ix in inspect(engine).get_indexes("student_course_performance") if ix["unique"]]
        assert [ix["name"] for ix in unique] == ["idx_student_course_performance_unique"]
        command.upgrade(cfg, "head")
        assert "fail_reason" in columns("student_course_performance")
        with pytest.raises(IntegrityError):
            with engine.begin() as conn:
                conn.execute(text(record.format(grade=91, passed=1)))
    finally:
        engine.dispose()
