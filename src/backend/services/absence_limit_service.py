"""ΜΙΕΕΚ absence-limit rule.

Attendance is compulsory. For each course, a student may be absent for at most
``absence_limit_percent`` (10%) of the semester's scheduled teaching periods, or
``absence_limit_extended_percent`` (15%) when the Directorate has approved
documented reasons for that enrollment. Going *over* the applicable limit makes
attendance in the course "insufficient" (Ανεπαρκής): the student loses the right
to sit the final exam and must repeat the course. The app only flags this — it
never blocks grade entry.

Units: attendance is recorded one row per teaching period, so the limit is
computed in periods. The semester total is calculated as
``periods_per_week x SEMESTER_WEEKS`` (``hours_per_week`` stands in for courses
without a period schedule). Absent and Excused both count as absences — a
justification only matters through the extended-limit approval. Late does not.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.config import settings
from backend.import_resolver import import_names

DEFAULT_LIMIT_PERCENT = 10.0
DEFAULT_EXTENDED_LIMIT_PERCENT = 15.0
# Warn once a student has used this share of their allowed absences.
WARNING_RATIO = 0.8

STATUS_OK = "ok"
STATUS_WARNING = "warning"
STATUS_INSUFFICIENT = "insufficient"
STATUS_UNKNOWN = "unknown"  # no teaching schedule, so no total to measure against


def semester_weeks() -> int:
    return int(getattr(settings, "SEMESTER_WEEKS", 14) or 14)


def weekly_periods(course: Any) -> float:
    periods = int(getattr(course, "periods_per_week", 0) or 0)
    if periods > 0:
        return float(periods)
    return float(getattr(course, "hours_per_week", 0) or 0)


def course_limits(course: Any) -> tuple[float, float]:
    """(base, extended) limit percentages; the extended limit is never below the base."""
    base = getattr(course, "absence_limit_percent", None)
    extended = getattr(course, "absence_limit_extended_percent", None)
    base = DEFAULT_LIMIT_PERCENT if base is None else float(base)
    extended = DEFAULT_EXTENDED_LIMIT_PERCENT if extended is None else float(extended)
    return base, max(base, extended)


def evaluate(
    course: Any,
    *,
    absent: int,
    excused: int,
    extended_approved: bool,
    weeks: Optional[int] = None,
) -> Dict[str, Any]:
    """Absence-limit status for one student in one course, from status counts."""
    weeks = semester_weeks() if weeks is None else weeks
    per_week = weekly_periods(course)
    scheduled = per_week * weeks
    base, extended = course_limits(course)
    limit = extended if extended_approved else base
    absences = absent + excused

    if scheduled > 0:
        max_allowed = scheduled * limit / 100.0
        # Absences are whole periods, so "more than max_allowed" == "more than floor(max_allowed)".
        allowed = math.floor(max_allowed + 1e-9)
        percent = absences / scheduled * 100.0
        if absences > allowed:
            status = STATUS_INSUFFICIENT
        elif allowed > 0 and absences >= WARNING_RATIO * allowed:
            status = STATUS_WARNING
        else:
            status = STATUS_OK
        remaining: Optional[int] = max(0, allowed - absences)
        allowed_out: Optional[int] = allowed
    else:
        percent = 0.0
        status = STATUS_UNKNOWN
        remaining = None
        allowed_out = None

    return {
        "course_id": getattr(course, "id", None),
        "semester_weeks": weeks,
        "periods_per_week": per_week,
        "scheduled_periods": scheduled,
        "absences": absences,
        "unexcused_absences": absent,
        "excused_absences": excused,
        "absence_percent": round(percent, 2),
        "limit_percent": limit,
        "base_limit_percent": base,
        "extended_limit_percent": extended,
        "extended_approved": bool(extended_approved),
        "allowed_absences": allowed_out,
        "remaining_absences": remaining,
        "status": status,
        "attendance_insufficient": status == STATUS_INSUFFICIENT,
    }


def evaluate_records(course: Any, records: Iterable[Any], extended_approved: bool) -> Dict[str, Any]:
    """Same as :func:`evaluate`, counting statuses from attendance rows."""
    absent = excused = 0
    for rec in records:
        s = str(getattr(rec, "status", "")).lower()
        if s == "absent":
            absent += 1
        elif s == "excused":
            excused += 1
    return evaluate(course, absent=absent, excused=excused, extended_approved=extended_approved)


def _status_counts(db: Session, **filters: int) -> Dict[tuple[int, int], Dict[str, int]]:
    """{(student_id, course_id): {"absent": n, "excused": n}} for non-deleted rows."""
    (Attendance,) = import_names("models", "Attendance")
    status_lower = func.lower(Attendance.status)
    q = db.query(Attendance.student_id, Attendance.course_id, status_lower, func.count(Attendance.id)).filter(
        Attendance.deleted_at.is_(None), status_lower.in_(["absent", "excused"])
    )
    for column, value in filters.items():
        q = q.filter(getattr(Attendance, column) == value)
    counts: Dict[tuple[int, int], Dict[str, int]] = {}
    for student_id, course_id, status, n in q.group_by(Attendance.student_id, Attendance.course_id, status_lower):
        counts.setdefault((student_id, course_id), {"absent": 0, "excused": 0})[status] = int(n)
    return counts


def _live_enrollments(db: Session, **filters: int) -> List[Any]:
    (CourseEnrollment,) = import_names("models", "CourseEnrollment")
    q = db.query(CourseEnrollment).filter(CourseEnrollment.deleted_at.is_(None), CourseEnrollment.status != "dropped")
    for column, value in filters.items():
        q = q.filter(getattr(CourseEnrollment, column) == value)
    return q.all()


def _with_enrollment(result: Dict[str, Any], enrollment: Any) -> Dict[str, Any]:
    approved_at = enrollment.extended_absence_approved_at
    result.update(
        student_id=enrollment.student_id,
        course_id=enrollment.course_id,
        extended_absence_approved_at=approved_at.isoformat() if approved_at else None,
        extended_absence_note=enrollment.extended_absence_note,
    )
    return result


def course_absence_status(db: Session, course: Any) -> List[Dict[str, Any]]:
    """Status for every enrolled (not dropped) student in a course."""
    counts = _status_counts(db, course_id=course.id)
    out = []
    for enr in _live_enrollments(db, course_id=course.id):
        c = counts.get((enr.student_id, course.id), {})
        result = evaluate(
            course,
            absent=c.get("absent", 0),
            excused=c.get("excused", 0),
            extended_approved=bool(enr.extended_absence_approved),
        )
        out.append(_with_enrollment(result, enr))
    return out


def student_absence_status(db: Session, student_id: int) -> List[Dict[str, Any]]:
    """Status for every course the student is enrolled in (not dropped)."""
    (Course,) = import_names("models", "Course")
    enrollments = _live_enrollments(db, student_id=student_id)
    if not enrollments:
        return []
    courses = {
        c.id: c
        for c in db.query(Course)
        .filter(Course.id.in_([e.course_id for e in enrollments]), Course.deleted_at.is_(None))
        .all()
    }
    counts = _status_counts(db, student_id=student_id)
    out = []
    for enr in enrollments:
        course = courses.get(enr.course_id)
        if course is None:
            continue
        c = counts.get((student_id, course.id), {})
        result = evaluate(
            course,
            absent=c.get("absent", 0),
            excused=c.get("excused", 0),
            extended_approved=bool(enr.extended_absence_approved),
        )
        result.update(course_code=course.course_code, course_name=course.course_name)
        out.append(_with_enrollment(result, enr))
    return out
