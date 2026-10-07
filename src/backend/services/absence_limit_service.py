"""ΜΙΕΕΚ absence rules (owner's decision, 2026-10-07).

For each course, absences are counted against the semester's scheduled teaching periods:

- **Fail limit** (``absence_limit_percent``, 30%): going *over* it makes attendance in the
  course "insufficient" (Ανεπαρκής) and the course is failed. The app flags this; it never
  blocks grade entry.
- **Class Participation limit** (``participation_limit_percent``, 10%): going *over* it means
  the student loses the Class Participation share of the final grade (that share, including
  its special-participation sub-weights, counts as 0). The course can still be passed.

Units: attendance is recorded one row per teaching period, so limits are computed in periods.
The semester total is ``periods_per_week x SEMESTER_WEEKS`` (``hours_per_week`` stands in for
courses without a period schedule). Absent and Excused both count as absences; Late does not.

The Directorate-approved extended limit (15%, per enrollment) was removed on 2026-10-07; its
database columns stay until every installed app no longer reads them.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.config import settings
from backend.import_resolver import import_names

DEFAULT_LIMIT_PERCENT = 30.0
DEFAULT_PARTICIPATION_LIMIT_PERCENT = 10.0
# Warn once a student has used this share of the absences allowed before failing.
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
    """(fail limit %, Class Participation limit %) for a course."""
    fail = getattr(course, "absence_limit_percent", None)
    participation = getattr(course, "participation_limit_percent", None)
    fail = DEFAULT_LIMIT_PERCENT if fail is None else float(fail)
    participation = DEFAULT_PARTICIPATION_LIMIT_PERCENT if participation is None else float(participation)
    return fail, participation


def _allowed(scheduled: float, percent: float) -> int:
    # Absences are whole periods, so "more than scheduled * p%" == "more than floor(...)".
    return math.floor(scheduled * percent / 100.0 + 1e-9)


def evaluate(course: Any, *, absent: int, excused: int, weeks: Optional[int] = None) -> Dict[str, Any]:
    """Absence status for one student in one course, from status counts."""
    weeks = semester_weeks() if weeks is None else weeks
    per_week = weekly_periods(course)
    scheduled = per_week * weeks
    fail_limit, participation_limit = course_limits(course)
    absences = absent + excused

    if scheduled > 0:
        allowed = _allowed(scheduled, fail_limit)
        participation_allowed: Optional[int] = _allowed(scheduled, participation_limit)
        percent = absences / scheduled * 100.0
        if absences > allowed:
            status = STATUS_INSUFFICIENT
        elif allowed > 0 and absences >= WARNING_RATIO * allowed:
            status = STATUS_WARNING
        else:
            status = STATUS_OK
        remaining: Optional[int] = max(0, allowed - absences)
        allowed_out: Optional[int] = allowed
        forfeited = participation_allowed is not None and absences > participation_allowed
    else:
        percent = 0.0
        status = STATUS_UNKNOWN
        remaining = None
        allowed_out = None
        participation_allowed = None
        forfeited = False

    return {
        "course_id": getattr(course, "id", None),
        "semester_weeks": weeks,
        "periods_per_week": per_week,
        "scheduled_periods": scheduled,
        "absences": absences,
        "unexcused_absences": absent,
        "excused_absences": excused,
        "absence_percent": round(percent, 2),
        "limit_percent": fail_limit,
        "allowed_absences": allowed_out,
        "remaining_absences": remaining,
        "participation_limit_percent": participation_limit,
        "participation_allowed_absences": participation_allowed,
        "participation_forfeited": forfeited,
        "status": status,
        "attendance_insufficient": status == STATUS_INSUFFICIENT,
    }


def evaluate_records(course: Any, records: Iterable[Any]) -> Dict[str, Any]:
    """Same as :func:`evaluate`, counting statuses from attendance rows."""
    absent = excused = 0
    for rec in records:
        s = str(getattr(rec, "status", "")).lower()
        if s == "absent":
            absent += 1
        elif s == "excused":
            excused += 1
    return evaluate(course, absent=absent, excused=excused)


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


def course_absence_status(db: Session, course: Any) -> List[Dict[str, Any]]:
    """Status for every enrolled (not dropped) student in a course."""
    counts = _status_counts(db, course_id=course.id)
    out = []
    for enr in _live_enrollments(db, course_id=course.id):
        c = counts.get((enr.student_id, course.id), {})
        result = evaluate(course, absent=c.get("absent", 0), excused=c.get("excused", 0))
        result.update(student_id=enr.student_id, course_id=enr.course_id)
        out.append(result)
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
        result = evaluate(course, absent=c.get("absent", 0), excused=c.get("excused", 0))
        result.update(
            student_id=student_id, course_id=course.id, course_code=course.course_code, course_name=course.course_name
        )
        out.append(result)
    return out
