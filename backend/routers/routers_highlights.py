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
from backend.schemas.highlights import (
    HighlightCreate,
    HighlightListResponse,
    HighlightResponse,
    HighlightUpdate,
)
from backend.services.highlight_service import HighlightService

from .routers_auth import optional_require_role

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/highlights",
    tags=["Highlights"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=HighlightResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
def create_highlight(
    request: Request,
    highlight: HighlightCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
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
        logger.error(
            "Unexpected error creating highlight for student %s: %s",
            highlight.student_id,
            exc,
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.get("/", response_model=HighlightListResponse)
@limiter.limit(RATE_LIMIT_READ)
def list_highlights(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    semester: Optional[str] = Query(None, description="Filter by semester"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_positive: Optional[bool] = Query(
        None, description="Filter by positive/negative"
    ),
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
    logger.info(
        "Retrieved %s highlights (total=%s, skip=%s, limit=%s)",
        len(result.get("highlights", [])),
        result.get("total", 0),
        result.get("skip", 0),
        result.get("limit", 0),
    )
    return result


@router.get("/{highlight_id}", response_model=HighlightResponse)
@limiter.limit(RATE_LIMIT_READ)
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

        logger.info("Retrieved highlight %s", highlight_id)
        return db_highlight
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error retrieving highlight %s: %s", highlight_id, exc, exc_info=True
        )
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=list[HighlightResponse])
@limiter.limit(RATE_LIMIT_READ)
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
        logger.info(
            "Retrieved %s highlights for student %s", len(highlights), student_id
        )
        return highlights
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error retrieving highlights for student %s: %s",
            student_id,
            exc,
            exc_info=True,
        )
        raise internal_server_error(request=request)


@router.put("/{highlight_id}", response_model=HighlightResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def update_highlight(
    request: Request,
    highlight_id: int,
    highlight_update: HighlightUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
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
        logger.info("Updated highlight %s", highlight_id)
        return updated
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error updating highlight %s: %s", highlight_id, exc, exc_info=True
        )
        raise internal_server_error(request=request)


@router.delete("/{highlight_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
def delete_highlight(
    request: Request,
    highlight_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
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
        logger.info("Deleted highlight %s", highlight_id)
        return None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error deleting highlight %s: %s", highlight_id, exc, exc_info=True
        )
        raise internal_server_error(request=request)
