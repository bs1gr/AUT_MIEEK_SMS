"""
Highlights Router
Provides minimal CRUD endpoints for student highlights to satisfy frontend API usage.

Endpoints:
- POST /api/v1/highlights/           -> create highlight
- GET  /api/v1/highlights/student/{student_id}  -> list highlights for a student
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    # When running as package
    from backend.db import get_session as get_db
    from backend.models import Highlight, Student
except ModuleNotFoundError:  # pragma: no cover
    # When running from backend/ directly
    from db import get_session as get_db
    from models import Highlight, Student


router = APIRouter(prefix="/highlights", tags=["Highlights"])


class HighlightCreate(BaseModel):
    student_id: int
    semester: str = Field(..., min_length=1, max_length=50)
    category: Optional[str] = Field(None, max_length=100)
    rating: Optional[int] = None
    highlight_text: str = Field(..., min_length=1)
    date_created: Optional[date] = None
    is_positive: bool = True


class HighlightResponse(BaseModel):
    id: int
    student_id: int
    semester: str
    category: Optional[str]
    rating: Optional[int]
    highlight_text: str
    date_created: Optional[date]
    is_positive: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=HighlightResponse, status_code=201)
def create_highlight(payload: HighlightCreate, db: Session = Depends(get_db)):
    # Ensure student exists
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    data = payload.dict()
    hl = Highlight(**data)
    db.add(hl)
    db.commit()
    db.refresh(hl)
    return hl


@router.get("/student/{student_id}", response_model=List[HighlightResponse])
def get_highlights_for_student(student_id: int, db: Session = Depends(get_db)):
    # Validate student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return db.query(Highlight).filter(Highlight.student_id == student_id).order_by(Highlight.date_created.desc()).all()
