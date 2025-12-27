"""
Pydantic schemas for highlights endpoints (student highlights/ratings by semester).
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class HighlightBase(BaseModel):
    """Base schema for highlight attributes"""

    semester: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Semester identifier (e.g., 'Fall 2024')",
    )
    rating: Optional[int] = Field(None, ge=0, le=10, description="Student rating (0-10)")
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Highlight category (e.g., 'Academic', 'Behavior', 'Extracurricular')",
    )
    highlight_text: str = Field(..., min_length=1, description="Highlight description text")
    is_positive: bool = Field(default=True, description="Whether this is a positive highlight")


class HighlightCreate(HighlightBase):
    """Schema for creating a new highlight"""

    student_id: int = Field(..., gt=0, description="Student ID to associate highlight with")


class HighlightUpdate(BaseModel):
    """Schema for updating a highlight (all fields optional)"""

    semester: Optional[str] = Field(None, min_length=1, max_length=50)
    rating: Optional[int] = Field(None, ge=0, le=10)
    category: Optional[str] = Field(None, max_length=100)
    highlight_text: Optional[str] = Field(None, min_length=1)
    is_positive: Optional[bool] = None


class HighlightResponse(HighlightBase):
    """Schema for highlight response (includes DB-generated fields)"""

    id: int
    student_id: int
    date_created: date

    model_config = ConfigDict(from_attributes=True)


class HighlightListResponse(BaseModel):
    """Schema for paginated list of highlights"""

    highlights: list[HighlightResponse]
    total: int
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)
