"""Daily performance routes provide CRUD-style endpoints."""

import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Path
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db_utils import transaction
from backend.errors import internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.services.daily_performance_service import DailyPerformanceService
from backend.db_utils import get_by_id_or_404

from .routers_auth import optional_require_role

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/daily-performance",
    tags=["DailyPerformance"],
    responses={404: {"description": "Not found"}},
)


class DailyPerformanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    category: str
    score: float
    max_score: float = 10.0
    notes: Optional[str] = None


class DailyPerformanceUpdate(BaseModel):
    """Schema for updating daily performance records. All fields optional."""

    score: Optional[float] = None
    max_score: Optional[float] = None
    notes: Optional[str] = None
    category: Optional[str] = None


class DailyPerformanceResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    date: date
    category: str
    score: float
    max_score: float
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)


@router.get("/{id}", response_model=DailyPerformanceResponse)
@limiter.limit(RATE_LIMIT_READ)
def get_daily_performance_by_id(
    id: int = Path(..., description="DailyPerformance record ID"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    try:
        import_names("models", "DailyPerformance")
        record = get_by_id_or_404(db, import_names("models", "DailyPerformance")[0], id)
        return record
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching daily performance by id {id}: {exc}", exc_info=True)
        raise internal_server_error(request=request) from exc


@router.post("/", response_model=DailyPerformanceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def create_daily_performance(
    request: Request,
    performance: DailyPerformanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        # Preserve error injection points used by tests
        import_names("models", "DailyPerformance", "Student", "Course")
        with transaction(db):
            created = DailyPerformanceService.create(db, performance, request)
            db.flush()
        return created
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error creating daily performance: %s", exc, exc_info=True)
        raise internal_server_error(request=request) from exc


@router.put("/{id}", response_model=DailyPerformanceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def update_daily_performance(
    id: int = Path(..., description="DailyPerformance record ID"),
    performance: DailyPerformanceUpdate = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Update an existing daily performance record."""
    try:
        import_names("models", "DailyPerformance")
        with transaction(db):
            updated = DailyPerformanceService.update(db, id, performance, request)
            db.flush()
        return updated
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error updating daily performance id=%s: %s", id, exc, exc_info=True)
        raise internal_server_error(request=request) from exc


@router.get("/student/{student_id}", response_model=List[DailyPerformanceResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_student_daily_performance(student_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        # Preserve error injection point used by tests
        import_names("models", "DailyPerformance")
        return DailyPerformanceService.list_for_student(db, student_id)
    except Exception as exc:
        logger.error("Error fetching daily performance for student %s: %s", student_id, exc, exc_info=True)
        raise internal_server_error(request=request) from exc


@router.get("/student/{student_id}/course/{course_id}", response_model=List[DailyPerformanceResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_student_course_daily_performance(
    student_id: int,
    course_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        # Preserve error injection point used by tests
        import_names("models", "DailyPerformance")
        return DailyPerformanceService.list_for_student_course(db, student_id, course_id)
    except Exception as exc:
        logger.error(
            "Error fetching daily performance for student %s course %s: %s",
            student_id,
            course_id,
            exc,
            exc_info=True,
        )
        raise internal_server_error(request=request) from exc


@router.get("/date/{date_str}/course/{course_id}", response_model=List[DailyPerformanceResponse])
def get_course_daily_performance_by_date(
    date_str: str,
    course_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        # Preserve error injection point used by tests
        import_names("models", "DailyPerformance")
        return DailyPerformanceService.list_for_course_by_date(db, course_id, date_str, request)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error fetching daily performance by date for course %s: %s",
            course_id,
            exc,
            exc_info=True,
        )
        raise internal_server_error(request=request) from exc
