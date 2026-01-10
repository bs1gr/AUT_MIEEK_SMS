"""Highlights Router providing CRUD operations for student highlights."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db_utils import transaction
from backend.errors import internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.schemas.highlights import (
    HighlightCreate,
    HighlightListResponse,
    HighlightResponse,
    HighlightUpdate,
)
from backend.services.highlight_service import HighlightService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/highlights",
    tags=["Highlights"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=HighlightResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("students:edit")
def create_highlight(
    request: Request,
    highlight: HighlightCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new highlight for a student.

    Args:
        highlight: Highlight data (student_id, semester, rating, category, text, is_positive)
        db: Database session

    Returns:
        Created highlight

    Raises:
        404: Student not found
    """
    try:
        # preserve error injection point if tests patch import_names
        import_names("models", "Highlight", "Student")
        with transaction(db):
            created = HighlightService.create(db, highlight)
            db.flush()
        return created

    except HTTPException:
        raise
    except Exception as exc:
        from backend.logging_config import safe_log_context

        logger.error(
            "Unexpected error creating highlight",
            extra=safe_log_context(student_id=highlight.student_id, error=str(exc)),
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.get("/", response_model=HighlightListResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("students:view")
def list_highlights(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    semester: Optional[str] = Query(None, description="Filter by semester"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_positive: Optional[bool] = Query(None, description="Filter by positive/negative"),
    db: Session = Depends(get_db),
):
    """
    List highlights with optional filters.

    Args:
        skip: Pagination offset
        limit: Max results to return
        student_id: Optional filter by student
        semester: Optional filter by semester
        category: Optional filter by category
        is_positive: Optional filter by positive/negative highlights
        db: Database session

    Returns:
        Paginated list of highlights
    """
    # preserve error injection
    import_names("models", "Highlight")
    result = HighlightService.list(
        db,
        skip=skip,
        limit=limit,
        student_id=student_id,
        semester=semester,
        category=category,
        is_positive=is_positive,
    )
    from backend.logging_config import safe_log_context

    logger.info(
        "Retrieved highlights",
        extra=safe_log_context(
            count=len(result.get("highlights", [])),
            total=result.get("total", 0),
            skip=result.get("skip", 0),
            limit=result.get("limit", 0),
            student_id=student_id,
            semester=semester,
            category=category,
            is_positive=is_positive,
        ),
    )
    return result


@router.get("/{highlight_id}", response_model=HighlightResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("students:view")
def get_highlight(request: Request, highlight_id: int, db: Session = Depends(get_db)):
    """
    Get a single highlight by ID.

    Args:
        highlight_id: Highlight ID
        db: Database session

    Returns:
        Highlight details

    Raises:
        404: Highlight not found
    """
    try:
        import_names("models", "Highlight")
        db_highlight = HighlightService.get(db, highlight_id)

        from backend.logging_config import safe_log_context

        logger.info("Retrieved highlight", extra=safe_log_context(highlight_id=highlight_id))
        return db_highlight
    except HTTPException:
        raise
    except Exception as exc:
        from backend.logging_config import safe_log_context

        logger.error(
            "Error retrieving highlight",
            extra=safe_log_context(highlight_id=highlight_id, error=str(exc)),
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=list[HighlightResponse])
@limiter.limit(RATE_LIMIT_READ)
@require_permission("students:view", allow_self_access=True)
def get_student_highlights(
    request: Request,
    student_id: int,
    semester: Optional[str] = Query(None, description="Optional filter by semester"),
    db: Session = Depends(get_db),
):
    """
    Get all highlights for a specific student.

    Args:
        student_id: Student ID
        semester: Optional filter by semester
        db: Database session

    Returns:
        List of highlights for the student

    Raises:
        404: Student not found
    """
    try:
        import_names("models", "Highlight", "Student")
        highlights = HighlightService.list_for_student(db, student_id, semester)
        from backend.logging_config import safe_log_context

        logger.info(
            "Retrieved highlights for student",
            extra=safe_log_context(count=len(highlights), student_id=student_id, semester=semester),
        )
        return highlights
    except HTTPException:
        raise
    except Exception as exc:
        from backend.logging_config import safe_log_context

        logger.error(
            "Error retrieving highlights for student",
            extra=safe_log_context(student_id=student_id, error=str(exc)),
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.put("/{highlight_id}", response_model=HighlightResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("students:edit")
def update_highlight(
    request: Request,
    highlight_id: int,
    highlight_update: HighlightUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a highlight.

    Args:
        highlight_id: Highlight ID to update
        highlight_update: Fields to update (all optional)
        db: Database session

    Returns:
        Updated highlight

    Raises:
        404: Highlight not found
    """
    try:
        import_names("models", "Highlight")
        with transaction(db):
            updated = HighlightService.update(db, highlight_id, highlight_update)
            db.flush()
        from backend.logging_config import safe_log_context

        logger.info("Updated highlight", extra=safe_log_context(highlight_id=highlight_id))
        return updated
    except HTTPException:
        raise
    except Exception as exc:
        from backend.logging_config import safe_log_context

        logger.error(
            "Error updating highlight",
            extra=safe_log_context(highlight_id=highlight_id, error=str(exc)),
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.delete("/{highlight_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("students:delete")
def delete_highlight(
    request: Request,
    highlight_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a highlight.

    Args:
        highlight_id: Highlight ID to delete
        db: Database session

    Raises:
        404: Highlight not found
    """
    try:
        import_names("models", "Highlight")
        with transaction(db):
            HighlightService.delete(db, highlight_id)
            db.flush()
        from backend.logging_config import safe_log_context

        logger.info("Deleted highlight", extra=safe_log_context(highlight_id=highlight_id))
        return None
    except HTTPException:
        raise
    except Exception as exc:
        from backend.logging_config import safe_log_context

        logger.error(
            "Error deleting highlight",
            extra=safe_log_context(highlight_id=highlight_id, error=str(exc)),
            exc_info=True,
        )
        raise internal_server_error(request=request)
