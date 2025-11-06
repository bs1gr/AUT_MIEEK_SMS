"""
Common schemas used across multiple endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class PaginationParams(BaseModel):
    """
    Query parameters for pagination.
    
    Usage:
        @router.get("/items/")
        def list_items(pagination: PaginationParams = Depends()):
            ...
    """
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(100, ge=1, le=1000, description="Maximum records to return (max 1000)")


class PaginatedResponse(BaseModel):
    """
    Response schema for paginated endpoints.
    
    Usage:
        return PaginatedResponse(
            items=[...],
            total=count,
            skip=0,
            limit=100
        )
    """
    items: list
    total: int
    skip: int
    limit: int
    pages: int
    current_page: int
    
    class Config:
        from_attributes = True


class DateRangeParams(BaseModel):
    """
    Query parameters for date range filtering.
    
    Usage:
        @router.get("/reports/")
        def get_report(dates: DateRangeParams = Depends()):
            ...
    """
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
