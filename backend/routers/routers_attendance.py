"""
IMPROVED: Attendance Management Routes
Handles attendance tracking and statistics
"""

import logging
from datetime import date, timedelta
from typing import List, Optional, Tuple, cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from backend.config import settings
from backend.db import get_session as get_db
from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
    AttendanceUpdate,
)
from backend.schemas.common import PaginatedResponse, PaginationParams

from .routers_auth import optional_require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"], responses={404: {"description": "Not found"}})


def _normalize_date_range(start_date: Optional[date], end_date: Optional[date]) -> Optional[Tuple[date, date]]:
    """Normalize and validate a date range.

    - If both are None: return None (no filtering)
    - If only start_date: compute end_date = start_date + SEMESTER_WEEKS*7 - 1 day
    - If only end_date: compute start_date = end_date - SEMESTER_WEEKS*7 + 1 day
    - Validate start_date <= end_date
    """
    if start_date is None and end_date is None:
        return None
    weeks = int(getattr(settings, "SEMESTER_WEEKS", 14) or 14)
    if start_date is not None and end_date is None:
        end_date = start_date + timedelta(weeks=weeks) - timedelta(days=1)
    elif start_date is None and end_date is not None:
        start_date = end_date - timedelta(weeks=weeks) + timedelta(days=1)
    # Final validation
    if start_date and end_date and start_date > end_date:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            "start_date must be before end_date",
        )
    # Both should be non-None here
    return cast(Tuple[date, date], (start_date, end_date))


# ========== ENDPOINTS ==========


