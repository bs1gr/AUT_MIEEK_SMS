"""
Pydantic schemas for Custom Report Builder API.

Provides request/response models for custom reports, report templates,
and generated report instances for Phase 6 Reporting Enhancements.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# Report Template Schemas
# ============================================================================


class ReportTemplateBase(BaseModel):
    """Base schema for report templates."""

    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    category: str = Field(..., description="Template category (academic, administrative, statistical)")
    report_type: str = Field(..., description="Report type (student, course, grade, attendance)")
    fields: List[str] | Dict[str, Any] = Field(..., description="Fields to include in report (list or dict)")
    filters: Optional[List[Dict[str, Any]] | Dict[str, Any]] = Field(None, description="Default filter criteria")
    aggregations: Optional[List[Dict[str, Any]] | Dict[str, Any]] = Field(None, description="Aggregation configuration")
    sort_by: Optional[List[Dict[str, Any]] | Dict[str, Any]] = Field(None, description="Sort configuration")
    default_export_format: str = Field("pdf", description="Default export format")
    default_include_charts: bool = Field(True, description="Include charts by default")


class ReportTemplateCreate(ReportTemplateBase):
    """Schema for creating a new report template."""

    is_system: bool = Field(False, description="Is this a system template?")


class ReportTemplateUpdate(BaseModel):
    """Schema for updating an existing report template."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    report_type: Optional[str] = None
    fields: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    aggregations: Optional[Dict[str, Any]] = None
    sort_by: Optional[Dict[str, Any]] = None
    default_export_format: Optional[str] = None
    default_include_charts: Optional[bool] = None
    is_active: Optional[bool] = None


class ReportTemplateResponse(ReportTemplateBase):
    """Schema for report template responses."""

    id: int
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Custom Report Schemas
# ============================================================================


class CustomReportBase(BaseModel):
    """Base schema for custom reports."""

    name: str = Field(..., min_length=1, max_length=200, description="Report name")
    description: Optional[str] = Field(None, description="Report description")
    report_type: str = Field(..., description="Report type (student, course, grade, attendance, custom)")
    template_id: Optional[int] = Field(None, description="Template ID if based on template")
    fields: Dict[str, Any] = Field(..., description="Selected fields to include")
    filters: Optional[Dict[str, Any]] = Field(None, description="Filter criteria")
    aggregations: Optional[Dict[str, Any]] = Field(None, description="Aggregation config")
    sort_by: Optional[Dict[str, Any]] = Field(None, description="Sort configuration")
    export_format: str = Field("pdf", description="Export format (pdf, excel, csv)")
    include_charts: bool = Field(True, description="Include charts in export")

    @field_validator("export_format")
    @classmethod
    def normalize_export_format(cls, v: str) -> str:
        """Normalize export format to lowercase."""
        return v.lower() if v else "pdf"


