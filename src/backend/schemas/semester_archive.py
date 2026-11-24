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


FailReason = Literal["not_passed", "failed_absence_limit", "failed_final_retake"]


class ArchiveFailedPair(BaseModel):
    """A failed course (plan todo 87): recorded as failed and its records cleared by the run."""

    student_id: int
    student_name: str
    course_id: int
    course_code: str
    course_name: str
    reason: FailReason
    final_grade: float
    letter_grade: str
    total_weight_used: float


class ArchiveExcludedPair(BaseModel):
    student_id: int
    student_name: str
    course_id: int
    course_code: str
    course_name: str
    # Every reason SemesterArchiveService._evaluate_pair gives: a reason missing here makes the
    # preview answer 500 (todo 85's two reasons were, in v1.18.81). Since todo 87 the failed ones
    # go to `failed`.
    reason: Literal[
        "not_passed",
        "incomplete_grading",
        "no_evaluation_rules",
        "already_archived",
        "failed_absence_limit",
        "failed_final_retake",
    ]
    final_grade: Optional[float] = None
    total_weight_used: Optional[float] = None


class SemesterArchivePreviewRequest(BaseModel):
    semester: str = Field(..., min_length=1, max_length=50)
    pass_threshold: float = Field(default=60.0, ge=0, le=100)


class SemesterArchivePreviewResponse(BaseModel):
    semester: str
    pass_threshold: float
    eligible: List[ArchiveEligiblePair]
    failed: List[ArchiveFailedPair] = []
    excluded: List[ArchiveExcludedPair]
    eligible_count: int
    failed_count: int = 0
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
    enrollments_failed: int = 0
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
    enrollments_failed: int = 0
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
    # A plain string: a stored record must never make the Profile's history answer 500.
    fail_reason: Optional[str] = None
    archived_at: datetime

    model_config = ConfigDict(from_attributes=True)
