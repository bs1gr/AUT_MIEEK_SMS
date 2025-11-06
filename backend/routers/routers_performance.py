"""Daily performance routes provide CRUD-style endpoints."""

from datetime import date, datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db_utils import transaction, get_by_id_or_404
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
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


@router.post("/", response_model=DailyPerformanceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def create_daily_performance(
    request: Request,
    performance: DailyPerformanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        DailyPerformance, Student, Course = import_names("models", "DailyPerformance", "Student", "Course")

        student = get_by_id_or_404(db, Student, performance.student_id)
        course = get_by_id_or_404(db, Course, performance.course_id)

        with transaction(db):
            db_performance = DailyPerformance(**performance.model_dump())
            db.add(db_performance)
            db.flush()
            db.refresh(db_performance)
        return db_performance
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error creating daily performance: %s", exc, exc_info=True)
        raise internal_server_error(request=request) from exc


@router.get("/student/{student_id}", response_model=List[DailyPerformanceResponse])
def get_student_daily_performance(student_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        (DailyPerformance,) = import_names("models", "DailyPerformance")

        return (
            db.query(DailyPerformance)
            .filter(DailyPerformance.student_id == student_id, DailyPerformance.deleted_at.is_(None))
            .all()
        )
    except Exception as exc:
        logger.error("Error fetching daily performance for student %s: %s", student_id, exc, exc_info=True)
        raise internal_server_error(request=request) from exc


@router.get("/student/{student_id}/course/{course_id}", response_model=List[DailyPerformanceResponse])
def get_student_course_daily_performance(
    student_id: int,
    course_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
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
        (DailyPerformance,) = import_names("models", "DailyPerformance")

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.course_id == course_id,
                DailyPerformance.date == target_date,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
    except ValueError as exc:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            "Invalid date format. Use YYYY-MM-DD",
            request,
        ) from exc
    except Exception as exc:
        logger.error(
            "Error fetching daily performance by date for course %s: %s",
            course_id,
            exc,
            exc_info=True,
        )
        raise internal_server_error(request=request) from exc
