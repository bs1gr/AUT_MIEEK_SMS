"""
Lesson log routes: the material covered (διδακτέα ύλη) and the teacher's notes for each teaching period.

One row per course, date and period. The Attendance page saves it with a single idempotent PUT
(autosave), and the same list endpoint feeds the per-course log where entries are reviewed and edited.

Access follows attendance editing (``attendance:edit``: admin, staff and teacher). Read-only roles
(guest, viewer) hold ``attendance:view`` but must not see a teacher's private notes, so reads need
the edit permission too.
"""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.schemas.lesson_log import LessonLogResponse, LessonLogUpsert
from backend.services.lesson_log_service import LessonLogService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lesson-logs", tags=["Lesson logs"], responses={404: {"description": "Not found"}})


@router.get("/", response_model=PaginatedResponse[LessonLogResponse])
@limiter.limit(RATE_LIMIT_READ)
@require_permission("attendance:edit")
async def list_lesson_logs(
    request: Request,
    pagination: PaginationParams = Depends(),
    course_id: Optional[int] = None,
    on_date: Optional[date] = Query(None, alias="date", description="Exact date (YYYY-MM-DD)"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    period_number: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    """
    List lesson logs, newest date first, then by teaching period.

    - **course_id**: only this course
    - **date**: exactly this date (the Attendance page looks up one period this way)
    - **start_date** / **end_date**: inclusive range
    - **period_number**: only this teaching period
    """
    if start_date and end_date and start_date > end_date:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            "start_date must be before end_date",
        )
    try:
        service = LessonLogService(db, request)
        return service.list_logs(
            skip=pagination.skip,
            limit=pagination.limit,
            course_id=course_id,
            on_date=on_date,
            start_date=start_date,
            end_date=end_date,
            period_number=period_number,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing lesson logs")
        raise internal_server_error(request=request)


@router.put("/", response_model=LessonLogResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("attendance:edit")
async def upsert_lesson_log(
    request: Request,
    payload: LessonLogUpsert,
    db: Session = Depends(get_db),
):
    """
    Save the lesson log of one teaching period (creates it, or updates the fields that were sent).

    Idempotent, so the Attendance page can call it for every autosave. A text field left out of the
    body keeps its stored value; an empty string clears it.
    """
    try:
        service = LessonLogService(db, request)
        saved = service.upsert(payload)
        logger.info("Saved lesson log", extra={"record_id": saved.id})
        return saved
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error saving lesson log")
        raise internal_server_error(request=request)
