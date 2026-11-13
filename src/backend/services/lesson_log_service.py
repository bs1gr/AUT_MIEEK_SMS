"""Lesson log business logic: the material covered and the teacher's notes per teaching period."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db.utils import get_by_id_or_404, paginate, transaction
from backend.errors import internal_server_error
from backend.import_resolver import import_names
from backend.schemas.lesson_log import LessonLogUpsert

logger = logging.getLogger(__name__)

TEXT_FIELDS = ("material_covered", "teacher_notes")


def _clean(value: Optional[str]) -> Optional[str]:
    """Store blank text as NULL, so "has this period been filled in?" has a single answer."""
    if value is None or not value.strip():
        return None
    return value


def _editor_identity(editor: Any) -> tuple[Optional[int], Optional[str]]:
    """(id, display name) of the signed-in user: the full name, or the e-mail when none is set."""
    if editor is None:
        return None, None
    name = (getattr(editor, "full_name", None) or "").strip() or (getattr(editor, "email", None) or "").strip()
    if not name:
        return None, None
    editor_id = getattr(editor, "id", None)
    return (editor_id if isinstance(editor_id, int) else None), name[:255]


class LessonLogService:
    """Encapsulates upsert and listing of lesson logs (one row per course, date and period)."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        try:
            self.LessonLog, self.Course = import_names("models", "LessonLog", "Course")
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to import models: %s", exc, exc_info=True)
            raise internal_server_error(request=self.request)

    def _find(self, course_id: int, on_date: date, period_number: int):
        return (
            self.db.query(self.LessonLog)
            .filter(
                self.LessonLog.course_id == course_id,
                self.LessonLog.date == on_date,
                self.LessonLog.period_number == period_number,
            )
            .first()
        )

    def upsert(self, data: LessonLogUpsert, editor: Any = None):
        """Create the log for this course, date and period, or update the text fields that were sent.

        Fields missing from the request keep their stored value; this is what lets the two
        textareas autosave independently. If two saves race to create the same new row, the
        loser hits the unique key and is retried once as an update.

        ``editor`` is the signed-in user, when there is one. It is recorded as the last editor
        only when the save really changes the text, so re-sending what is already stored (a
        retried autosave, the offline queue replaying) does not put a new name on the entry.
        """
        get_by_id_or_404(self.db, self.Course, data.course_id, request=self.request)

        changes = {name: _clean(getattr(data, name)) for name in TEXT_FIELDS if name in data.model_fields_set}
        editor_id, editor_name = _editor_identity(editor)

        for attempt in (1, 2):
            try:
                with transaction(self.db):
                    row = self._find(data.course_id, data.date, data.period_number)
                    if row is None:
                        row = self.LessonLog(
                            course_id=data.course_id,
                            date=data.date,
                            period_number=data.period_number,
                            **changes,
                        )
                        self.db.add(row)
                        changed = True
                    else:
                        changed = any(getattr(row, name) != value for name, value in changes.items())
                        for name, value in changes.items():
                            setattr(row, name, value)
                    if changed and editor_name:
                        row.updated_by_id = editor_id
                        row.updated_by_name = editor_name
                    self.db.flush()
                    self.db.refresh(row)
                return row
            except IntegrityError:
                if attempt == 2:
                    raise
                logger.info(
                    "Lesson log insert raced for course %s on %s period %s; retrying as an update",
                    data.course_id,
                    data.date,
                    data.period_number,
                )
        raise internal_server_error(request=self.request)  # pragma: no cover - loop always returns or raises

    def list_logs(
        self,
        skip: int,
        limit: int,
        course_id: Optional[int] = None,
        on_date: Optional[date] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        period_number: Optional[int] = None,
    ):
        """List lesson logs, newest date first, then by period. Logs of deleted courses are hidden."""
        query = (
            self.db.query(self.LessonLog)
            .join(self.Course, self.Course.id == self.LessonLog.course_id)
            .filter(self.Course.deleted_at.is_(None))
        )
        if course_id is not None:
            query = query.filter(self.LessonLog.course_id == course_id)
        if on_date is not None:
            query = query.filter(self.LessonLog.date == on_date)
        if start_date is not None:
            query = query.filter(self.LessonLog.date >= start_date)
        if end_date is not None:
            query = query.filter(self.LessonLog.date <= end_date)
        if period_number is not None:
            query = query.filter(self.LessonLog.period_number == period_number)

        query = query.order_by(self.LessonLog.date.desc(), self.LessonLog.period_number.asc())
        return paginate(query, skip, limit)

    def course_log(
        self,
        course_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ):
        """(course, every log of it in the range) in teaching order: oldest date first, then period.

        This is what the PDF and Excel exports print. Raises 404 for an unknown or deleted course.
        """
        course = get_by_id_or_404(self.db, self.Course, course_id, request=self.request)
        query = self.db.query(self.LessonLog).filter(self.LessonLog.course_id == course_id)
        if start_date is not None:
            query = query.filter(self.LessonLog.date >= start_date)
        if end_date is not None:
            query = query.filter(self.LessonLog.date <= end_date)
        rows = query.order_by(self.LessonLog.date.asc(), self.LessonLog.period_number.asc()).all()
        return course, rows
