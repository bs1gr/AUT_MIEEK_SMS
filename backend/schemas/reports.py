"""
Report schemas for student performance and progress reports.
"""

from datetime import date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportFormat(str, Enum):
    """Supported report output formats."""

    JSON = "json"
    PDF = "pdf"
    CSV = "csv"


class ReportPeriod(str, Enum):
    """Report time period options."""

    WEEK = "week"
    MONTH = "month"
    SEMESTER = "semester"
    YEAR = "year"
    CUSTOM = "custom"


class PerformanceReportRequest(BaseModel):
    """Request schema for generating student performance report."""

    student_id: int = Field(..., description="Student ID")
    course_ids: Optional[List[int]] = Field(
        None,
        description="Optional list of course IDs to include (all courses if empty)",
    )
    start_date: Optional[date] = Field(
        None, description="Report start date (for custom period)"
    )
    end_date: Optional[date] = Field(
        None, description="Report end date (for custom period)"
    )
    period: ReportPeriod = Field(
        ReportPeriod.SEMESTER, description="Report time period"
    )
    format: ReportFormat = Field(ReportFormat.JSON, description="Output format")
    include_grades: bool = Field(True, description="Include grade information")
    include_attendance: bool = Field(True, description="Include attendance information")
    include_daily_performance: bool = Field(
        True, description="Include daily performance scores"
    )
    include_highlights: bool = Field(True, description="Include semester highlights")


class PerformanceSummary(BaseModel):
    """Summary statistics for a performance category."""

    category: str
    total_entries: int
    average_score: float
    min_score: float
    max_score: float
    average_percentage: float
    trend: str  # "improving", "declining", "stable"


class CourseSummary(BaseModel):
    """Course-level summary in performance report."""

    course_id: int
    course_code: str
    course_name: str
    grade_average: Optional[float] = None
    grade_percentage: Optional[float] = None
    attendance_rate: Optional[float] = None
    total_absences: Optional[int] = None
    performance_categories: List[PerformanceSummary] = []
    latest_grade: Optional[float] = None
    weighted_grade: Optional[float] = None


class AttendanceSummary(BaseModel):
    """Attendance summary statistics."""

    total_days: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_rate: float
    unexcused_absences: int


class GradeSummary(BaseModel):
    """Grade summary statistics."""

    total_assignments: int
    average_grade: float
    average_percentage: float
    highest_grade: float
    lowest_grade: float
    grade_trend: str  # "improving", "declining", "stable"


class HighlightSummary(BaseModel):
    """Highlight information for the period."""

    semester: str
    rating: Optional[int]
    category: str
    text: str
    is_positive: bool
    date_created: date


class StudentPerformanceReport(BaseModel):
    """Complete student performance report response."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "student_id": 1,
                "student_name": "John Doe",
                "student_email": "john@example.com",
                "report_period": "semester",
                "start_date": "2025-09-01",
                "end_date": "2025-12-31",
                "generated_at": "2025-12-12T10:30:00Z",
                "overall_attendance": {
                    "total_days": 90,
                    "present": 85,
                    "absent": 5,
                    "attendance_rate": 94.4,
                },
                "courses": [
                    {
                        "course_id": 1,
                        "course_code": "CS101",
                        "course_name": "Introduction to Programming",
                        "grade_average": 85.5,
                        "attendance_rate": 95.0,
                    }
                ],
            }
        }
    )

    student_id: int
    student_name: str
    student_email: str
    report_period: str
    start_date: date
    end_date: date
    generated_at: str

    # Overall summaries
    overall_attendance: Optional[AttendanceSummary] = None
    overall_grades: Optional[GradeSummary] = None

    # Course-level breakdown
    courses: List[CourseSummary] = []

    # Highlights
    highlights: List[HighlightSummary] = []

    # Recommendations
    recommendations: List[str] = []


class BulkReportRequest(BaseModel):
    """Request schema for generating reports for multiple students."""

    student_ids: List[int] = Field(..., description="List of student IDs")
    course_ids: Optional[List[int]] = Field(None, description="Optional course filter")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    period: ReportPeriod = ReportPeriod.SEMESTER
    format: ReportFormat = ReportFormat.JSON
    include_grades: bool = True
    include_attendance: bool = True
    include_daily_performance: bool = True
    include_highlights: bool = True


class ReportJobStatus(BaseModel):
    """Status of an asynchronous report generation job."""

    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: int  # 0-100
    created_at: str
    completed_at: Optional[str] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
