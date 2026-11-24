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
courses without a period schedule), unless the course keeps its own total (``semester_periods``,
plan todo 71: a schedule changed from week N on keeps the weeks before N at the old count).
Absent and Excused both count as absences; Late does not. Present and Late are attended: one
meaning on every page (the owner, 2026-11-23, plan todo 77: "Late should not count as absent").
The number of Lates is still counted and shown, for the teacher's evaluation.

The Directorate-approved extended limit (15%, per enrollment) was removed on 2026-10-07; its
database columns stay until every installed app no longer reads them.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
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

# What a period's attendance status means, lower-cased: the one definition every rate uses.
ATTENDED_STATUSES = frozenset({"present", "late"})
ABSENCE_STATUSES = frozenset({"absent", "excused"})


# The four statuses as every page and the API write them (schemas/attendance.py).
STATUS_FORMS = ("Present", "Absent", "Late", "Excused")
_STATUS_BY_KEY = {form.lower(): form for form in STATUS_FORMS}


def is_attended(status: Any) -> bool:
    """Present or Late, whatever the case the row was stored in."""
    return str(status or "").strip().lower() in ATTENDED_STATUSES


def status_form(status: Any) -> Optional[str]:
    """The status as the API writes it ("late " -> "Late"), or None for any other word."""
    return _STATUS_BY_KEY.get(str(status or "").strip().lower())


def semester_weeks() -> int:
    return int(getattr(settings, "SEMESTER_WEEKS", 14) or 14)


def _today() -> date:
    return date.today()


def weekly_periods(course: Any) -> float:
    periods = int(getattr(course, "periods_per_week", 0) or 0)
    if periods > 0:
        return float(periods)
    return float(getattr(course, "hours_per_week", 0) or 0)


def scheduled_total(course: Any, weeks: Optional[int] = None) -> float:
    """The periods a course has in the semester: its own total when it keeps one (plan todo 71),
    otherwise its periods per week times the semester's weeks."""
    stored = getattr(course, "semester_periods", None)
    if stored is not None and stored > 0:
        return float(stored)
    return weekly_periods(course) * (semester_weeks() if weeks is None else weeks)


def total_after_change(course: Any, *, new_weekly: float, from_week: int, weeks: Optional[int] = None) -> int:
    """The semester's total when the periods per week become ``new_weekly`` from week
    ``from_week`` on (plan todo 71): the weeks before keep the count they were taught with.

    The weeks from ``from_week`` to the end were counted at today's periods per week (also
    after an earlier change, which only kept the weeks before it), so they are counted again at
    the new number: 2 -> 3 from week 8 of 14 gives 28 + (3 - 2) x 7 = 35, and a later 3 -> 1
    from week 11 gives 35 - 2 x 4 = 27.
    """
    weeks = semester_weeks() if weeks is None else weeks
    from_week = min(max(int(from_week), 1), weeks)
    remaining = weeks - from_week + 1
    total = scheduled_total(course, weeks) + (float(new_weekly) - weekly_periods(course)) * remaining
    return max(0, int(round(total)))


def week_of(first_lesson: date) -> int:
    """The week of the semester today is in, counting from the week (Monday) of the first lesson,
    within the semester: the week a schedule change made today applies from (plan todo 71)."""
    first_monday = first_lesson - timedelta(days=first_lesson.weekday())
    week = (_today() - first_monday).days // 7 + 1
    return min(max(week, 1), semester_weeks())


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


def evaluate(course: Any, *, absent: int, excused: int, late: int = 0, weeks: Optional[int] = None) -> Dict[str, Any]:
    """Absence status for one student in one course, from status counts.

    ``late`` is not an absence; it is only reported beside them, for the teacher to weigh."""
    weeks = semester_weeks() if weeks is None else weeks
    per_week = weekly_periods(course)
    scheduled = scheduled_total(course, weeks)
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
        "late": late,
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
    absent = excused = late = 0
    for rec in records:
        s = str(getattr(rec, "status", "")).lower()
        if s == "absent":
            absent += 1
        elif s == "excused":
            excused += 1
        elif s == "late":
            late += 1
    return evaluate(course, absent=absent, excused=excused, late=late)


