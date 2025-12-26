"""Router for audit log management endpoints."""

from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from fastapi import APIRouter, Depends, Query

from backend.db import get_session as get_db
from backend.routers.routers_auth import optional_require_role
from backend.models import AuditLog
from backend.schemas.audit import AuditLogResponse, AuditLogListResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    success: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(optional_require_role("admin")),
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

    # Apply sorting and pagination
    logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(optional_require_role("admin")),
) -> AuditLogResponse:
    """Get a specific audit log by ID. Admin only."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Audit log not found")

    return AuditLogResponse.model_validate(log)


@router.get("/logs/user/{user_id}", response_model=AuditLogListResponse)
async def get_user_audit_logs(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(optional_require_role("admin")),
) -> AuditLogListResponse:
    """Get audit logs for a specific user. Admin only."""
    query = db.query(AuditLog).filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        skip=skip,
        limit=limit,
    )
