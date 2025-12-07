"""
IMPROVED: Grade Management Routes
Handles grade CRUD and grade calculation operations
"""

import logging
from datetime import date, timedelta
from typing import List, Optional, Tuple, cast

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/grades", tags=["Grades"], responses={404: {"description": "Not found"}})


from backend.db_utils import get_by_id_or_404
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import (  # Add rate limiting for write endpoints
    RATE_LIMIT_READ,
    RATE_LIMIT_WRITE,
    limiter,
)
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.schemas.grades import GradeCreate, GradeResponse, GradeUpdate
from backend.services import GradeService


class GradeAnalysis(BaseModel):
    """Schema for grade analysis"""

    student_id: int
    course_id: int
    total_grades: int
    average_grade: float
    highest_grade: float
    lowest_grade: float
    grade_distribution: dict


# ========== DEPENDENCY INJECTION ==========
from backend.config import settings
from backend.db import get_session as get_db
from backend.routers.routers_auth import optional_require_role


def _normalize_date_range(
    start_date: Optional[date], end_date: Optional[date], request: Optional[Request] = None
) -> Optional[Tuple[date, date]]:
    """Normalize and validate a date range using SEMESTER_WEEKS default.

    - If both None: no filtering (return None)
    - If only start: end = start + weeks - 1 day
    - If only end: start = end - weeks + 1 day
    - Validate start <= end
    """
    if start_date is None and end_date is None:
        return None
    weeks = int(getattr(settings, "SEMESTER_WEEKS", 14) or 14)
    if start_date is not None and end_date is None:
        end_date = start_date + timedelta(weeks=weeks) - timedelta(days=1)
    elif start_date is None and end_date is not None:
        start_date = end_date - timedelta(weeks=weeks) + timedelta(days=1)
    if start_date and end_date and start_date > end_date:
        raise http_error(400, ErrorCode.VALIDATION_FAILED, "start_date must be before end_date", request)
    return cast(Tuple[date, date], (start_date, end_date))


# ========== ENDPOINTS ==========


@router.post("/", response_model=GradeResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
def create_grade(
    request: Request,
    grade_data: GradeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Create a new grade record.

    - **student_id**: Student ID
    - **course_id**: Course ID
    - **assignment_name**: Name of assignment
    - **grade**: Score received
    - **max_grade**: Maximum possible score (default: 100)

    Note: Validation ensures grade <= max_grade
    """
    try:
        service = GradeService(db, request)
        created = service.create_grade(grade_data)
        # Metrics
        try:
            service._track_grade_submission(grade_data.course_id, getattr(created, "category", None))
        except Exception:
            pass
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grade: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/", response_model=PaginatedResponse[GradeResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_all_grades(
    request: Request,
    pagination: PaginationParams = Depends(),
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db),
):
    """
    Get all grades with optional filtering.
    """
    try:
        service = GradeService(db, request)
        rng = _normalize_date_range(start_date, end_date, request)
        s, e = (rng if rng else (None, None))
        result = service.list_grades(
            skip=pagination.skip,
            limit=pagination.limit,
            student_id=student_id,
            course_id=course_id,
            category=category,
            start_date=s,
            end_date=e,
            use_submitted=use_submitted,
        )
        logger.info(
            f"Retrieved {len(result.items)} grades (skip={pagination.skip}, limit={pagination.limit}, total={result.total})"
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all grades: {e}")
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=List[GradeResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_student_grades(
    request: Request,
    student_id: int,
    course_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db),
):
    """Get all grades for a student, optionally filtered by course"""
    try:
        service = GradeService(db, request)
        rng = _normalize_date_range(start_date, end_date, request)
        s, e = (rng if rng else (None, None))
        grades = service.list_student_grades(student_id, course_id=course_id, start_date=s, end_date=e, use_submitted=use_submitted)
        return grades
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student grades: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}", response_model=List[GradeResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_course_grades(
    request: Request,
    course_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db),
):
    """Get all grades for a course"""
    try:
        service = GradeService(db, request)
        rng = _normalize_date_range(start_date, end_date, request)
        s, e = (rng if rng else (None, None))
        grades = service.list_course_grades(course_id, start_date=s, end_date=e, use_submitted=use_submitted)
        return grades
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course grades: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/{grade_id}", response_model=GradeResponse)
@limiter.limit(RATE_LIMIT_READ)
def get_grade(request: Request, grade_id: int, db: Session = Depends(get_db)):
    """
    Get a single grade by its ID.
    """
    try:
        (Grade,) = import_names("models", "Grade")

        grade = get_by_id_or_404(db, Grade, grade_id)
        return grade
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching grade {grade_id}: {e}")
        raise internal_server_error(request=request)


@router.put("/{grade_id}", response_model=GradeResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def update_grade(
    request: Request,
    grade_id: int,
    grade_data: GradeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Update a grade record.

    Note: Validation ensures grade <= max_grade
    """
    try:
        service = GradeService(db, request)
        updated = service.update_grade(grade_id, grade_data)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating grade: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.delete("/{grade_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
def delete_grade(
    request: Request,
    grade_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Delete a grade record"""
    try:
        service = GradeService(db, request)
        service.delete_grade(grade_id)
        logger.info(f"Deleted grade: {grade_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting grade: {e!s}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/analysis/student/{student_id}/course/{course_id}")
def get_grade_analysis(request: Request, student_id: int, course_id: int, db: Session = Depends(get_db)):
    """Get grade analysis for a student in a course"""
    try:
        (Grade,) = import_names("models", "Grade")

        grades = (
            db.query(Grade)
            .filter(
                Grade.student_id == student_id,
                Grade.course_id == course_id,
                Grade.deleted_at.is_(None),
            )
            .all()
        )

        if not grades:
            return {"message": "No grades found for this student in this course"}

        # Ensure numeric types for type checkers and runtime safety
        percentages = [(float(getattr(g, "grade", 0.0)) / float(getattr(g, "max_grade", 1.0)) * 100.0) for g in grades]

        return {
            "student_id": student_id,
            "course_id": course_id,
            "total_grades": len(grades),
            "average_grade": round(float(sum(percentages)) / float(len(percentages)), 2),
            "highest_grade": round(float(max(percentages)), 2),
            "lowest_grade": round(float(min(percentages)), 2),
            "grade_distribution": {
                "A+ (97-100)": len([float(p) for p in percentages if float(p) >= 97.0]),
                "A (93-96)": len([float(p) for p in percentages if 93.0 <= float(p) < 97.0]),
                "A- (90-92)": len([float(p) for p in percentages if 90.0 <= float(p) < 93.0]),
                "B+ (87-89)": len([float(p) for p in percentages if 87.0 <= float(p) < 90.0]),
                "B (83-86)": len([float(p) for p in percentages if 83.0 <= float(p) < 87.0]),
                "B- (80-82)": len([float(p) for p in percentages if 80.0 <= float(p) < 83.0]),
                "C+ (77-79)": len([float(p) for p in percentages if 77.0 <= float(p) < 80.0]),
                "C (70-76)": len([float(p) for p in percentages if 70.0 <= float(p) < 77.0]),
                "D (60-69)": len([float(p) for p in percentages if 60.0 <= float(p) < 70.0]),
                "F (below 60)": len([float(p) for p in percentages if float(p) < 60.0]),
            },
        }

    except Exception as e:
        logger.error(f"Error analyzing grades: {e!s}", exc_info=True)
        raise internal_server_error(request=request)
