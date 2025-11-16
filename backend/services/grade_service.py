"""Grade business logic service."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.schemas.grades import GradeCreate, GradeUpdate

logger = logging.getLogger(__name__)


class GradeService:
    """Encapsulates business logic for grade CRUD operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        try:
            self.Grade, self.Student, self.Course = import_names("models", "Grade", "Student", "Course")
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to import models: %s", exc, exc_info=True)
            raise internal_server_error(request=self.request)

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    def create_grade(self, grade: GradeCreate):
        """Create a new grade entry."""
        # Validate student exists
        get_by_id_or_404(
            self.db,
            self.Student,
            grade.student_id,
            error_code=ErrorCode.STUDENT_NOT_FOUND,
            request=self.request,
        )

        # Validate course exists
        get_by_id_or_404(
            self.db,
            self.Course,
            grade.course_id,
            error_code=ErrorCode.COURSE_NOT_FOUND,
            request=self.request,
        )

        with transaction(self.db):
            db_grade = self.Grade(**grade.model_dump())
            self.db.add(db_grade)
            self.db.flush()
            self.db.refresh(db_grade)

        logger.info(
            "Created grade: %s for student %s, course %s",
            db_grade.id,
            grade.student_id,
            grade.course_id,
        )
        return db_grade

    def list_grades(
        self,
        skip: int,
        limit: int,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        component_type: Optional[str] = None,
    ):
        """List grades with optional filters."""
        query = self.db.query(self.Grade).filter(self.Grade.deleted_at.is_(None))

        if student_id is not None:
            query = query.filter(self.Grade.student_id == student_id)
        if course_id is not None:
            query = query.filter(self.Grade.course_id == course_id)
        if component_type:
            query = query.filter(self.Grade.component_type == component_type)

        query = query.order_by(self.Grade.date_assigned.desc())
        return paginate(query, skip, limit)

    def get_grade(self, grade_id: int):
        """Get a single grade by ID."""
        return get_by_id_or_404(
            self.db,
            self.Grade,
            grade_id,
            error_code=ErrorCode.GRADE_NOT_FOUND,
            request=self.request,
        )

    def update_grade(self, grade_id: int, grade_update: GradeUpdate):
        """Update an existing grade."""
        db_grade = self.get_grade(grade_id)

        update_dict = grade_update.model_dump(exclude_unset=True)

        # Validate student if changed
        if "student_id" in update_dict:
            get_by_id_or_404(
                self.db,
                self.Student,
                update_dict["student_id"],
                error_code=ErrorCode.STUDENT_NOT_FOUND,
                request=self.request,
            )

        # Validate course if changed
        if "course_id" in update_dict:
            get_by_id_or_404(
                self.db,
                self.Course,
                update_dict["course_id"],
                error_code=ErrorCode.COURSE_NOT_FOUND,
                request=self.request,
            )

        with transaction(self.db):
            for field, value in update_dict.items():
                setattr(db_grade, field, value)
            self.db.flush()
            self.db.refresh(db_grade)

        logger.info("Updated grade: %s", db_grade.id)
        return db_grade

    def delete_grade(self, grade_id: int):
        """Soft delete a grade."""
        db_grade = self.get_grade(grade_id)

        with transaction(self.db):
            from datetime import datetime

            db_grade.deleted_at = datetime.utcnow()
            self.db.flush()

        logger.info("Deleted grade: %s", db_grade.id)
        return db_grade

    def bulk_create_grades(self, grades: List[GradeCreate]) -> List[Any]:
        """Bulk create multiple grades."""
        if not grades:
            return []

        # Validate all students and courses exist
        student_ids = {g.student_id for g in grades}
        course_ids = {g.course_id for g in grades}

        for sid in student_ids:
            get_by_id_or_404(
                self.db,
                self.Student,
                sid,
                error_code=ErrorCode.STUDENT_NOT_FOUND,
                request=self.request,
            )

        for cid in course_ids:
            get_by_id_or_404(
                self.db,
                self.Course,
                cid,
                error_code=ErrorCode.COURSE_NOT_FOUND,
                request=self.request,
            )

        with transaction(self.db):
            db_grades = [self.Grade(**g.model_dump()) for g in grades]
            self.db.add_all(db_grades)
            self.db.flush()
            for g in db_grades:
                self.db.refresh(g)

        logger.info("Bulk created %d grades", len(db_grades))
        return db_grades