class CustomReportCreate(CustomReportBase):
    """Schema for creating a new custom report."""

    schedule_enabled: bool = Field(False, description="Enable scheduling")
    schedule_frequency: Optional[str] = Field(None, description="Schedule frequency (daily, weekly, monthly, custom)")
    schedule_cron: Optional[str] = Field(None, description="Cron expression for custom schedules")
    email_recipients: Optional[List[str]] = Field(None, description="Email recipients for scheduled reports")
    email_enabled: bool = Field(False, description="Enable email delivery")

    @field_validator("export_format")
    @classmethod
    def validate_export_format(cls, v: str) -> str:
        """Normalize export format to lowercase."""
        return v.lower() if v else "pdf"

    @field_validator("schedule_cron")
    @classmethod
    def validate_cron(cls, v: Optional[str], info) -> Optional[str]:
        """Validate cron expression if custom schedule."""
        if v and info.data.get("schedule_frequency") == "custom":
            # Basic validation - cron has 5-6 fields
            parts = v.split()
            if len(parts) not in (5, 6):
                raise ValueError("Cron expression must have 5 or 6 fields")
        return v

    @field_validator("email_recipients")
    @classmethod
    def validate_emails(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate email format."""
        if v:
            import re

            email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            for email in v:
                if not re.match(email_regex, email):
                    raise ValueError(f"Invalid email address: {email}")
        return v


class CustomReportUpdate(BaseModel):
    """Schema for updating an existing custom report."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    report_type: Optional[str] = None
    template_id: Optional[int] = None
    fields: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    aggregations: Optional[Dict[str, Any]] = None
    sort_by: Optional[Dict[str, Any]] = None
    export_format: Optional[str] = None
    include_charts: Optional[bool] = None
    schedule_enabled: Optional[bool] = None
    schedule_frequency: Optional[str] = None
    schedule_cron: Optional[str] = None
    email_recipients: Optional[List[str]] = None
    email_enabled: Optional[bool] = None

    @field_validator("export_format")
    @classmethod
    def validate_export_format(cls, v: Optional[str]) -> Optional[str]:
        """Normalize export format to lowercase."""
        return v.lower() if v else None


class CustomReportResponse(CustomReportBase):
    """Schema for custom report responses."""

    id: int
    user_id: int
    schedule_enabled: bool
    schedule_frequency: Optional[str]
    schedule_cron: Optional[str]
    next_run_at: Optional[datetime]
    last_run_at: Optional[datetime]
    email_recipients: Optional[List[str]]
    email_enabled: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Generated Report Schemas
# ============================================================================


class GeneratedReportBase(BaseModel):
    """Base schema for generated reports."""

    file_name: str = Field(..., description="Generated file name")
    export_format: str = Field(..., description="Export format used")


class GeneratedReportCreate(GeneratedReportBase):
    """Schema for creating a generated report record."""

    report_id: int
    user_id: int
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: str = Field("pending", description="Generation status")
    record_count: Optional[int] = None


class GeneratedReportUpdate(BaseModel):
    """Schema for updating generated report status."""

    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    record_count: Optional[int] = None
    generation_duration_seconds: Optional[float] = None
    email_sent: Optional[bool] = None
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None


class GeneratedReportResponse(GeneratedReportBase):
    """Schema for generated report responses."""

    id: int
    report_id: int
    user_id: int
    file_path: Optional[str]
    file_size_bytes: Optional[int]
    status: str
    error_message: Optional[str]
    record_count: Optional[int]
    generation_duration_seconds: Optional[float]
    email_sent: bool
    email_sent_at: Optional[datetime]
    email_error: Optional[str]
    generated_at: datetime
    expires_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Report Generation Request Schemas
# ============================================================================


class ReportGenerationRequest(BaseModel):
    """Schema for triggering report generation."""

    export_format: Optional[str] = Field(None, description="Override default export format")
    include_charts: Optional[bool] = Field(None, description="Override chart inclusion")
    email_recipients: Optional[List[str]] = Field(None, description="Override email recipients")

    @field_validator("export_format")
    @classmethod
    def validate_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate export format."""
        if v and v not in ("pdf", "excel", "csv"):
            raise ValueError("Export format must be pdf, excel, or csv")
        return v


class ReportGenerationResponse(BaseModel):
    """Schema for report generation response."""

    generated_report_id: int
    status: str
    message: str
    estimated_duration_seconds: Optional[int] = None


# ============================================================================
# Report Statistics Schemas
# ============================================================================


class ReportStatistics(BaseModel):
    """Schema for report usage statistics."""

    total_reports: int
    active_scheduled_reports: int
    reports_by_type: Dict[str, int]
    total_generated_reports: int
    generated_reports_last_30_days: int
    average_generation_time_seconds: Optional[float]
    total_storage_bytes: Optional[int]


# ============================================================================
# Bulk Operation Schemas
# ============================================================================


class BulkReportGenerationRequest(BaseModel):
    """Schema for bulk report generation."""

    report_ids: List[int] = Field(..., min_length=1, description="List of report IDs to generate")
    export_format: Optional[str] = Field(None, description="Override export format for all")

    @field_validator("report_ids")
    @classmethod
    def validate_report_ids(cls, v: List[int]) -> List[int]:
        """Validate report IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Report IDs must be unique")
        return v


class BulkReportGenerationResponse(BaseModel):
    """Schema for bulk generation response."""

    total_requested: int
    successful: int
    failed: int
    generated_report_ids: List[int]
    errors: List[Dict[str, Any]]
