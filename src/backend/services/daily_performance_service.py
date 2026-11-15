"""Daily performance business logic service."""

import logging
from datetime import datetime
from typing import List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, transaction
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names

logger = logging.getLogger(__name__)


class DailyPerformanceService:
    """Service for CRUD-like operations on DailyPerformance records."""

    @staticmethod
    def _find_live(db: Session, DailyPerformance, student_id: int, course_id: int, on_date, category: str):
        """The live rating of one slot (student, course, date, category), if there is one."""
        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.course_id == course_id,
                DailyPerformance.date == on_date,
                DailyPerformance.category == category,
                DailyPerformance.deleted_at.is_(None),
            )
            .first()
        )

    @staticmethod
    def create(db: Session, payload, request=None):
        """Record a rating: create it, or update the one this slot already has.

        There is one live rating per student, course, date and category
        (uq_daily_performance_live_slot). A client that does not know the row's id (its list was
        not loaded yet, or an offline queue replays a save) posts the rating again; that used to
        store it a second time, and every copy counted in the category's average. Now the
        existing row gets the new score. Notes are kept unless the request carries some.

        Commits its own transaction, so that a save that loses a race for a new slot can be
        retried once as an update.

        Args:
            db: SQLAlchemy session
            payload: Pydantic DailyPerformanceCreate-like object with model_dump()
            request: Optional request for error context
        Returns:
            The created or updated ORM object
        """
        DailyPerformance, Student, Course = import_names("models", "DailyPerformance", "Student", "Course")
        # Validate foreign keys
        _student = get_by_id_or_404(db, Student, payload.student_id)
        _course = get_by_id_or_404(db, Course, payload.course_id)

        for attempt in (1, 2):
            try:
                with transaction(db):
                    db_performance = DailyPerformanceService._find_live(
                        db, DailyPerformance, payload.student_id, payload.course_id, payload.date, payload.category
                    )
                    if db_performance is None:
                        db_performance = DailyPerformance(**payload.model_dump())
                        db.add(db_performance)
                        action = "Created"
                    else:
                        db_performance.score = payload.score
                        db_performance.max_score = payload.max_score
                        if payload.notes is not None:
                            db_performance.notes = payload.notes
                        action = "Updated"
                    db.flush()
                    db.refresh(db_performance)
                break
            except IntegrityError:
                if attempt == 2:
                    raise
                logger.info(
                    "Daily performance insert raced for student=%s course=%s date=%s; retrying as an update",
                    payload.student_id,
                    payload.course_id,
                    payload.date,
                )
        logger.info(
            "%s daily performance for student=%s course=%s date=%s",
            action,
            payload.student_id,
            payload.course_id,
            payload.date,
        )
        return db_performance

    @staticmethod
    def update(db: Session, record_id: int, payload, request=None):
        """Update a DailyPerformance entry.

        Args:
            db: SQLAlchemy session
            record_id: ID of the record to update
            payload: Pydantic object with update fields (must have model_dump())
            request: Optional request for error context
        Returns:
            Updated ORM object
        Raises:
            409 when a changed category would give the student a second rating in that category
            for the same course and date.
        """
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        record = get_by_id_or_404(db, DailyPerformance, record_id)

        # Update fields from payload
        update_data = payload.model_dump(exclude_unset=True)
        # An explicit null is "not sent": a rating always has a category.
        if "category" in update_data and update_data["category"] is None:
            del update_data["category"]

        def slot_taken():
            return http_error(
                409,
                ErrorCode.PERFORMANCE_CONFLICT,
                "This student already has a rating in that category for the same course and date",
                request,
            )

        new_category = update_data.get("category", record.category)
        if new_category != record.category:
            other = DailyPerformanceService._find_live(
                db, DailyPerformance, record.student_id, record.course_id, record.date, new_category
            )
            if other is not None and other.id != record.id:
                raise slot_taken()

        for key, value in update_data.items():
            setattr(record, key, value)

        try:
            db.flush()
        except IntegrityError:
            # The slot was taken between the check above and the write; the caller's
            # transaction rolls back.
            raise slot_taken()
        db.refresh(record)
        logger.info(
            "Updated daily performance id=%s for student=%s course=%s",
            record_id,
            record.student_id,
            record.course_id,
        )
        return record

    @staticmethod
    def delete(db: Session, record_id: int, request=None) -> None:
        """Soft delete a DailyPerformance entry."""
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        record = get_by_id_or_404(db, DailyPerformance, record_id)
        record.mark_deleted()
        db.flush()
        logger.info(
            "Deleted daily performance id=%s for student=%s course=%s",
            record_id,
            record.student_id,
            record.course_id,
        )

    @staticmethod
    def list_for_student(db: Session, student_id: int) -> List:
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )

    @staticmethod
    def list_for_student_course(db: Session, student_id: int, course_id: int) -> List:
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.course_id == course_id,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )

    @staticmethod
    def list_for_course_by_date(db: Session, course_id: int, date_str: str, request=None) -> List:
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError as exc:
            raise http_error(
                400,
                ErrorCode.VALIDATION_FAILED,
                "Invalid date format. Use YYYY-MM-DD",
                request,
            ) from exc

        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.course_id == course_id,
                DailyPerformance.date == target_date,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
