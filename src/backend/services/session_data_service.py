"""Shared helpers for fetching and serializing a semester's full dataset.

Used by both the session export/import router (routers_sessions.py) and the
semester archive service (semester_archive_service.py) so a semester's data
is queried and serialized in exactly one place.
"""

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session, selectinload

from backend.import_resolver import import_names


def fetch_semester_dataset(db: Session, semester: str) -> Dict[str, List[Any]]:
    """Query every ORM row belonging to `semester`, keyed by entity name."""
    Course, Student, CourseEnrollment, Grade, Attendance, DailyPerformance, Highlight, LessonLog = import_names(
        "models",
        "Course",
        "Student",
        "CourseEnrollment",
        "Grade",
        "Attendance",
        "DailyPerformance",
        "Highlight",
        "LessonLog",
    )

    courses = db.query(Course).filter(Course.semester == semester, Course.deleted_at.is_(None)).all()
    course_ids = [c.id for c in courses]

    enrollments = (
        db.query(CourseEnrollment)
        .options(selectinload(CourseEnrollment.student), selectinload(CourseEnrollment.course))
        .filter(CourseEnrollment.course_id.in_(course_ids), CourseEnrollment.deleted_at.is_(None))
        .all()
        if course_ids
        else []
    )

    student_ids = list({e.student_id for e in enrollments})

    students = (
        db.query(Student).filter(Student.id.in_(student_ids), Student.deleted_at.is_(None)).all()
        if student_ids
        else []
    )

    grades = (
        db.query(Grade)
        .options(selectinload(Grade.student), selectinload(Grade.course))
        .filter(Grade.course_id.in_(course_ids), Grade.student_id.in_(student_ids), Grade.deleted_at.is_(None))
        .all()
        if student_ids
        else []
    )

    attendance = (
        db.query(Attendance)
        .options(selectinload(Attendance.student), selectinload(Attendance.course))
        .filter(
            Attendance.course_id.in_(course_ids),
            Attendance.student_id.in_(student_ids),
            Attendance.deleted_at.is_(None),
        )
        .all()
        if student_ids
        else []
    )

    daily_performance = (
        db.query(DailyPerformance)
        .options(selectinload(DailyPerformance.student), selectinload(DailyPerformance.course))
        .filter(
            DailyPerformance.course_id.in_(course_ids),
            DailyPerformance.student_id.in_(student_ids),
            DailyPerformance.deleted_at.is_(None),
        )
        .all()
        if student_ids
        else []
    )

    highlights = (
        db.query(Highlight)
        .options(selectinload(Highlight.student))
        .filter(
            Highlight.student_id.in_(student_ids), Highlight.semester == semester, Highlight.deleted_at.is_(None)
        )
        .all()
        if student_ids
        else []
    )

    # Lesson logs belong to the course, not to a student, so a course with no enrolments keeps them.
    lesson_logs = (
        db.query(LessonLog)
        .filter(LessonLog.course_id.in_(course_ids))
        .order_by(LessonLog.course_id, LessonLog.date, LessonLog.period_number)
        .all()
        if course_ids
        else []
    )

    return {
        "courses": courses,
        "students": students,
        "enrollments": enrollments,
        "grades": grades,
        "attendance": attendance,
        "daily_performance": daily_performance,
        "highlights": highlights,
        "lesson_logs": lesson_logs,
    }


def serialize_course(course) -> Dict[str, Any]:
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        "semester": course.semester,
        "credits": course.credits,
        "hours_per_week": course.hours_per_week,
        "periods_per_week": course.periods_per_week,
        "description": course.description,
        "evaluation_rules": course.evaluation_rules,
        "teaching_schedule": course.teaching_schedule,
        "absence_penalty": course.absence_penalty,
        "absence_limit_percent": course.absence_limit_percent,
        "participation_limit_percent": course.participation_limit_percent,
    }


def serialize_student(student, include_health: bool = False) -> Dict[str, Any]:
    """A student for the semester export.

    Health information is special-category data and an export file leaves the system, so it is
    only written when the caller asks. The key is then absent, not null: the import updates the
    fields it finds, so an export without it does not wipe what the importing install holds.
    """
    data = _serialize_student_fields(student)
    if include_health:
        data["health_issue"] = getattr(student, "health_issue", None)
    return data