def _status_counts(db: Session, **filters: int) -> Dict[tuple[int, int], Dict[str, int]]:
    """{(student_id, course_id): {"absent": n, "excused": n, "late": n}} for non-deleted rows."""
    (Attendance,) = import_names("models", "Attendance")
    status_lower = func.lower(Attendance.status)
    q = db.query(Attendance.student_id, Attendance.course_id, status_lower, func.count(Attendance.id)).filter(
        Attendance.deleted_at.is_(None), status_lower.in_(["absent", "excused", "late"])
    )
    for column, value in filters.items():
        q = q.filter(getattr(Attendance, column) == value)
    counts: Dict[tuple[int, int], Dict[str, int]] = {}
    for student_id, course_id, status, n in q.group_by(Attendance.student_id, Attendance.course_id, status_lower):
        counts.setdefault((student_id, course_id), {"absent": 0, "excused": 0, "late": 0})[status] = int(n)
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
        result = evaluate(course, absent=c.get("absent", 0), excused=c.get("excused", 0), late=c.get("late", 0))
        result.update(student_id=enr.student_id, course_id=enr.course_id)
        out.append(result)
    return out


def _totals(result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: result[key]
        for key in ("periods_per_week", "scheduled_periods", "allowed_absences", "participation_allowed_absences")
    }


def schedule_change_preview(db: Session, course: Any, after: Any) -> Dict[str, Any]:
    """What a change of a course's weekly periods would do to its students (plan todo 69).

    ``after`` is the course as it would be saved (its periods per week and limits). A change in
    periods recalculates every student's limits for the whole semester, past weeks included,
    and can push a student over the fail or the Class Participation limit (or back under it);
    nothing showed that before a save. Read-only: returns the totals before and after, and the
    enrolled students whose status or participation share would change, by name.
    """
    (Attendance, Student) = import_names("models", "Attendance", "Student")
    counts = _status_counts(db, course_id=course.id)
    enrollments = _live_enrollments(db, course_id=course.id)
    ids = [enr.student_id for enr in enrollments]
    students = {s.id: s for s in db.query(Student).filter(Student.id.in_(ids)).all()} if ids else {}

    changes = []
    for enr in enrollments:
        c = counts.get((enr.student_id, course.id), {})
        before_result = evaluate(course, absent=c.get("absent", 0), excused=c.get("excused", 0))
        after_result = evaluate(after, absent=c.get("absent", 0), excused=c.get("excused", 0))
        if (
            before_result["status"] == after_result["status"]
            and before_result["participation_forfeited"] == after_result["participation_forfeited"]
        ):
            continue
        student = students.get(enr.student_id)
        changes.append(
            {
                "student_id": enr.student_id,
                "student_name": f"{student.first_name} {student.last_name}".strip() if student else "",
                "absences": before_result["absences"],
                "status_before": before_result["status"],
                "status_after": after_result["status"],
                "participation_forfeited_before": before_result["participation_forfeited"],
                "participation_forfeited_after": after_result["participation_forfeited"],
            }
        )
    changes.sort(key=lambda change: change["student_name"].casefold())

    first_lesson = (
        db.query(func.min(Attendance.date))
        .filter(Attendance.course_id == course.id, Attendance.deleted_at.is_(None))
        .scalar()
    )
    if isinstance(first_lesson, datetime):
        first_lesson = first_lesson.date()
    return {
        "course_id": course.id,
        "before": _totals(evaluate(course, absent=0, excused=0)),
        "after": _totals(evaluate(after, absent=0, excused=0)),
        "enrolled_students": len(enrollments),
        "has_attendance": first_lesson is not None,
        "changes": changes,
        # Plan todo 71: whether the periods per week change (then the page asks from which week),
        # and the week today is in, counted from the first recorded lesson.
        "periods_change": weekly_periods(after) != weekly_periods(course),
        "suggested_from_week": week_of(first_lesson) if first_lesson is not None else None,
        "semester_weeks": semester_weeks(),
    }


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
        result = evaluate(course, absent=c.get("absent", 0), excused=c.get("excused", 0), late=c.get("late", 0))
        result.update(
            student_id=student_id, course_id=course.id, course_code=course.course_code, course_name=course.course_name
        )
        out.append(result)
    return out