@router.post("/", response_model=AttendanceResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
def create_attendance(
    request: Request,
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Record attendance for a student.

    - **student_id**: Student ID
    - **course_id**: Course ID
    - **date**: Attendance date
    - **status**: Present, Absent, Late, or Excused
    - **period_number**: Class period number (default: 1)
    """
    try:
        from backend.import_resolver import import_names

        Attendance, Student, Course = import_names("models", "Attendance", "Student", "Course")

        # Validate student and course exist (call kept for validation)
        _student = get_by_id_or_404(db, Student, attendance_data.student_id)
        _course = get_by_id_or_404(db, Course, attendance_data.course_id)

        existing = None

        with transaction(db):
            # Use database-level locking to prevent duplicate attendance records
            existing = (
                db.query(Attendance)
                .filter(
                    Attendance.student_id == attendance_data.student_id,
                    Attendance.course_id == attendance_data.course_id,
                    Attendance.date == attendance_data.date,
                    Attendance.period_number == attendance_data.period_number,
                    Attendance.deleted_at.is_(None),
                )
                .with_for_update()
                .first()
            )

            if existing:
                existing.status = attendance_data.status
                existing.notes = attendance_data.notes
                existing.period_number = attendance_data.period_number
                existing.date = attendance_data.date
                db_attendance = existing
            else:
                db_attendance = Attendance(**attendance_data.model_dump())
                db.add(db_attendance)

            db.flush()
            db.refresh(db_attendance)

        action = "Updated" if existing else "Created"
        logger.info(f"{action} attendance record: {db_attendance.id}")
        return db_attendance

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/", response_model=PaginatedResponse[AttendanceResponse])
def get_all_attendance(
    request: Request,
    pagination: PaginationParams = Depends(),
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Retrieve attendance records with optional filtering.

    - **student_id**: Filter by student
    - **course_id**: Filter by course
    - **status**: Filter by status (Present, Absent, Late, Excused)
    """
    try:
        from backend.import_resolver import import_names

        Attendance, Student, Course = import_names("models", "Attendance", "Student", "Course")

        query = (
            db.query(Attendance)
            .options(joinedload(Attendance.student), joinedload(Attendance.course))
            .filter(Attendance.deleted_at.is_(None))
        )

        if student_id:
            query = query.filter(Attendance.student_id == student_id)
        if course_id:
            query = query.filter(Attendance.course_id == course_id)
        if status:
            query = query.filter(Attendance.status == status)
        # Date range filtering
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            query = query.filter(Attendance.date >= s, Attendance.date <= e)

        result = paginate(query, skip=pagination.skip, limit=pagination.limit)
        logger.info(
            f"Retrieved {len(result.items)} attendance records (skip={pagination.skip}, limit={pagination.limit}, total={result.total})"
        )

        return result.dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(
    request: Request,
    student_id: int,
    course_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get all attendance records for a student"""
    try:
        from backend.import_resolver import import_names

        Attendance, Student = import_names("models", "Attendance", "Student")

        # Validate student exists (call kept for validation)
        _student = get_by_id_or_404(db, Student, student_id)

        query = db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None))

        if course_id:
            query = query.filter(Attendance.course_id == course_id)
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            query = query.filter(Attendance.date.between(s, e))

        attendance_records = query.all()
        return attendance_records

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}", response_model=List[AttendanceResponse])
def get_course_attendance(
    request: Request,
    course_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get all attendance records for a course"""
    try:
        from backend.import_resolver import import_names

        Attendance, Course = import_names("models", "Attendance", "Course")

        # Validate course exists (call kept for validation)
        _course = get_by_id_or_404(db, Course, course_id)

        query = db.query(Attendance).filter(Attendance.course_id == course_id, Attendance.deleted_at.is_(None))
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            query = query.filter(Attendance.date.between(s, e))
        attendance_records = query.all()
        return attendance_records

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/date/{attendance_date}/course/{course_id}", response_model=List[AttendanceResponse])
def get_attendance_by_date_and_course(
    request: Request,
    attendance_date: date,
    course_id: int,
    db: Session = Depends(get_db),
):
    """Get all attendance records for a specific course on a given date"""
    try:
        from backend.import_resolver import import_names

        Attendance, Course = import_names("models", "Attendance", "Course")

        _course = get_by_id_or_404(db, Course, course_id)

        records = (
            db.query(Attendance)
            .filter(
                Attendance.course_id == course_id,
                Attendance.date == attendance_date,
                Attendance.deleted_at.is_(None),
            )
            .all()
        )
        return records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attendance by date/course: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(request: Request, attendance_id: int, db: Session = Depends(get_db)):
    """Get a specific attendance record"""
    try:
        from backend.import_resolver import import_names

        (Attendance,) = import_names("models", "Attendance")

        attendance = get_by_id_or_404(db, Attendance, attendance_id)
        return attendance

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.put("/{attendance_id}", response_model=AttendanceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def update_attendance(
    request: Request,
    attendance_id: int,
    attendance_data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Update an attendance record"""
    try:
        from backend.import_resolver import import_names

        (Attendance,) = import_names("models", "Attendance")

        db_attendance = get_by_id_or_404(db, Attendance, attendance_id)

        with transaction(db):
            update_data = attendance_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_attendance, key, value)
            db.flush()
            db.refresh(db_attendance)

        logger.info(f"Updated attendance: {attendance_id}")
        return db_attendance

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.delete("/{attendance_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
def delete_attendance(
    request: Request,
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Soft delete an attendance record"""
    try:
        from backend.import_resolver import import_names

        (Attendance,) = import_names("models", "Attendance")

        db_attendance = get_by_id_or_404(db, Attendance, attendance_id)

        with transaction(db):
            db_attendance.mark_deleted()

        logger.info(f"Deleted attendance: {attendance_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting attendance: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/stats/student/{student_id}/course/{course_id}")
def get_attendance_stats(request: Request, student_id: int, course_id: int, db: Session = Depends(get_db)):
    """Get attendance statistics for a student in a course"""
    try:
        from backend.import_resolver import import_names

        (Attendance,) = import_names("models", "Attendance")

        attendance_records = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == student_id,
                Attendance.course_id == course_id,
                Attendance.deleted_at.is_(None),
            )
            .all()
        )

        if not attendance_records:
            return {"message": "No attendance records found"}

        present = len([a for a in attendance_records if str(a.status) == "Present"])
        absent = len([a for a in attendance_records if str(a.status) == "Absent"])
        late = len([a for a in attendance_records if str(a.status) == "Late"])
        excused = len([a for a in attendance_records if str(a.status) == "Excused"])
        total = len(attendance_records)

        return {
            "student_id": student_id,
            "course_id": course_id,
            "total_classes": total,
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "excused_count": excused,
            "attendance_rate": round((present / total * 100) if total > 0 else 0, 2),
        }

    except Exception as e:
        logger.error(f"Error calculating attendance stats: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.post("/bulk/create")
@limiter.limit(RATE_LIMIT_WRITE)
def bulk_create_attendance(
    request: Request,
    attendance_list: List[AttendanceCreate],
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Create multiple attendance records at once.
    Useful for recording attendance for an entire class.
    """
    try:
        from backend.import_resolver import import_names

        Attendance, Student, Course = import_names("models", "Attendance", "Student", "Course")

        created = []
        errors = []

        with transaction(db):
            for idx, attendance_data in enumerate(attendance_list):
                try:
                    _student = get_by_id_or_404(db, Student, attendance_data.student_id)
                    _course = get_by_id_or_404(db, Course, attendance_data.course_id)

                    existing = (
                        db.query(Attendance)
                        .filter(
                            Attendance.student_id == attendance_data.student_id,
                            Attendance.course_id == attendance_data.course_id,
                            Attendance.date == attendance_data.date,
                            Attendance.period_number == attendance_data.period_number,
                            Attendance.deleted_at.is_(None),
                        )
                        .first()
                    )
                    if existing:
                        raise ValueError("Attendance record already exists for this student, course, date, and period")

                    db_attendance = Attendance(**attendance_data.model_dump())
                    db.add(db_attendance)
                    created.append(idx)

                except HTTPException as e:
                    errors.append({"index": idx, "error": e.detail})
                except Exception as e:
                    errors.append({"index": idx, "error": str(e)})

            db.flush()

        logger.info(f"Bulk created {len(created)} attendance records, {len(errors)} errors")

        return {"created": len(created), "failed": len(errors), "errors": errors}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk create: {e!s}", exc_info=True)
        raise internal_server_error(request=request)
