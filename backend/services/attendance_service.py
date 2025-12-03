"""Attendance business logic service."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.schemas.attendance import AttendanceCreate, AttendanceUpdate

logger = logging.getLogger(__name__)


class AttendanceService:
    """Encapsulates business logic for attendance CRUD operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        try:
            self.Attendance, self.Student, self.Course = import_names(
                "models", "Attendance", "Student", "Course"
            )
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to import models: %s", exc, exc_info=True)
            raise internal_server_error(request=self.request)

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    def create_attendance(self, attendance: AttendanceCreate):
        """Create a new attendance record."""
        # Validate student exists
        get_by_id_or_404(
            self.db,
            self.Student,
            attendance.student_id,
            request=self.request,
        )

        # Validate course exists
        get_by_id_or_404(
            self.db,
            self.Course,
            attendance.course_id,
            request=self.request,
        )

        # Upsert: if a record for same student, course, date, and period exists, update it
        existing = (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == attendance.student_id,
                self.Attendance.course_id == attendance.course_id,
                self.Attendance.date == attendance.date,
                self.Attendance.period_number == attendance.period_number,
                self.Attendance.deleted_at.is_(None),
            )
            .first()
        )

        with transaction(self.db):
            if existing:
                existing.status = attendance.status
                existing.period_number = attendance.period_number
                existing.notes = attendance.notes
                self.db.flush()
                self.db.refresh(existing)
                db_attendance = existing
            else:
                db_attendance = self.Attendance(**attendance.model_dump())
                self.db.add(db_attendance)
                self.db.flush()
                self.db.refresh(db_attendance)

        # Metrics
        try:
            from backend.middleware.prometheus_metrics import track_attendance
            track_attendance(str(attendance.status).lower())
        except Exception:
            pass

        logger.info(
            "Created attendance: %s for student %s, course %s, date %s",
            db_attendance.id,
            attendance.student_id,
            attendance.course_id,
            attendance.date,
        )
        return db_attendance

    def list_attendance(
        self,
        skip: int,
        limit: int,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
    ):
        """List attendance records with optional filters."""
        query = self.db.query(self.Attendance).filter(self.Attendance.deleted_at.is_(None))

        if student_id is not None:
            query = query.filter(self.Attendance.student_id == student_id)
        if course_id is not None:
            query = query.filter(self.Attendance.course_id == course_id)
        if start_date:
            query = query.filter(self.Attendance.date >= start_date)
        if end_date:
            query = query.filter(self.Attendance.date <= end_date)
        if status:
            query = query.filter(self.Attendance.status == status)

        query = query.order_by(self.Attendance.date.desc())
        return paginate(query, skip, limit)

    def get_attendance(self, attendance_id: int):
        """Get a single attendance record by ID."""
        return get_by_id_or_404(
            self.db,
            self.Attendance,
            attendance_id,
            request=self.request,
        )

    def update_attendance(self, attendance_id: int, attendance_update: AttendanceUpdate):
        """Update an existing attendance record."""
        db_attendance = self.get_attendance(attendance_id)

        update_dict = attendance_update.model_dump(exclude_unset=True)

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

        # Check for duplicate if key fields changed
        new_student_id = update_dict.get("student_id", db_attendance.student_id)
        new_course_id = update_dict.get("course_id", db_attendance.course_id)
        new_date = update_dict.get("date", db_attendance.date)
        new_period_number = update_dict.get("period_number", db_attendance.period_number)

        if (
            new_student_id != db_attendance.student_id
            or new_course_id != db_attendance.course_id
            or new_date != db_attendance.date
            or new_period_number != db_attendance.period_number
        ):
            self._assert_unique_attendance(
                new_student_id, new_course_id, new_date, new_period_number, exclude_id=attendance_id
            )

        with transaction(self.db):
            for field, value in update_dict.items():
                setattr(db_attendance, field, value)
            self.db.flush()
            self.db.refresh(db_attendance)

        logger.info("Updated attendance: %s", db_attendance.id)
        return db_attendance

    def delete_attendance(self, attendance_id: int):
        """Soft delete an attendance record."""
        db_attendance = self.get_attendance(attendance_id)

        with transaction(self.db):
            from datetime import timezone
            db_attendance.deleted_at = datetime.now(timezone.utc)
            self.db.flush()

        logger.info("Deleted attendance: %s", db_attendance.id)
        return db_attendance

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------
    def _assert_unique_attendance(
        self,
        student_id: int,
        course_id: int,
        attendance_date: date,
        period_number: Optional[int] = None,
        exclude_id: Optional[int] = None,
    ):
        """Check if attendance record is unique for student, course, date, and period (if provided)."""
        query = self.db.query(self.Attendance).filter(
            self.Attendance.student_id == student_id,
            self.Attendance.course_id == course_id,
            self.Attendance.date == attendance_date,
            self.Attendance.deleted_at.is_(None),
        )
        if period_number is not None:
            query = query.filter(self.Attendance.period_number == period_number)

        if exclude_id is not None:
            query = query.filter(self.Attendance.id != exclude_id)

        existing = query.first()
        if existing:
            raise http_error(
                409,
                ErrorCode.ATTENDANCE_CONFLICT,
                f"Attendance record already exists for student {student_id}, course {course_id} on {attendance_date}",
                request=self.request,
            )
