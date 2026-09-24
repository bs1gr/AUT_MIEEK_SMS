"""Course activation rule.

A course is active exactly while it has at least one student with an active
enrollment (``status == "active"`` and not soft-deleted). New courses therefore
start inactive, enrolling the first student activates the course, and ending a
course (its enrollments become ``completed``) deactivates it.

``Course.is_active`` is a stored, derived flag: every code path that changes
enrollments must call :func:`sync_course_activation` for the affected courses.
The nightly course-activation scheduler re-runs it for all courses as a
safety net.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable, Optional

from sqlalchemy.orm import Session

from backend.import_resolver import import_names

logger = logging.getLogger(__name__)

ACTIVE = "active"
COMPLETED = "completed"


def sync_course_activation(db: Session, course_ids: Optional[Iterable[Any]] = None) -> int:
    """Recompute ``is_active`` for the given courses (all courses when ``None``).

    Flushes pending changes first so enrollment edits in the current
    transaction are seen. Does not commit. Returns how many courses changed.
    """
    Course, CourseEnrollment = import_names("models", "Course", "CourseEnrollment")

    ids: Optional[set[int]] = None
    if course_ids is not None:
        ids = {int(cid) for cid in course_ids if cid is not None}
        if not ids:
            return 0

    db.flush()

    enrolled_q = db.query(CourseEnrollment.course_id).filter(
        CourseEnrollment.deleted_at.is_(None),
        CourseEnrollment.status == ACTIVE,
    )
    courses_q = db.query(Course).filter(Course.deleted_at.is_(None))
    if ids is not None:
        enrolled_q = enrolled_q.filter(CourseEnrollment.course_id.in_(ids))
        courses_q = courses_q.filter(Course.id.in_(ids))

    with_students = {row[0] for row in enrolled_q.distinct()}

    changed = 0
    for course in courses_q:
        should_be_active = course.id in with_students
        if course.is_active is None or bool(course.is_active) != should_be_active:
            course.is_active = should_be_active
            changed += 1
            logger.info("Course %s (%s) is_active -> %s", course.id, course.course_code, should_be_active)

    if changed:
        db.flush()
    return changed


def _set_enrollment_status(db: Session, course_id: int, from_status: str, to_status: str) -> int:
    (CourseEnrollment,) = import_names("models", "CourseEnrollment")
    updated = (
        db.query(CourseEnrollment)
        .filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.deleted_at.is_(None),
            CourseEnrollment.status == from_status,
        )
        .update({"status": to_status}, synchronize_session=False)
    )
    sync_course_activation(db, [course_id])
    return int(updated or 0)


def end_course(db: Session, course_id: int) -> int:
    """Mark the course's active enrollments completed (so the course deactivates).

    Grades, attendance and the enrollment rows themselves are kept.
    Returns the number of enrollments completed.
    """
    return _set_enrollment_status(db, course_id, ACTIVE, COMPLETED)


def reactivate_course(db: Session, course_id: int) -> int:
    """Undo :func:`end_course`: completed enrollments become active again.

    Returns the number of enrollments restored; with none, the course stays inactive.
    """
    return _set_enrollment_status(db, course_id, COMPLETED, ACTIVE)
