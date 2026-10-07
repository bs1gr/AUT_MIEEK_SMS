from datetime import date
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict


class EnrollmentCreate(BaseModel):
    student_ids: List[int]
    enrolled_at: Optional[date] = None


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: date
    status: str

    model_config = ConfigDict(from_attributes=True)


class EnrollmentStatusUpdate(BaseModel):
    status: Literal["active", "completed", "dropped"]


class StudentBrief(BaseModel):
    id: int
    first_name: str
    last_name: str
    student_id: str

    model_config = ConfigDict(from_attributes=True)
