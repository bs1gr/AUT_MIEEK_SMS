"""Centralized error codes and helpers for API responses."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status


class ErrorCode(str, Enum):
    """Stable application error identifiers exposed to API consumers."""

    INTERNAL_SERVER_ERROR = "ERR_INTERNAL"
    VALIDATION_FAILED = "ERR_VALIDATION"
    BAD_REQUEST = "ERR_BAD_REQUEST"

    STUDENT_NOT_FOUND = "STD_NOT_FOUND"
    STUDENT_DUPLICATE_EMAIL = "STD_DUP_EMAIL"
    STUDENT_DUPLICATE_ID = "STD_DUP_ID"
    STUDENT_ARCHIVED = "STD_ARCHIVED"

    COURSE_NOT_FOUND = "CRS_NOT_FOUND"
    COURSE_DUPLICATE_CODE = "CRS_DUP_CODE"
    COURSE_CODE_CONFLICT = "CRS_CODE_CONFLICT"
    COURSE_ARCHIVED = "CRS_ARCHIVED"

    ATTENDANCE_ALREADY_EXISTS = "ATT_DUPLICATE"
    ATTENDANCE_NOT_FOUND = "ATT_NOT_FOUND"
    ATTENDANCE_CONFLICT = "ATT_CONFLICT"

    GRADE_NOT_FOUND = "GRD_NOT_FOUND"
    GRADE_DEPENDENCY_MISSING = "GRD_DEP_MISSING"

    UNAUTHORIZED = "AUTH_UNAUTHORIZED"
    FORBIDDEN = "AUTH_FORBIDDEN"

    ENROLLMENT_NOT_FOUND = "ENR_NOT_FOUND"

    HIGHLIGHT_NOT_FOUND = "HLT_NOT_FOUND"

    IMPORT_INVALID_EXTENSION = "IMP_INVALID_EXT"
    IMPORT_INVALID_MIME = "IMP_INVALID_MIME"
    IMPORT_EMPTY_FILE = "IMP_EMPTY_FILE"
    IMPORT_TOO_LARGE = "IMP_TOO_LARGE"
    IMPORT_INVALID_JSON = "IMP_BAD_JSON"
    IMPORT_INVALID_ENCODING = "IMP_BAD_ENCODING"
    IMPORT_DIAGNOSE_FAILED = "IMP_DIAG_FAILED"
    IMPORT_DIRECTORY_NOT_FOUND = "IMP_DIR_MISSING"
    IMPORT_INVALID_REQUEST = "IMP_INVALID_REQ"
    IMPORT_PROCESSING_FAILED = "IMP_PROCESS_FAILED"

    EXPORT_FAILED = "EXP_FAILED"

    ADMINOPS_DB_NOT_FOUND = "ADM_DB_NOT_FOUND"
    ADMINOPS_BACKUP_FAILED = "ADM_BACKUP_FAILED"
    ADMINOPS_RESTORE_FAILED = "ADM_RESTORE_FAILED"
    ADMINOPS_CONFIRM_REQUIRED = "ADM_CONFIRM_REQUIRED"
    ADMINOPS_CLEAR_FAILED = "ADM_CLEAR_FAILED"

    # Control Panel - Docker-safe endpoints only
    CONTROL_LOGS_ERROR = "CTL_LOGS_ERROR"
    CONTROL_DATABASE_NOT_FOUND = "CTL_DATABASE_NOT_FOUND"
    CONTROL_BACKUP_FAILED = "CTL_BACKUP_FAILED"
    CONTROL_BACKUP_LIST_FAILED = "CTL_BACKUP_LIST_FAILED"
    CONTROL_BACKUP_NOT_FOUND = "CTL_BACKUP_NOT_FOUND"
    CONTROL_RESTORE_FAILED = "CTL_RESTORE_FAILED"
    CONTROL_PACKAGE_JSON_MISSING = "CTL_PKG_JSON_MISSING"
    CONTROL_NPM_NOT_FOUND = "CTL_NPM_NOT_FOUND"
    CONTROL_REQUIREMENTS_MISSING = "CTL_REQ_MISSING"
    CONTROL_PIP_NOT_FOUND = "CTL_PIP_NOT_FOUND"
    CONTROL_DOCKER_NOT_RUNNING = "CTL_DOCKER_NOT_RUNNING"
    CONTROL_OPERATION_FAILED = "CTL_OPERATION_FAILED"
    CONTROL_DEPENDENCY_ERROR = "CTL_DEPENDENCY_ERROR"
    CONTROL_FILE_NOT_FOUND = "CTL_FILE_NOT_FOUND"

    CONTROL_INVALID_FILE_TYPE = "CTL_INVALID_FILE_TYPE"

    AUTH_EMAIL_EXISTS = "AUTH_EMAIL_EXISTS"
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND"
    AUTH_CANNOT_DELETE_SELF = "AUTH_CANNOT_DELETE_SELF"
    AUTH_LAST_ADMIN = "AUTH_LAST_ADMIN"
    AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED"


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
    headers: Optional[Dict[str, str]] = None,
) -> HTTPException:
    """Create an HTTPException populated with a structured error payload."""

    return HTTPException(
        status_code=status_code,
        detail=build_error_detail(code, message, request, context=context),
        headers=headers,
    )


def internal_server_error(message: str = "Internal server error", request: Optional[Request] = None) -> HTTPException:
    """Shortcut for returning a 500 error with a standard payload."""

    return http_error(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
        message,
        request,
    )
