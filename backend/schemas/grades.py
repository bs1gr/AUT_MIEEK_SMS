from __future__ import annotations

from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional
from datetime import date


class GradeCreate(BaseModel):
    student_id: int
    course_id: int
    assignment_name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = None
    grade: float = Field(..., ge=0)
    max_grade: float = Field(default=100.0, gt=0)
    weight: float = Field(default=1.0, ge=0, le=3.0)
    date_assigned: Optional[date] = None
    date_submitted: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_grade_not_exceeds_max(self):
        """Validate that grade does not exceed max_grade"""
        if self.grade > self.max_grade:
            raise ValueError(f"Grade ({self.grade}) cannot exceed max_grade ({self.max_grade})")
        return self

    @field_validator('category')
    @classmethod
    def normalize_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        vv = v.strip()
        return vv or None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.date_assigned and self.date_submitted:
            if self.date_submitted < self.date_assigned:
                raise ValueError('date_submitted cannot be earlier than date_assigned')
        return self

class GradeUpdate(BaseModel):
    grade: Optional[float] = Field(None, ge=0)
    max_grade: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, ge=0, le=3.0)
    notes: Optional[str] = None
    date_assigned: Optional[date] = None
    date_submitted: Optional[date] = None

    @model_validator(mode='after')
    def validate_grade_not_exceeds_max(self):
        """Validate that grade does not exceed max_grade if both are provided"""
        if self.grade is not None and self.max_grade is not None:
            if self.grade > self.max_grade:
                raise ValueError(f"Grade ({self.grade}) cannot exceed max_grade ({self.max_grade})")
        return self

    @model_validator(mode='after')
    def validate_dates(self):
        if self.date_assigned and self.date_submitted:
            if self.date_submitted < self.date_assigned:
                raise ValueError('date_submitted cannot be earlier than date_assigned')
        return self


class GradeResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    assignment_name: str
    category: Optional[str]
    grade: float
    max_grade: float
    weight: float
    date_assigned: Optional[date]
    date_submitted: Optional[date]
    notes: Optional[str]

    class Config:
        from_attributes = True