def _serialize_student_fields(student) -> Dict[str, Any]:
    return {
        "student_id": student.student_id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "email": student.email,
        "father_name": getattr(student, "father_name", None),
        "mobile_phone": getattr(student, "mobile_phone", None),
        "phone": getattr(student, "phone", None),
        "study_year": getattr(student, "study_year", None),
        "enrollment_date": str(student.enrollment_date) if student.enrollment_date else None,
        "is_active": student.is_active,
    }


def serialize_enrollment(enrollment) -> Dict[str, Any]:
    return {
        "student_id_ref": enrollment.student.student_id if enrollment.student else None,
        "course_code_ref": enrollment.course.course_code if enrollment.course else None,
        "enrolled_at": str(enrollment.enrolled_at) if enrollment.enrolled_at else None,
    }


def serialize_grade(grade) -> Dict[str, Any]:
    return {
        "student_id_ref": grade.student.student_id if grade.student else None,
        "course_code_ref": grade.course.course_code if grade.course else None,
        "assignment_name": grade.assignment_name,
        "category": grade.category,
        "grade": float(grade.grade),
        "max_grade": float(grade.max_grade),
        "weight": float(grade.weight) if grade.weight else None,
        # component_type was removed from Grade model; export legacy value if attribute exists
        "component_type": getattr(grade, "component_type", None),
        "date_assigned": str(grade.date_assigned) if grade.date_assigned else None,
        "date_submitted": str(grade.date_submitted) if grade.date_submitted else None,
    }


def serialize_attendance(attendance) -> Dict[str, Any]:
    return {
        "student_id_ref": attendance.student.student_id if attendance.student else None,
        "course_code_ref": attendance.course.course_code if attendance.course else None,
        "date": str(attendance.date) if attendance.date else None,
        "status": attendance.status,
        "period_number": attendance.period_number,
        "notes": attendance.notes,
    }


def serialize_performance(performance) -> Dict[str, Any]:
    return {
        "student_id_ref": performance.student.student_id if performance.student else None,
        "course_code_ref": performance.course.course_code if performance.course else None,
        "date": str(performance.date) if performance.date else None,
        "category": performance.category,
        "score": float(performance.score),
        "max_score": float(performance.max_score),
        "notes": performance.notes,
    }


def serialize_highlight(highlight) -> Dict[str, Any]:
    return {
        "student_id_ref": highlight.student.student_id if highlight.student else None,
        "semester": highlight.semester,
        "category": highlight.category,
        "rating": highlight.rating,
        "highlight_text": highlight.highlight_text,
        "is_positive": highlight.is_positive,
        "date_created": str(highlight.date_created) if highlight.date_created else None,
    }


def serialize_lesson_log(lesson_log, course_code: Any) -> Dict[str, Any]:
    return {
        "course_code_ref": course_code,
        "date": str(lesson_log.date) if lesson_log.date else None,
        "period_number": lesson_log.period_number,
        "material_covered": lesson_log.material_covered,
        "teacher_notes": lesson_log.teacher_notes,
        # The name only: user ids mean someone else on the install that imports this.
        "updated_by_name": lesson_log.updated_by_name,
    }


def serialize_lesson_logs(dataset: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
    """The dataset's lesson logs, each pointing at its course by code (the model has no relationship)."""
    codes = {course.id: course.course_code for course in dataset["courses"]}
    return [serialize_lesson_log(entry, codes.get(entry.course_id)) for entry in dataset["lesson_logs"]]


def build_semester_export_payload(db: Session, semester: str, include_health: bool = False) -> Dict[str, Any]:
    """Build the full semester export JSON payload (same shape used by
    GET /api/v1/sessions/export)."""
    dataset = fetch_semester_dataset(db, semester)

    return {
        "metadata": {
            "semester": semester,
            "exported_at": datetime.now().isoformat(),
            "exported_by": "system",  # User identity tracked via request.state
            "version": "1.0",
            "counts": {key: len(rows) for key, rows in dataset.items()},
        },
        "courses": [serialize_course(c) for c in dataset["courses"]],
        "students": [serialize_student(s, include_health) for s in dataset["students"]],
        "enrollments": [serialize_enrollment(e) for e in dataset["enrollments"]],
        "grades": [serialize_grade(g) for g in dataset["grades"]],
        "attendance": [serialize_attendance(a) for a in dataset["attendance"]],
        "daily_performance": [serialize_performance(dp) for dp in dataset["daily_performance"]],
        "highlights": [serialize_highlight(h) for h in dataset["highlights"]],
        "lesson_logs": serialize_lesson_logs(dataset),
    }
