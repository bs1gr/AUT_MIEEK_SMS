"""Router for audit log management endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.error_messages import ErrorCode, get_error_message
from backend.models import AuditLog
from backend.rate_limiting import RATE_LIMIT_READ, limiter
from backend.rbac import require_permission
from backend.schemas.audit import AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("audit:view")
async def list_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    success: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """
    List audit logs with optional filtering.

    Admin only. Supports filtering by:
    - user_id: Filter by user
    - action: Filter by action type
    - resource: Filter by resource type
    - resource_id: Filter by specific resource
    - start_date/end_date: Filter by time range
    - success: Filter by success/failure
    """
    query = db.query(AuditLog)

    # Apply filters
    filters = []
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if action is not None:
        filters.append(AuditLog.action == action)
    if resource is not None:
        filters.append(AuditLog.resource == resource)
    if resource_id is not None:
        filters.append(AuditLog.resource_id == resource_id)
    if start_date is not None:
        filters.append(AuditLog.timestamp >= start_date)
    if end_date is not None:
        filters.append(AuditLog.timestamp <= end_date)
    if success is not None:
        filters.append(AuditLog.success == success)

    if filters:
        query = query.filter(and_(*filters))

    # Get total count
    total = query.count()
    offset = (page - 1) * page_size

    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size).all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log, from_attributes=True) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("audit:view")
async def get_audit_log(
    log_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> AuditLogResponse:
    """Get a specific audit log by ID. Admin only."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.AUDIT_LOG_NOT_FOUND, lang="en"))

    return AuditLogResponse.model_validate(log, from_attributes=True)


@router.get("/logs/user/{user_id}", response_model=AuditLogListResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("audit:view")
async def get_user_audit_logs(
    user_id: int,
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """Get audit logs for a specific user. Admin only."""
    query = db.query(AuditLog).filter(AuditLog.user_id == user_id)

    total = query.count()
    offset = (page - 1) * page_size
    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size).all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log, from_attributes=True) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )
