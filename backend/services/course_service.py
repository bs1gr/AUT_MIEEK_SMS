"""Course business logic service."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import (
    ErrorCode,
    build_error_detail,
    http_error,
    internal_server_error,
)
from backend.import_resolver import import_names
from backend.schemas.courses import CourseCreate, CourseUpdate

logger = logging.getLogger(__name__)


class CourseService:
    """Encapsulates business logic for course CRUD operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        try:
            (self.Course,) = import_names("models", "Course")
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to import Course model: %s", exc, exc_info=True)
            raise internal_server_error(request=self.request)

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    def create_course(self, course: CourseCreate):
        """Create a new course."""
        self._assert_unique_code(course.course_code)

        with transaction(self.db):
            db_course = self.Course(**course.model_dump())
            self.db.add(db_course)
            self.db.flush()
            self.db.refresh(db_course)

        logger.info("Created course: %s - %s", db_course.id, db_course.course_code)
        return db_course

    def list_courses(
        self,
        skip: int,
        limit: int,
        semester: Optional[str] = None,
        year: Optional[int] = None,
        is_active: Optional[bool] = None,
    ):
        """List courses with optional filters."""
        query = self.db.query(self.Course).filter(self.Course.deleted_at.is_(None))

        if semester:
            query = query.filter(self.Course.semester == semester)
        if year is not None:
            query = query.filter(self.Course.year == year)
        if is_active is not None:
            query = query.filter(self.Course.is_active == is_active)

        query = query.order_by(self.Course.year.desc(), self.Course.semester, self.Course.course_code)
        return paginate(query, skip, limit)

    def get_course(self, course_id: int):
        """Get a single course by ID."""
        return get_by_id_or_404(
            self.db,
            self.Course,
            course_id,
            error_code=ErrorCode.COURSE_NOT_FOUND,
            request=self.request,
        )

    def update_course(self, course_id: int, course_update: CourseUpdate):
        """Update an existing course."""
        db_course = self.get_course(course_id)

        # Check for duplicate course_code if changing
        update_dict = course_update.model_dump(exclude_unset=True)
        if "course_code" in update_dict and update_dict["course_code"] != db_course.course_code:
            self._assert_unique_code(update_dict["course_code"], exclude_id=course_id)

        with transaction(self.db):
            for field, value in update_dict.items():
                setattr(db_course, field, value)
            self.db.flush()
            self.db.refresh(db_course)

        logger.info("Updated course: %s - %s", db_course.id, db_course.course_code)
        return db_course

    def delete_course(self, course_id: int):
        """Soft delete a course."""
        db_course = self.get_course(course_id)

        with transaction(self.db):
            from datetime import datetime

            db_course.deleted_at = datetime.utcnow()
            self.db.flush()

        logger.info("Deleted course: %s - %s", db_course.id, db_course.course_code)
        return db_course

    def update_evaluation_rules(self, course_id: int, rules: List[Dict[str, Any]]):
        """Update course evaluation rules."""
        db_course = self.get_course(course_id)

        with transaction(self.db):
            db_course.evaluation_rules = rules
            self.db.flush()
            self.db.refresh(db_course)

        logger.info("Updated evaluation rules for course: %s", db_course.course_code)
        return db_course

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------
    def _assert_unique_code(self, course_code: str, exclude_id: Optional[int] = None):
        """Check if course_code is unique."""
        query = self.db.query(self.Course).filter(
            self.Course.course_code == course_code,
            self.Course.deleted_at.is_(None),
        )
        if exclude_id is not None:
            query = query.filter(self.Course.id != exclude_id)

        existing = query.first()
        if existing:
            raise http_error(
                409,
                ErrorCode.COURSE_CODE_CONFLICT,
                build_error_detail(
                    "Course code already exists",
                    {"course_code": course_code, "existing_id": existing.id},
                ),
                request=self.request,
            )
