"""
Job tracking and background task schemas.

Provides schemas for:
- Job creation and status tracking
- Progress reporting
- Job results and errors
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Job execution status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    """Types of background jobs."""

    STUDENT_IMPORT = "student_import"
    GRADE_IMPORT = "grade_import"
    ATTENDANCE_IMPORT = "attendance_import"
    COURSE_IMPORT = "course_import"
    BULK_REPORT = "bulk_report"
    SESSION_EXPORT = "session_export"
    SESSION_IMPORT = "session_import"
    DATA_CLEANUP = "data_cleanup"


class JobCreate(BaseModel):
    """Schema for creating a new job."""

    job_type: JobType = Field(..., description="Type of job to execute")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Job execution parameters")
    user_id: Optional[int] = Field(None, description="User who initiated the job")
    priority: int = Field(default=5, ge=1, le=10, description="Job priority (1=highest, 10=lowest)")


class JobProgress(BaseModel):
    """Job progress information."""

    current: int = Field(..., ge=0, description="Current progress value")
    total: int = Field(..., gt=0, description="Total items to process")
    percentage: float = Field(..., ge=0, le=100, description="Completion percentage")
    message: Optional[str] = Field(None, description="Progress message")
    processed_items: int = Field(default=0, description="Number of successfully processed items")
    failed_items: int = Field(default=0, description="Number of failed items")
    skipped_items: int = Field(default=0, description="Number of skipped items")


class JobResult(BaseModel):
    """Job execution result."""

    success: bool = Field(..., description="Whether job completed successfully")
    message: str = Field(..., description="Result message")
    data: Optional[Dict[str, Any]] = Field(None, description="Result data")
    errors: List[str] = Field(default_factory=list, description="Error messages if any")
    warnings: List[str] = Field(default_factory=list, description="Warning messages if any")
    statistics: Optional[Dict[str, int]] = Field(None, description="Execution statistics")


class JobResponse(BaseModel):
    """Complete job information response."""

    job_id: str = Field(..., description="Unique job identifier")
    job_type: JobType = Field(..., description="Type of job")
    status: JobStatus = Field(..., description="Current job status")
    created_at: datetime = Field(..., description="Job creation timestamp")
    started_at: Optional[datetime] = Field(None, description="Job start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Job completion timestamp")
    progress: Optional[JobProgress] = Field(None, description="Job progress information")
    result: Optional[JobResult] = Field(None, description="Job result if completed")
    user_id: Optional[int] = Field(None, description="User who initiated the job")
    priority: int = Field(default=5, description="Job priority")
    estimated_duration_seconds: Optional[int] = Field(None, description="Estimated duration in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class JobListResponse(BaseModel):
    """List of jobs with pagination."""

    jobs: List[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    has_next: bool = Field(..., description="Whether there are more pages")


class ImportPreviewRequest(BaseModel):
    """Request for import preview/validation."""

    import_type: str = Field(..., description="Type of import (students, grades, courses, etc.)")
    validate_only: bool = Field(default=True, description="Only validate, don't import")
    allow_updates: bool = Field(default=False, description="Allow updating existing records")
    skip_duplicates: bool = Field(default=True, description="Skip duplicate records")


class ImportPreviewItem(BaseModel):
    """Preview item for validation."""

    row_number: int = Field(..., description="Row number in source file")
    action: str = Field(..., description="Action to be taken (create, update, skip)")
    data: Dict[str, Any] = Field(..., description="Parsed data")
    validation_status: str = Field(..., description="Validation status (valid, warning, error)")
    issues: List[str] = Field(default_factory=list, description="Validation issues if any")


class ImportPreviewResponse(BaseModel):
    """Import preview/validation response."""

    total_rows: int = Field(..., description="Total rows in file")
    valid_rows: int = Field(..., description="Number of valid rows")
    rows_with_warnings: int = Field(..., description="Number of rows with warnings")
    rows_with_errors: int = Field(..., description="Number of rows with errors")
    items: List[ImportPreviewItem] = Field(..., description="Preview items")
    can_proceed: bool = Field(..., description="Whether import can proceed")
    estimated_duration_seconds: Optional[int] = Field(None, description="Estimated import duration")
    summary: Dict[str, int] = Field(default_factory=dict, description="Summary statistics")
