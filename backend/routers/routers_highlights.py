"""
Highlights Router
CRUD operations for student highlights/semester ratings.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, cast
import logging

from backend.db import get_session as get_db
from backend.models import Highlight, Student
from backend.schemas.highlights import HighlightCreate, HighlightUpdate, HighlightResponse, HighlightListResponse
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
from .routers_auth import optional_require_role

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
    # Verify student exists
    student = db.query(Student).filter(Student.id == highlight.student_id).first()
    if not student:
        logger.warning(f"Student not found: {highlight.student_id}")
        raise HTTPException(status_code=404, detail=f"Student with id {highlight.student_id} not found")

    # Create highlight
    db_highlight = Highlight(
        student_id=highlight.student_id,
        semester=highlight.semester,
        rating=highlight.rating,
        category=highlight.category,
        highlight_text=highlight.highlight_text,
        is_positive=highlight.is_positive,
    )

    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)

    logger.info(f"Created highlight: {db_highlight.id} for student {highlight.student_id}")
    return db_highlight


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
    query = db.query(Highlight)

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
def get_highlight(highlight_id: int, db: Session = Depends(get_db)):
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
    db_highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not db_highlight:
        logger.warning(f"Highlight not found: {highlight_id}")
        raise HTTPException(status_code=404, detail=f"Highlight with id {highlight_id} not found")

    logger.info(f"Retrieved highlight: {highlight_id}")
    return db_highlight


@router.get("/student/{student_id}", response_model=list[HighlightResponse])
def get_student_highlights(
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
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        logger.warning(f"Student not found: {student_id}")
        raise HTTPException(status_code=404, detail=f"Student with id {student_id} not found")

    # Query highlights
    query = db.query(Highlight).filter(Highlight.student_id == student_id)
    if semester:
        query = query.filter(Highlight.semester == semester)

    highlights = query.order_by(Highlight.date_created.desc()).all()

    logger.info(f"Retrieved {len(highlights)} highlights for student {student_id}")
    return highlights


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
    db_highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not db_highlight:
        logger.warning(f"Highlight not found: {highlight_id}")
        raise HTTPException(status_code=404, detail=f"Highlight with id {highlight_id} not found")

    # Update only provided fields
    update_data = highlight_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_highlight, field, value)

    db.commit()
    db.refresh(db_highlight)

    logger.info(f"Updated highlight: {highlight_id}")
    return db_highlight


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
    db_highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not db_highlight:
        logger.warning(f"Highlight not found: {highlight_id}")
        raise HTTPException(status_code=404, detail=f"Highlight with id {highlight_id} not found")

    db.delete(db_highlight)
    db.commit()

    logger.info(f"Deleted highlight: {highlight_id}")
    return None
