from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class SemesterListItem(BaseModel):
    semester: str
    course_count: int
    already_archived: bool


class ArchiveEligiblePair(BaseModel):
    student_id: int
    student_name: str
    course_id: int
    course_code: str
    course_name: str
    final_grade: float
    letter_grade: str
    total_weight_used: float


class ArchiveExcludedPair(BaseModel):
    student_id: int
    student_name: str
    course_id: int
    course_code: str
    course_name: str
    reason: Literal["not_passed", "incomplete_grading", "no_evaluation_rules", "already_archived"]
    final_grade: Optional[float] = None
    total_weight_used: Optional[float] = None


class SemesterArchivePreviewRequest(BaseModel):
    semester: str = Field(..., min_length=1, max_length=50)
    pass_threshold: float = Field(default=60.0, ge=0, le=100)


class SemesterArchivePreviewResponse(BaseModel):
    semester: str
    pass_threshold: float
    eligible: List[ArchiveEligiblePair]
    excluded: List[ArchiveExcludedPair]
    eligible_count: int
    excluded_count: int


class SemesterArchiveExecuteRequest(BaseModel):
    semester: str = Field(..., min_length=1, max_length=50)
    pass_threshold: float = Field(default=60.0, ge=0, le=100)
    confirm_text: str = Field(..., min_length=1, max_length=50)


class SemesterArchiveExecuteResponse(BaseModel):
    export_id: int
    export_filename: Optional[str]
    students_affected: int
    courses_affected: int
    enrollments_archived: int
    enrollments_skipped: int


class SemesterArchiveExportListItem(BaseModel):
    id: int
    semester: str
    status: str
    export_filename: Optional[str]
    pass_threshold: float
    students_affected: int
    courses_affected: int
    enrollments_archived: int
    enrollments_skipped: int
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class StudentCoursePerformanceResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    credits: Optional[int]
    semester: str
    final_grade: float
    letter_grade: str
    gpa: Optional[float]
    passed: bool
    archived_at: datetime

    model_config = ConfigDict(from_attributes=True)
