"""Centralized error codes and helpers for API responses."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status


class ErrorCode(str, Enum):
    """Stable application error identifiers exposed to API consumers."""

    INTERNAL_SERVER_ERROR = "ERR_INTERNAL"
    VALIDATION_FAILED = "ERR_VALIDATION"

    STUDENT_NOT_FOUND = "STD_NOT_FOUND"
    STUDENT_DUPLICATE_EMAIL = "STD_DUP_EMAIL"
    STUDENT_DUPLICATE_ID = "STD_DUP_ID"
    STUDENT_ARCHIVED = "STD_ARCHIVED"

    COURSE_NOT_FOUND = "CRS_NOT_FOUND"
    COURSE_DUPLICATE_CODE = "CRS_DUP_CODE"
    COURSE_ARCHIVED = "CRS_ARCHIVED"

    ATTENDANCE_ALREADY_EXISTS = "ATT_DUPLICATE"

    GRADE_NOT_FOUND = "GRD_NOT_FOUND"
    GRADE_DEPENDENCY_MISSING = "GRD_DEP_MISSING"

    UNAUTHORIZED = "AUTH_UNAUTHORIZED"
    FORBIDDEN = "AUTH_FORBIDDEN"


def build_error_detail(
    code: ErrorCode,
    message: str,
    request: Optional[Request] = None,
    *,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Return a serializable error payload with stable identifier."""

    payload: Dict[str, Any] = {
        "error_id": code.value,
        "error_code": code.name,
        "message": message,
    }

    if request is not None:
        request_id = getattr(getattr(request, "state", None), "request_id", None)
        if request_id:
            payload["request_id"] = request_id

    if context:
        payload["context"] = context

    return payload


def http_error(
    status_code: int,
    code: ErrorCode,
    message: str,
    request: Optional[Request] = None,
    *,
    context: Optional[Dict[str, Any]] = None,
) -> HTTPException:
    """Create an HTTPException populated with a structured error payload."""

    return HTTPException(status_code=status_code, detail=build_error_detail(code, message, request, context=context))


def internal_server_error(message: str = "Internal server error", request: Optional[Request] = None) -> HTTPException:
    """Shortcut for returning a 500 error with a standard payload."""

    return http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, message, request)
