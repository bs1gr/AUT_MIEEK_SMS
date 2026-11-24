from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class GradeCreate(BaseModel):
    student_id: int
    course_id: int
    assignment_name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = None
    grade: float = Field(..., ge=0)
    max_grade: float = Field(default=100.0, gt=0)
    weight: float = Field(default=1.0, ge=0, le=3.0)
    date_assigned: Optional[date] = None
    # For an exam, the day it was taken (plan todo 80: the teacher picks it).
    date_submitted: Optional[date] = None
    notes: Optional[str] = None
    # Plan todo 80: a Midterm or Final Exam grade that replaces the earlier sitting. Only an exam's
    # grade can be one (GradeService refuses the mark on any other).
    is_retake: bool = False

    @model_validator(mode="after")
    def validate_grade_not_exceeds_max(self):
        """Validate that grade does not exceed max_grade"""
        if self.grade > self.max_grade:
            raise ValueError(f"Grade ({self.grade}) cannot exceed max_grade ({self.max_grade})")
        return self

    @field_validator("category")
    @classmethod
    def normalize_category(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_category(v)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_assigned and self.date_submitted:
            if self.date_submitted < self.date_assigned:
                raise ValueError("date_submitted cannot be earlier than date_assigned")
        return self


def _normalize_category(v: Optional[str]) -> Optional[str]:
    """A category as grades store it: trimmed, title-cased, an empty one as none."""
    if v is None:
        return v
    vv = v.strip().title()
    return vv or None


class GradeUpdate(BaseModel):
    # The assignment and its category can change too (plan todo 82): the Grading page's Edit sends
    # them, and until November 2026 they were dropped here, so a grade filed under the wrong
    # category could not be moved to the rule it belongs to.
    assignment_name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    grade: Optional[float] = Field(None, ge=0)
    max_grade: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, ge=0, le=3.0)
    notes: Optional[str] = None
    date_assigned: Optional[date] = None
    date_submitted: Optional[date] = None
    is_retake: Optional[bool] = None

    @field_validator("category")
    @classmethod
    def normalize_category(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_category(v)

    @model_validator(mode="after")
    def validate_retake_not_null(self):
        """An edit may set or clear the retake mark, never leave it unknown (the column has none)."""
        if "is_retake" in self.model_fields_set and self.is_retake is None:
            raise ValueError("is_retake must be true or false")
        return self

    @model_validator(mode="after")
    def validate_assignment_name_kept(self):
        """An edit may rename the assignment, never leave it without a name."""
        if "assignment_name" in self.model_fields_set and self.assignment_name is None:
            raise ValueError("assignment_name cannot be empty")
        return self

    @model_validator(mode="after")
    def validate_grade_not_exceeds_max(self):
        """Validate that grade does not exceed max_grade if both are provided"""
        if self.grade is not None and self.max_grade is not None:
            if self.grade > self.max_grade:
                raise ValueError(f"Grade ({self.grade}) cannot exceed max_grade ({self.max_grade})")
        return self

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_assigned and self.date_submitted:
            if self.date_submitted < self.date_assigned:
                raise ValueError("date_submitted cannot be earlier than date_assigned")
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
    is_retake: bool = False

    model_config = ConfigDict(from_attributes=True)
