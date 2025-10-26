from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class AttendanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    status: str = Field(..., pattern="^(Present|Absent|Late|Excused)$")
    period_number: int = Field(default=1, ge=1)
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Present|Absent|Late|Excused)$")
    period_number: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    date: date
    status: str
    period_number: int
    notes: Optional[str]

    class Config:
        from_attributes = True


class AttendanceStats(BaseModel):
    student_id: int
    course_id: int
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_rate: float
