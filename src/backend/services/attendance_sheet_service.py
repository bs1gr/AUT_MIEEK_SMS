"""Save a whole attendance sheet (one course, one date) in one request.

The Attendance page used to send one request per student and period, plus one per performance
score. On a host whose database is tens of milliseconds away (the cloud VM, plan todo 44) a class
of 25 students with two periods took longer than the app's request timeout, the app treated that
as "offline" and queued the sheet, and the retries made it worse. This does the same work with a
fixed number of queries, whatever the size of the class: one for the course, one for the
students, one for the day's attendance rows, one for the day's performance rows, then the writes
in a single transaction.

The result is what the per-record endpoints would have produced: a row that exists is updated,
one that does not is created, and nothing else is touched.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, transaction
from backend.import_resolver import import_names
from backend.schemas.attendance import AttendanceSheetResult, AttendanceSheetSave

logger = logging.getLogger(__name__)


def save_attendance_sheet(
    db: Session, sheet: AttendanceSheetSave, request: Optional[Request] = None
) -> AttendanceSheetResult:
    Attendance, DailyPerformance, Student, Course = import_names(
        "models", "Attendance", "DailyPerformance", "Student", "Course"
    )
    get_by_id_or_404(db, Course, sheet.course_id, request=request)

    # A student deleted since the sheet was filled in (it may have waited in a phone's offline
    # queue) must not make the whole sheet unsaveable: leave those rows out and say so.
    wanted_ids = (
        {entry.student_id for entry in sheet.attendance}
        | {entry.student_id for entry in sheet.daily_performance}
        | {entry.student_id for entry in sheet.daily_performance_deletes}
    )
    known_ids: set[int] = set()
    if wanted_ids:
        known_ids = {
            row[0]
            for row in db.query(Student.id).filter(Student.id.in_(wanted_ids), Student.deleted_at.is_(None)).all()
        }
    skipped_student_ids = sorted(wanted_ids - known_ids)

    # The database allows one live row per slot (uq_attendance_live_slot,
    # uq_daily_performance_live_slot). If another save creates one of this sheet's rows between
    # the reads below and the commit, the whole sheet is rolled back and applied again: the second
    # pass finds those rows and updates them.
    for attempt in (1, 2):
        try:
            result = _apply_sheet(db, sheet, known_ids, Attendance, DailyPerformance)
            break
        except IntegrityError:
            if attempt == 2:
                raise
            logger.info(
                "Attendance sheet for course %s on %s raced with another save; applying it again",
                sheet.course_id,
                sheet.date,
            )
    result.skipped_student_ids = skipped_student_ids

    logger.info(
        "Saved attendance sheet course=%s date=%s: attendance +%s ~%s, performance +%s ~%s -%s, skipped students %s",
        sheet.course_id,
        sheet.date,
        result.attendance_created,
        result.attendance_updated,
        result.performance_created,
        result.performance_updated,
        result.performance_deleted,
        len(result.skipped_student_ids),
    )
    return result


def _apply_sheet(
    db: Session, sheet: AttendanceSheetSave, known_ids: set[int], Attendance, DailyPerformance
) -> AttendanceSheetResult:
    """One attempt at writing the sheet, in one transaction."""
    result = AttendanceSheetResult()

    with transaction(db):
        if sheet.attendance:
            existing_attendance: dict[tuple[int, int], object] = {}
            rows = (
                db.query(Attendance)
                .filter(
                    Attendance.course_id == sheet.course_id,
                    Attendance.date == sheet.date,
                    Attendance.deleted_at.is_(None),
                )
                .order_by(Attendance.id)
                .all()
            )
            for row in rows:
                # One row per slot since uq_attendance_live_slot. Should a database still hold a
                # repeat (its migration has not run), the first row is the one that is updated.
                existing_attendance.setdefault((row.student_id, row.period_number or 1), row)

            # The last entry for a student and period wins if the request repeats one.
            wanted_status = {
                (entry.student_id, entry.period_number): entry.status
                for entry in sheet.attendance
                if entry.student_id in known_ids
            }
            for (student_id, period_number), status in wanted_status.items():
                row = existing_attendance.get((student_id, period_number))
                if row is None:
                    db.add(
                        Attendance(
                            student_id=student_id,
                            course_id=sheet.course_id,
                            date=sheet.date,
                            status=status,
                            period_number=period_number,
                            notes="",
                        )
                    )
                    result.attendance_created += 1
                elif row.status != status:  # type: ignore[attr-defined]
                    row.status = status  # type: ignore[attr-defined]
                    result.attendance_updated += 1
                else:
                    result.attendance_unchanged += 1

        if sheet.daily_performance or sheet.daily_performance_deletes:
            existing_performance: dict[tuple[int, str], list] = {}
            rows = (
                db.query(DailyPerformance)
                .filter(
                    DailyPerformance.course_id == sheet.course_id,
                    DailyPerformance.date == sheet.date,
                    DailyPerformance.deleted_at.is_(None),
                )
                .order_by(DailyPerformance.id)
                .all()
            )
            for row in rows:
                existing_performance.setdefault((row.student_id, row.category), []).append(row)

            deleted_keys: set[tuple[int, str]] = set()
            for entry in sheet.daily_performance_deletes:
                key = (entry.student_id, entry.category)
                if key in deleted_keys:
                    continue
                deleted_keys.add(key)
                for row in existing_performance.pop(key, []):
                    row.mark_deleted()
                    result.performance_deleted += 1

            wanted_scores = {
                (entry.student_id, entry.category): entry
                for entry in sheet.daily_performance
                if entry.student_id in known_ids
            }
            for key, entry in wanted_scores.items():
                matches = existing_performance.get(key)
                if not matches:
                    db.add(
                        DailyPerformance(
                            student_id=entry.student_id,
                            course_id=sheet.course_id,
                            date=sheet.date,
                            category=entry.category,
                            score=entry.score,
                            max_score=entry.max_score,
                            notes="",
                        )
                    )
                    result.performance_created += 1
                    continue
                # One row per slot since uq_daily_performance_live_slot. Should a database still
                # hold a repeat, the newest is the one the page shows, so that one is updated.
                row = matches[-1]
                if row.score != entry.score or row.max_score != entry.max_score:
                    row.score = entry.score
                    row.max_score = entry.max_score
                    result.performance_updated += 1
                else:
                    result.performance_unchanged += 1

        db.flush()

    return result
