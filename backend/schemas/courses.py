from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any


class CourseCreate(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=20)
    course_name: str = Field(..., min_length=1, max_length=200)
    semester: str = Field(..., min_length=1, max_length=50)
    credits: int = Field(default=3, ge=1, le=12)
    description: Optional[str] = None
    evaluation_rules: Optional[List[Any]] = None
    absence_penalty: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)
    hours_per_week: Optional[float] = Field(default=3.0, ge=0.5, le=40.0)
    teaching_schedule: Optional[List[Dict[str, Any]]] = None
    
    @field_validator('course_code')
    @classmethod
    def validate_course_code(cls, v: str) -> str:
        """Ensure course code is uppercase and alphanumeric"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError("Course code must be alphanumeric (hyphens and underscores allowed)")
        return v.upper().strip()

    class Config:
        from_attributes = True


class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, min_length=1, max_length=20)
    course_name: Optional[str] = Field(None, min_length=1, max_length=200)
    semester: Optional[str] = Field(None, min_length=1, max_length=50)
    credits: Optional[int] = Field(None, ge=1, le=12)
    description: Optional[str] = None
    evaluation_rules: Optional[List[Any]] = None
    absence_penalty: Optional[float] = Field(None, ge=0.0, le=100.0)
    hours_per_week: Optional[float] = Field(None, ge=0.0, le=40.0)
    teaching_schedule: Optional[List[Dict[str, Any]]] = None


class CourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    semester: str
    credits: int
    description: Optional[str]
    evaluation_rules: Optional[List[Any]]
    absence_penalty: Optional[float]
    hours_per_week: Optional[float]
    teaching_schedule: Optional[List[Dict[str, Any]]]

    class Config:
        from_attributes = True
