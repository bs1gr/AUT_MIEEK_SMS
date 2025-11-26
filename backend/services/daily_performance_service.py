"""Daily performance business logic service."""

import logging
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names

logger = logging.getLogger(__name__)


class DailyPerformanceService:
    """Service for CRUD-like operations on DailyPerformance records."""

    @staticmethod
    def create(db: Session, payload, request=None):
        """Create a DailyPerformance entry.

        Args:
            db: SQLAlchemy session
            payload: Pydantic DailyPerformanceCreate-like object with model_dump()
            request: Optional request for error context
        Returns:
            Created ORM object
        """
        DailyPerformance, Student, Course = import_names(
            "models", "DailyPerformance", "Student", "Course"
        )
        # Validate foreign keys
        _student = get_by_id_or_404(db, Student, payload.student_id)
        _course = get_by_id_or_404(db, Course, payload.course_id)

        db_performance = DailyPerformance(**payload.model_dump())
        db.add(db_performance)
        db.flush()
        db.refresh(db_performance)
        logger.info(
            "Created daily performance for student=%s course=%s date=%s",
            payload.student_id,
            payload.course_id,
            payload.date,
        )
        return db_performance

    @staticmethod
    def list_for_student(db: Session, student_id: int) -> List:
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        return (
            db.query(DailyPerformance)
            .filter(DailyPerformance.student_id == student_id, DailyPerformance.deleted_at.is_(None))
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
