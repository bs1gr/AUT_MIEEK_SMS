"""
Daily Performance Routes
Provides CRUD-like endpoints for daily performance records.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
import logging

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


from backend.db import get_session as get_db
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
from .routers_auth import optional_require_role
from backend.import_resolver import import_names


@router.post("/", response_model=DailyPerformanceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def create_daily_performance(
    request: Request,
    performance: DailyPerformanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        DailyPerformance, = import_names('models', 'DailyPerformance')

        db_performance = DailyPerformance(**performance.model_dump())
        db.add(db_performance)
        db.commit()
        db.refresh(db_performance)
        return db_performance
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating daily performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/student/{student_id}", response_model=List[DailyPerformanceResponse])
def get_student_daily_performance(student_id: int, db: Session = Depends(get_db)):
    try:
        DailyPerformance, = import_names('models', 'DailyPerformance')

        return db.query(DailyPerformance).filter(DailyPerformance.student_id == student_id).all()
    except Exception as e:
        logger.error(f"Error fetching daily performance for student {student_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/student/{student_id}/course/{course_id}", response_model=List[DailyPerformanceResponse])
def get_student_course_daily_performance(student_id: int, course_id: int, db: Session = Depends(get_db)):
    try:
        DailyPerformance, = import_names('models', 'DailyPerformance')

        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.course_id == course_id,
            )
            .all()
        )
    except Exception as e:
        logger.error(
            f"Error fetching daily performance for student {student_id} course {course_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/date/{date_str}/course/{course_id}", response_model=List[DailyPerformanceResponse])
def get_course_daily_performance_by_date(date_str: str, course_id: int, db: Session = Depends(get_db)):
    try:
        DailyPerformance, = import_names('models', 'DailyPerformance')

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        return (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.course_id == course_id,
                DailyPerformance.date == target_date,
            )
            .all()
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(
            f"Error fetching daily performance by date for course {course_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Internal server error")
