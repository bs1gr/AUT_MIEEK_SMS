"""
Standard API Response Schemas for Student Management System

This module provides standardized response wrappers for all API endpoints,
ensuring consistent response formats across the entire API surface.

Part of Phase 1 v1.15.0 - API Response Standardization
"""

from datetime import datetime, timezone
from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class ResponseMeta(BaseModel):
    """
    Metadata included in every API response.

    Attributes:
        request_id: Unique identifier for this request (from RequestIDMiddleware)
        timestamp: ISO 8601 timestamp when the response was generated
        version: API version string (e.g., "1.15.0")
    """

    request_id: str = Field(..., description="Unique request identifier for tracing")
    timestamp: datetime = Field(..., description="Response generation timestamp (UTC)")
    version: str = Field(default="1.15.0", description="API version")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"request_id": "req_abc123xyz", "timestamp": "2026-01-04T23:30:00Z", "version": "1.15.0"}
        }
    )


class ErrorDetail(BaseModel):
    """
    Standardized error information for failed requests.

    Attributes:
        code: Machine-readable error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
        message: Human-readable error message
        details: Optional dictionary with additional error context
        path: Optional API path where the error occurred
    """

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict[str, Any]] = Field(default=None, description="Additional error context")
    path: Optional[str] = Field(default=None, description="API path where error occurred")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"email": ["Invalid email format"], "age": ["Must be at least 18"]},
                "path": "/api/v1/students",
            }
        }
    )


class APIResponse(BaseModel, Generic[T]):
    """
    Standard API response wrapper for all endpoints.

    This wrapper ensures consistent response structure across the entire API.
    All successful and error responses use this format.

    Type Parameters:
        T: The type of data being returned (e.g., Student, list[Course], etc.)

    Attributes:
        success: Boolean indicating whether the request succeeded
        data: The actual response payload (null on errors)
        error: Error details (null on success)
        meta: Response metadata (request_id, timestamp, version)

    Examples:
        Success response:
        ```python
        APIResponse(
            success=True,
            data={"id": 1, "name": "John Doe"},
            meta=ResponseMeta(
                request_id="req_123",
                timestamp=datetime.utcnow(),
                version="1.15.0"
            )
        )
        ```

        Error response:
        ```python
        APIResponse(
            success=False,
            error=ErrorDetail(
                code="NOT_FOUND",
                message="Student not found",
                path="/api/v1/students/999"
            ),
            meta=ResponseMeta(...)
        )
        ```
    """

    success: bool = Field(..., description="Whether the request succeeded")
    data: Optional[T] = Field(default=None, description="Response payload (null on errors)")
    error: Optional[ErrorDetail] = Field(default=None, description="Error details (null on success)")
    meta: ResponseMeta = Field(..., description="Response metadata")

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "success": True,
                "data": {"id": 1, "name": "John Doe", "email": "john@example.com"},
                "error": None,
                "meta": {"request_id": "req_abc123", "timestamp": "2026-01-04T23:30:00Z", "version": "1.15.0"},
            }
        },
    )


class PaginatedData(BaseModel, Generic[T]):
    """
    Paginated data wrapper for list endpoints.

    Type Parameters:
        T: The type of items in the list (e.g., Student, Course, etc.)

    Attributes:
        items: List of data items for this page
        total: Total number of items across all pages
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total_pages: Total number of pages
        has_next: Whether there is a next page
        has_previous: Whether there is a previous page

    Example:
        ```python
        PaginatedData(
            items=[student1, student2, ...],
            total=1500,
            page=2,
            page_size=20,
            total_pages=75,
            has_next=True,
            has_previous=True
        )
        ```
    """

    items: list[T] = Field(..., description="Items for this page")
    total: int = Field(..., ge=0, description="Total items across all pages")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, le=1000, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_previous: bool = Field(..., description="Whether there is a previous page")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [{"id": 1, "name": "Student 1"}, {"id": 2, "name": "Student 2"}],
                "total": 1500,
                "page": 1,
                "page_size": 20,
                "total_pages": 75,
                "has_next": True,
                "has_previous": False,
            }
        }
    )


# Helper function to create successful responses
def success_response(data: Any, request_id: str, version: str = "1.15.0") -> APIResponse:
    """
    Create a standardized success response.

    Args:
        data: The response payload
        request_id: Unique request identifier
        version: API version string

    Returns:
        APIResponse with success=True and the provided data
    """
    return APIResponse(
        success=True,
        data=data,
        meta=ResponseMeta(request_id=request_id, timestamp=datetime.now(timezone.utc), version=version),
    )


# Helper function to create error responses
def error_response(
    code: str,
    message: str,
    request_id: str,
    details: Optional[dict[str, Any]] = None,
    path: Optional[str] = None,
    version: str = "1.15.0",
) -> APIResponse:
    """
    Create a standardized error response.

    Args:
        code: Machine-readable error code
        message: Human-readable error message
        request_id: Unique request identifier
        details: Optional additional error context
        path: Optional API path where error occurred
        version: API version string

    Returns:
        APIResponse with success=False and error details
    """
    return APIResponse(
        success=False,
        error=ErrorDetail(code=code, message=message, details=details, path=path),
        meta=ResponseMeta(request_id=request_id, timestamp=datetime.now(timezone.utc), version=version),
    )


# Helper function to create paginated responses
def paginated_response(
    items: list[Any], total: int, skip: int, limit: int, request_id: str, version: str = "1.15.0"
) -> APIResponse[PaginatedData]:
    """
    Create a standardized paginated response.

    Args:
        items: List of items for this page
        total: Total number of items across all pages
        skip: Number of items skipped (offset)
        limit: Maximum items per page
        request_id: Unique request identifier
        version: API version string

    Returns:
        APIResponse wrapping PaginatedData with the items and pagination metadata
    """
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = ((total + limit - 1) // limit) if limit > 0 and total > 0 else 1

    return APIResponse(
        success=True,
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=limit,
            total_pages=total_pages,
            has_next=(skip + limit) < total,
            has_previous=skip > 0,
        ),
        meta=ResponseMeta(request_id=request_id, timestamp=datetime.now(timezone.utc), version=version),
    )
