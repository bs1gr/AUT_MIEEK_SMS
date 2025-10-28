from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date


class EnrollmentCreate(BaseModel):
    student_ids: List[int]
    enrolled_at: Optional[date] = None


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: date

    model_config = ConfigDict(from_attributes=True)


class StudentBrief(BaseModel):
    id: int
    first_name: str
    last_name: str
    student_id: str

    model_config = ConfigDict(from_attributes=True)
