"""Highlights Router providing CRUD operations for student highlights."""

# ruff: noqa: F401,F823,F841

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, cast
import logging

from backend.db import get_session as get_db
from backend.db_utils import transaction, get_by_id_or_404
from backend.import_resolver import import_names

Highlight, Student = import_names("models", "Highlight", "Student")
from backend.schemas.highlights import HighlightCreate, HighlightUpdate, HighlightResponse, HighlightListResponse
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
from .routers_auth import optional_require_role
from backend.errors import internal_server_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/highlights", tags=["Highlights"], responses={404: {"description": "Not found"}})


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
        _student = get_by_id_or_404(db, Student, highlight.student_id)

        with transaction(db):
            db_highlight = Highlight(
                student_id=highlight.student_id,
                semester=highlight.semester,
                rating=highlight.rating,
                category=highlight.category,
                highlight_text=highlight.highlight_text,
                is_positive=highlight.is_positive,
            )

            db.add(db_highlight)
            db.flush()
            db.refresh(db_highlight)

        logger.info("Created highlight %s for student %s", db_highlight.id, highlight.student_id)
        return db_highlight

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
def list_highlights(
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
    query = db.query(Highlight).filter(Highlight.deleted_at.is_(None))

    # Apply filters
    if student_id is not None:
        query = query.filter(Highlight.student_id == student_id)
    if semester is not None:
        query = query.filter(Highlight.semester == semester)
    if category is not None:
        query = query.filter(Highlight.category == category)
    if is_positive is not None:
        query = query.filter(Highlight.is_positive == is_positive)

    # Get total count before pagination
    total = query.count()

    # Apply pagination and ordering
    highlights = query.order_by(Highlight.date_created.desc()).offset(skip).limit(limit).all()

    logger.info(f"Retrieved {len(highlights)} highlights (total={total}, skip={skip}, limit={limit})")
    return HighlightListResponse(
        highlights=cast(list[HighlightResponse], highlights), total=total, skip=skip, limit=limit
    )


@router.get("/{highlight_id}", response_model=HighlightResponse)
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
        db_highlight = get_by_id_or_404(db, Highlight, highlight_id)

        logger.info("Retrieved highlight %s", highlight_id)
        return db_highlight
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error retrieving highlight %s: %s", highlight_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=list[HighlightResponse])
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
        _student = get_by_id_or_404(db, Student, student_id)

        query = db.query(Highlight).filter(Highlight.student_id == student_id, Highlight.deleted_at.is_(None))
        if semester:
            query = query.filter(Highlight.semester == semester)

        highlights = query.order_by(Highlight.date_created.desc()).all()

        logger.info("Retrieved %s highlights for student %s", len(highlights), student_id)
        return highlights
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error retrieving highlights for student %s: %s", student_id, exc, exc_info=True)
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
        db_highlight = get_by_id_or_404(db, Highlight, highlight_id)

        with transaction(db):
            update_data = highlight_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_highlight, field, value)
            db.flush()
            db.refresh(db_highlight)

        logger.info("Updated highlight %s", highlight_id)
        return db_highlight
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error updating highlight %s: %s", highlight_id, exc, exc_info=True)
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
        db_highlight = get_by_id_or_404(db, Highlight, highlight_id)

        with transaction(db):
            db_highlight.mark_deleted()
            db.flush()

        logger.info("Deleted highlight %s", highlight_id)
        return None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error deleting highlight %s: %s", highlight_id, exc, exc_info=True)
        raise internal_server_error(request=request)
