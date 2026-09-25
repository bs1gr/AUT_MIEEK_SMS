from datetime import date
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class EnrollmentCreate(BaseModel):
    student_ids: List[int]
    enrolled_at: Optional[date] = None


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: date
    status: str
    extended_absence_approved: bool = False
    extended_absence_approved_at: Optional[date] = None
    extended_absence_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EnrollmentStatusUpdate(BaseModel):
    status: Literal["active", "completed", "dropped"]


class ExtendedAbsenceApprovalUpdate(BaseModel):
    """Directorate approval for the course's extended absence limit (ΜΙΕΕΚ, up to 15%)."""

    approved: bool
    approved_at: Optional[date] = None  # defaults to today when approving
    note: Optional[str] = Field(None, max_length=1000)


class StudentBrief(BaseModel):
    id: int
    first_name: str
    last_name: str
    student_id: str

    model_config = ConfigDict(from_attributes=True)
