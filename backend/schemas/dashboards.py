"""Schemas for custom dashboards."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DashboardConfiguration(BaseModel):
    """Dashboard configuration schema."""
    charts: List[str] = Field(..., description="List of chart IDs to display")


class CreateDashboardRequest(BaseModel):
    """Schema for creating a dashboard."""
    name: str = Field(..., min_length=1, max_length=255, description="Dashboard name")
    description: Optional[str] = Field(None, max_length=500, description="Optional dashboard description")
    configuration: DashboardConfiguration = Field(..., description="Dashboard configuration")


class UpdateDashboardRequest(BaseModel):
    """Schema for updating a dashboard."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Dashboard name")
    description: Optional[str] = Field(None, max_length=500, description="Dashboard description")
    configuration: Optional[DashboardConfiguration] = Field(None, description="Dashboard configuration")


class DashboardResponse(BaseModel):
    """Schema for dashboard response."""
    id: int
    name: str
    description: Optional[str]
    configuration: Dict[str, Any]
    is_default: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
