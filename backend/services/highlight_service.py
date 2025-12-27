"""Highlight business logic service."""

import logging
from typing import Optional, cast

from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404
from backend.import_resolver import import_names
from backend.schemas.highlights import (
    HighlightCreate,
    HighlightResponse,
    HighlightUpdate,
)

logger = logging.getLogger(__name__)


class HighlightService:
    """Service for managing student highlights."""

    @staticmethod
    def create(db: Session, payload: HighlightCreate):
        Highlight, Student = import_names("models", "Highlight", "Student")
        _student = get_by_id_or_404(db, Student, payload.student_id)

        db_highlight = Highlight(
            student_id=payload.student_id,
            semester=payload.semester,
            rating=payload.rating,
            category=payload.category,
            highlight_text=payload.highlight_text,
            is_positive=payload.is_positive,
        )
        db.add(db_highlight)
        db.flush()
        db.refresh(db_highlight)

        from backend.logging_config import safe_log_context

        logger.info(
            "Created highlight",
            extra=safe_log_context(highlight_id=db_highlight.id, student_id=payload.student_id),
        )
        return db_highlight

    @staticmethod
    def list(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        student_id: Optional[int] = None,
        semester: Optional[str] = None,
        category: Optional[str] = None,
        is_positive: Optional[bool] = None,
    ) -> dict:
        (Highlight,) = import_names("models", "Highlight")

        query = db.query(Highlight).filter(Highlight.deleted_at.is_(None))
        if student_id is not None:
            query = query.filter(Highlight.student_id == student_id)
        if semester is not None:
            query = query.filter(Highlight.semester == semester)
        if category is not None:
            query = query.filter(Highlight.category == category)
        if is_positive is not None:
            query = query.filter(Highlight.is_positive == is_positive)

        total = query.count()
        highlights = query.order_by(Highlight.date_created.desc()).offset(skip).limit(limit).all()

        return {
            "highlights": cast(list[HighlightResponse], highlights),
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    @staticmethod
    def get(db: Session, highlight_id: int):
        (Highlight,) = import_names("models", "Highlight")
        return get_by_id_or_404(db, Highlight, highlight_id)

    @staticmethod
    def list_for_student(db: Session, student_id: int, semester: Optional[str] = None):
        Highlight, Student = import_names("models", "Highlight", "Student")
        # Verify student exists
        get_by_id_or_404(db, Student, student_id)

        query = db.query(Highlight).filter(Highlight.student_id == student_id, Highlight.deleted_at.is_(None))
        if semester:
            query = query.filter(Highlight.semester == semester)
        return query.order_by(Highlight.date_created.desc()).all()

    @staticmethod
    def update(db: Session, highlight_id: int, patch: HighlightUpdate):
        (Highlight,) = import_names("models", "Highlight")
        db_highlight = get_by_id_or_404(db, Highlight, highlight_id)

        update_data = patch.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_highlight, field, value)
        db.flush()
        db.refresh(db_highlight)
        return db_highlight

    @staticmethod
    def delete(db: Session, highlight_id: int):
        (Highlight,) = import_names("models", "Highlight")
        db_highlight = get_by_id_or_404(db, Highlight, highlight_id)
        db_highlight.mark_deleted()
        db.flush()
        return None
