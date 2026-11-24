"""The Semester Archive preview answers when a student failed on the absence limit or a final retake.

Todo 85 (v1.18.81) gave the archive two reasons to keep a student out, "failed_absence_limit" and
"failed_final_retake", but the preview's response model still allowed only the four older reasons:
the endpoint answered 500 for any semester with such a student, and the page could not preview (nor
so archive) that semester. The service's own tests never went through the endpoint. Since todo 87
both are listed under `failed` (recorded as failed at the run), still through the response model.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from backend.models import Attendance, Course, CourseEnrollment, Grade, Student

SEMESTER = "Preview Reasons Semester 2026"


def _student(db: Session, suffix: str) -> Student:
    student = Student(
        student_id=f"PR-{suffix}",
        first_name="Λία",
        last_name=f"Αντωνίου {suffix}",
        email=f"preview.reasons.{suffix}@example.com",
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


def _seed(db: Session) -> None:
    # 42 periods (3 a week, 14 weeks): over 30 % is 13 absences.
    course = Course(
        course_code="PR100",
        course_name="Μηχανική",
        semester=SEMESTER,
        credits=3,
        hours_per_week=3,
        evaluation_rules=[{"category": "Homework", "weight": 40}, {"category": "Final Exam", "weight": 60}],
    )
    db.add(course)
    db.commit()
    over, retake = _student(db, "over"), _student(db, "retake")
    for student in (over, retake):
        db.add(CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date.today()))
        _grade(db, student, course, "Homework", 90, date(2026, 1, 15))
    _grade(db, over, course, "Final Exam", 80, date(2026, 1, 30))
    _grade(db, retake, course, "Final Exam", 95, date(2026, 1, 30))
    _grade(db, retake, course, "Final Exam", 45, date(2026, 2, 10), retake=True)
    for i in range(13):
        db.add(
            Attendance(
                student_id=over.id,
                course_id=course.id,
                date=date(2026, 1, 5) + timedelta(days=i),
                period_number=1,
                status="Absent",
            )
        )
    db.commit()


def test_the_preview_answers_with_both_reasons(client, db: Session):
    _seed(db)

    resp = client.post("/api/v1/semester-archive/preview", json={"semester": SEMESTER, "pass_threshold": 60.0})

    assert resp.status_code == 200, resp.text
    reasons = {p["student_name"].split()[-1]: p["reason"] for p in resp.json()["failed"]}
    assert reasons == {"over": "failed_absence_limit", "retake": "failed_final_retake"}
    assert resp.json()["excluded"] == []
