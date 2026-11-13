from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

# One sheet is one course on one day: students x periods, plus the day's performance scores.
MAX_SHEET_ITEMS = 5000


class AttendanceSheetEntry(BaseModel):
    student_id: int
    period_number: int = Field(default=1, ge=1)
    status: str = Field(..., pattern="^(Present|Absent|Late|Excused)$")


class AttendanceSheetPerformance(BaseModel):
    student_id: int
    category: str = Field(..., min_length=1, max_length=100)
    score: float
    max_score: float = 10.0


class AttendanceSheetPerformanceDelete(BaseModel):
    student_id: int
    category: str = Field(..., min_length=1, max_length=100)


class AttendanceSheetSave(BaseModel):
    """Everything the Attendance page saves for one course and date, in one request."""

    course_id: int
    date: date
    attendance: List[AttendanceSheetEntry] = Field(default_factory=list, max_length=MAX_SHEET_ITEMS)
    daily_performance: List[AttendanceSheetPerformance] = Field(default_factory=list, max_length=MAX_SHEET_ITEMS)
    daily_performance_deletes: List[AttendanceSheetPerformanceDelete] = Field(
        default_factory=list, max_length=MAX_SHEET_ITEMS
    )


class AttendanceSheetResult(BaseModel):
    attendance_created: int = 0
    attendance_updated: int = 0
    attendance_unchanged: int = 0
    performance_created: int = 0
    performance_updated: int = 0
    performance_unchanged: int = 0
    performance_deleted: int = 0
    # Students in the request that no longer exist; their rows were left out, the rest was saved.
    skipped_student_ids: List[int] = Field(default_factory=list)


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

    model_config = ConfigDict(from_attributes=True)


class AttendanceStats(BaseModel):
    student_id: int
    course_id: int
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_rate: float
