"""
Pydantic schemas for bulk import/export operations (Feature #127).

Defines request/response models for:
- Import job creation and preview
- Export job creation and listing
- History tracking
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ========== IMPORT JOB SCHEMAS ==========


class ImportRowData(BaseModel):
    """Individual row data with validation status."""

    row_number: int = Field(..., ge=1)
    original_data: dict[str, Any]
    status: str = Field(..., description="pending, valid, error, committed")
    error_messages: Optional[List[str]] = None
    target_id: Optional[int] = None


class ImportJobCreate(BaseModel):
    """Request to create a new import job."""

    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., pattern="^(csv|xlsx)$")
    import_type: str = Field(..., pattern="^(students|courses|grades)$")
    total_rows: int = Field(..., ge=1)


class ImportJobResponse(BaseModel):
    """Response model for import job."""

    id: int
    file_name: str
    file_type: str
    import_type: str
    status: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    validation_errors: Optional[dict[str, Any]] = None
    file_path: Optional[str] = None
    imported_by: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ImportJobPreview(BaseModel):
    """Preview data for an import job before commitment."""

    import_job_id: int
    total_rows: int
    valid_rows: int
    error_rows: int
    preview_data: List[ImportRowData] = Field(
        ..., description="First N rows with status"
    )
    summary: str = Field(
        ..., description="Human-readable summary (e.g., '95 valid, 5 invalid')"
    )


class ImportJobCommitRequest(BaseModel):
    """Request to commit an import job."""

    import_job_id: int


class ImportJobRollbackRequest(BaseModel):
    """Request to rollback a completed import."""

    import_job_id: int


# ========== EXPORT JOB SCHEMAS ==========


class ExportJobCreate(BaseModel):
    """Request to create a new export job."""

    export_type: str = Field(
        ..., pattern="^(students|courses|grades|attendance|dashboard)$"
    )
    file_format: str = Field(..., pattern="^(csv|xlsx|pdf)$")
    filters: Optional[dict[str, Any]] = Field(
        None, description="Optional filtering criteria"
    )
    scheduled: bool = False
    schedule_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$")


class ExportJobResponse(BaseModel):
    """Response model for export job."""

    id: int
    export_type: str
    file_format: str
    file_path: Optional[str] = None
    status: str
    total_records: int
    filters: Optional[dict[str, Any]] = None
    scheduled: bool
    schedule_frequency: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExportListResponse(BaseModel):
    """List of export jobs with download URLs."""

    exports: List[ExportJobResponse]
    total: int
    page: int = 1
    page_size: int = 20


# ========== HISTORY SCHEMAS ==========


class ImportExportHistoryEntry(BaseModel):
    """Single entry in import/export history."""

    id: int
    operation_type: str  # import, export
    resource_type: str  # students, courses, grades, attendance
    user_id: Optional[int] = None
    job_id: Optional[int] = None
    action: str  # started, completed, failed, rolled_back
    details: Optional[dict[str, Any]] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ImportExportHistoryResponse(BaseModel):
    """List of import/export history entries."""

    history: List[ImportExportHistoryEntry]
    total: int
    page: int = 1
    page_size: int = 20


# ========== VALIDATION RESULT SCHEMAS ==========


class ValidationError(BaseModel):
    """Single validation error for a row."""

    field: str
    message: str
    row_number: int


class ImportValidationResult(BaseModel):
    """Result of import data validation."""

    is_valid: bool
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[ValidationError]
    summary: str
