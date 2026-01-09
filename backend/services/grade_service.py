"""Grade business logic service."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, List, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import internal_server_error
from backend.import_resolver import import_names
from backend.schemas.audit import AuditAction, AuditResource
from backend.schemas.grades import GradeCreate, GradeUpdate
from backend.schemas.highlights import HighlightCreate
from backend.services.analytics_service import AnalyticsService
from backend.services.audit_service import AuditLogger
from backend.services.highlight_service import HighlightService

logger = logging.getLogger(__name__)


class GradeService:
    """Encapsulates business logic for grade CRUD operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        self.audit = AuditLogger(db)
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
            request=self.request,
        )

        # Validate course exists
        get_by_id_or_404(
            self.db,
            self.Course,
            grade.course_id,
            request=self.request,
        )

        with transaction(self.db):
            db_grade = self.Grade(**grade.model_dump())
            self.db.add(db_grade)
            self.db.flush()
            self.db.refresh(db_grade)

            # Auto-create excellence highlight for top performance (A / A+)
            self._maybe_create_excellence_highlight(db_grade)

        logger.info(
            "Created grade: %s for student %s, course %s",
            db_grade.id,
            grade.student_id,
            grade.course_id,
        )

        # Audit log
        self._log_audit(
            action=AuditAction.CREATE,
            resource_id=str(db_grade.id),
            new_values=self._serialize_grade(db_grade),
        )

        return db_grade

    def list_grades(
        self,
        skip: int,
        limit: int,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        component_type: Optional[str] = None,
        category: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        use_submitted: bool = False,
    ):
        """List grades with optional filters and eager-loaded relationships.

        OPTIMIZATION (v1.15.0): Added eager loading of student and course
        relationships to eliminate N+1 queries. This provides ~95% performance
        improvement on large result sets.
        """
        from sqlalchemy.orm import selectinload

        query = self.db.query(self.Grade).filter(self.Grade.deleted_at.is_(None))

        # Eager-load relationships to prevent N+1 queries
        query = query.options(selectinload(self.Grade.student), selectinload(self.Grade.course))

        if student_id is not None:
            query = query.filter(self.Grade.student_id == student_id)
        if course_id is not None:
            query = query.filter(self.Grade.course_id == course_id)
        if component_type:
            query = query.filter(self.Grade.component_type == component_type)
        if category:
            query = query.filter(self.Grade.category.ilike(f"%{category}%"))

        if start_date is not None:
            date_col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(date_col >= start_date)
        if end_date is not None:
            date_col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(date_col <= end_date)

        query = query.order_by(self.Grade.date_assigned.desc())
        return paginate(query, skip, limit)

    def get_grade(self, grade_id: int):
        """Get a single grade by ID."""
        return get_by_id_or_404(
            self.db,
            self.Grade,
            grade_id,
            request=self.request,
        )

    def update_grade(self, grade_id: int, grade_update: GradeUpdate):
        """Update an existing grade."""
        db_grade = self.get_grade(grade_id)
        old_values = self._serialize_grade(db_grade)

        update_dict = grade_update.model_dump(exclude_unset=True)

        # Validate student if changed
        if "student_id" in update_dict:
            get_by_id_or_404(
                self.db,
                self.Student,
                update_dict["student_id"],
                request=self.request,
            )

        # Validate course if changed
        if "course_id" in update_dict:
            get_by_id_or_404(
                self.db,
                self.Course,
                update_dict["course_id"],
                request=self.request,
            )

        with transaction(self.db):
            for field, value in update_dict.items():
                setattr(db_grade, field, value)
            self.db.flush()
            self.db.refresh(db_grade)

        logger.info("Updated grade: %s", db_grade.id)

        # Audit log
        self._log_audit(
            action=AuditAction.UPDATE,
            resource_id=str(db_grade.id),
            old_values=old_values,
            new_values=self._serialize_grade(db_grade),
        )

        return db_grade

    def delete_grade(self, grade_id: int):
        """Soft delete a grade."""
        db_grade = self.get_grade(grade_id)
        old_values = self._serialize_grade(db_grade)

        with transaction(self.db):
            from datetime import datetime, timezone

            db_grade.deleted_at = datetime.now(timezone.utc)
            self.db.flush()

        logger.info("Deleted grade: %s", db_grade.id)

        # Audit log
        self._log_audit(
            action=AuditAction.DELETE,
            resource_id=str(db_grade.id),
            old_values=old_values,
            new_values={"deleted_at": str(db_grade.deleted_at)},
        )

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
                request=self.request,
            )

        for cid in course_ids:
            get_by_id_or_404(
                self.db,
                self.Course,
                cid,
                request=self.request,
            )

        with transaction(self.db):
            db_grades = [self.Grade(**g.model_dump()) for g in grades]
            self.db.add_all(db_grades)
            self.db.flush()
            for g in db_grades:
                self.db.refresh(g)

        logger.info("Bulk created %d grades", len(db_grades))

        # Audit log
        self._log_audit(
            action=AuditAction.BULK_IMPORT,
            resource_id=None,
            new_values={"count": len(db_grades), "grade_ids": [g.id for g in db_grades]},
        )

        return db_grades

    # Convenience helpers for router parity
    def list_student_grades(
        self,
        student_id: int,
        course_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        use_submitted: bool = False,
    ) -> List[Any]:
        get_by_id_or_404(self.db, self.Student, student_id, request=self.request)
        query = self.db.query(self.Grade).filter(
            self.Grade.student_id == student_id,
            self.Grade.deleted_at.is_(None),
        )
        if course_id is not None:
            query = query.filter(self.Grade.course_id == course_id)
        if start_date is not None:
            col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(col >= start_date)
        if end_date is not None:
            col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(col <= end_date)
        return query.all()

    def list_course_grades(
        self,
        course_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        use_submitted: bool = False,
    ) -> List[Any]:
        get_by_id_or_404(self.db, self.Course, course_id, request=self.request)
        query = self.db.query(self.Grade).filter(
            self.Grade.course_id == course_id,
            self.Grade.deleted_at.is_(None),
        )
        if start_date is not None:
            col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(col >= start_date)
        if end_date is not None:
            col = self.Grade.date_submitted if use_submitted else self.Grade.date_assigned
            query = query.filter(col <= end_date)
        return query.all()

    # Metrics hooks
    def _track_grade_submission(self, course_id: int, category: Optional[str]) -> None:
        try:
            from backend.middleware.prometheus_metrics import track_grade_submission

            course = self.db.query(self.Course).filter(self.Course.id == course_id).first()
            code = getattr(course, "course_code", "unknown") if course else "unknown"
            track_grade_submission(str(code), str(category or "unknown"))
        except Exception:
            # Metrics optional
            pass

    # -------------------- Internal helpers --------------------
    def _maybe_create_excellence_highlight(self, db_grade: Any) -> None:
        """Create a positive Excellence highlight when a grade is A or A+.

        Avoids duplicates by matching on identical highlight_text for the same student.
        """
        try:
            (Highlight,) = import_names("models", "Highlight")
            course = self.db.query(self.Course).filter(self.Course.id == db_grade.course_id).first()
            if not course:
                return

            percentage = 0.0
            try:
                percentage = float(db_grade.grade) / float(db_grade.max_grade or 1) * 100.0
            except Exception:
                percentage = 0.0

            letter = AnalyticsService.get_letter_grade(percentage)
            if letter not in ("A", "A+"):
                return

            highlight_text = f"Excellence: {db_grade.assignment_name} ({letter}, {percentage:.1f}%) in {getattr(course, 'course_code', 'Course')}"

            existing = (
                self.db.query(Highlight)
                .filter(
                    Highlight.student_id == db_grade.student_id,
                    Highlight.category == "Excellence",
                    Highlight.highlight_text == highlight_text,
                    Highlight.deleted_at.is_(None),
                )
                .first()
            )
            if existing:
                return

            payload = HighlightService.create(
                self.db,
                HighlightCreate(
                    student_id=db_grade.student_id,
                    semester=getattr(course, "semester", "Unknown"),
                    rating=5 if letter == "A+" else 4,
                    category="Excellence",
                    highlight_text=highlight_text,
                    is_positive=True,
                ),
            )
            return payload
        except Exception:
            # Highlight creation is best-effort and should not block grade creation
            logger.warning("Excellence highlight creation skipped", exc_info=True)
            return None

    # ------------------------------------------------------------------
    # Audit helpers
    # ------------------------------------------------------------------
    def _serialize_grade(self, grade: Any) -> dict[str, Any]:
        """Minimal serialization for audit logging."""
        return {
            "id": grade.id,
            "student_id": grade.student_id,
            "course_id": grade.course_id,
            "assignment_name": grade.assignment_name,
            "category": grade.category,
            "grade": grade.grade,
            "max_grade": grade.max_grade,
            "weight": grade.weight,
            "date_assigned": str(grade.date_assigned) if grade.date_assigned else None,
            "date_submitted": str(grade.date_submitted) if grade.date_submitted else None,
            "notes": grade.notes,
        }

    def _log_audit(
        self,
        *,
        action: AuditAction,
        resource_id: Optional[str],
        details: Optional[dict[str, Any]] = None,
        old_values: Optional[dict[str, Any]] = None,
        new_values: Optional[dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        try:
            if self.request:
                self.audit.log_from_request(
                    request=self.request,
                    action=action,
                    resource=AuditResource.GRADE,
                    resource_id=resource_id,
                    details=details,
                    success=success,
                    error_message=error_message,
                    old_values=old_values,
                    new_values=new_values,
                )
            else:
                self.audit.log_action(
                    action=action,
                    resource=AuditResource.GRADE,
                    resource_id=resource_id,
                    details=details,
                    success=success,
                    error_message=error_message,
                    old_values=old_values,
                    new_values=new_values,
                )
        except Exception:  # pragma: no cover
            logger.exception("Failed to log audit event for grade action")
