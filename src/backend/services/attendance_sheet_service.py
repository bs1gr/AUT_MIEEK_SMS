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

    result = AttendanceSheetResult()

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
    result.skipped_student_ids = sorted(wanted_ids - known_ids)

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
                # First row wins, as in the per-record upsert (.first()).
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
                # The page shows (and edits) the newest row when a day has duplicates.
                row = matches[-1]
                if row.score != entry.score or row.max_score != entry.max_score:
                    row.score = entry.score
                    row.max_score = entry.max_score
                    result.performance_updated += 1
                else:
                    result.performance_unchanged += 1

        db.flush()

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
