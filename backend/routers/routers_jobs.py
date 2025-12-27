"""
Background jobs router for async operations.

Provides endpoints for:
- Job creation and submission
- Job status tracking
- Job progress monitoring
- Job cancellation and management
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.schemas import (
    JobCreate,
    JobListResponse,
    JobResponse,
    JobStatus,
    JobType,
)
from backend.services.job_manager import job_manager

from .routers_auth import optional_require_role

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=JobResponse, status_code=202)
@limiter.limit(RATE_LIMIT_WRITE)
async def create_job(
    request: Request,
    job_create: JobCreate,
    current_user: dict = Depends(optional_require_role()),
    db: Session = Depends(get_session),
):
    """
    Create a new background job.

    **Note**: Job is queued but not immediately executed.
    Poll `/jobs/{job_id}` for status updates.

    **Rate limit**: 10 requests per minute
    """
    # Set user_id from authenticated user
    if current_user and "user_id" in current_user:
        job_create.user_id = current_user["user_id"]

    # Create job
    job_id = job_manager.create_job(job_create)

    # Return initial job status
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=500, detail="Failed to create job")

    from backend.logging_config import safe_log_context

    logger.info(
        "Job created",
        extra=safe_log_context(
            job_id=job_id,
            job_type=job_create.job_type.value,
            user_id=job_create.user_id,
        ),
    )

    return job


@router.get("/{job_id}", response_model=JobResponse)
@limiter.limit(RATE_LIMIT_READ)
async def get_job_status(
    job_id: str,
    request: Request,
    current_user: dict = Depends(optional_require_role()),
):
    """
    Get job status and progress.

    Use this endpoint to poll for job completion.

    **Rate limit**: 1000 requests per minute
    """
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check permission: users can only view their own jobs unless admin
    if current_user and job.user_id:
        # Handle both dict and SimpleNamespace objects
        role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)
        user_id = current_user.get("user_id") if isinstance(current_user, dict) else getattr(current_user, "id", None)

        is_admin = role == "admin"
        is_owner = user_id == job.user_id

        if not (is_admin or is_owner):
            raise HTTPException(status_code=403, detail="Access denied")

    return job


@router.get("/", response_model=JobListResponse)
@limiter.limit(RATE_LIMIT_READ)
async def list_jobs(
    request: Request,
    status: Optional[JobStatus] = Query(None, description="Filter by status"),
    job_type: Optional[JobType] = Query(None, description="Filter by type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(optional_require_role()),
):
    """
    List jobs with filtering and pagination.

    Regular users see only their jobs; admins see all jobs.

    **Rate limit**: 1000 requests per minute
    """
    user_id = None

    # Non-admins can only see their own jobs
    if current_user:
        is_admin = current_user.get("role") == "admin"
        if not is_admin:
            user_id = current_user.get("user_id")

    offset = (page - 1) * page_size
    jobs = job_manager.list_jobs(
        user_id=user_id,
        status=status,
        job_type=job_type,
        limit=page_size + 1,  # Get one extra to check if there's more
        offset=offset,
    )

    has_next = len(jobs) > page_size
    if has_next:
        jobs = jobs[:page_size]

    # Get total count (approximate from first page)
    total = offset + len(jobs)
    if has_next:
        total += 1  # At least one more

    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next,
    )


@router.post("/{job_id}/cancel", response_model=JobResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def cancel_job(
    job_id: str,
    request: Request,
    current_user: dict = Depends(optional_require_role()),
):
    """
    Cancel a pending or processing job.

    **Note**: Cancellation may not be immediate for processing jobs.

    **Rate limit**: 10 requests per minute
    """
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check permission
    if current_user and job.user_id:
        is_admin = current_user.get("role") == "admin"
        is_owner = current_user.get("user_id") == job.user_id

        if not (is_admin or is_owner):
            raise HTTPException(status_code=403, detail="Access denied")

    # Attempt cancellation
    cancelled = job_manager.cancel_job(job_id)

    if not cancelled:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled (already completed or failed)")

    logger.info(f"Job {job_id} cancelled by user {current_user.get('user_id')}")

    # Return updated job
    updated_job = job_manager.get_job(job_id)
    return updated_job or job


@router.delete("/{job_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
async def delete_job(
    job_id: str,
    request: Request,
    current_user: dict = Depends(optional_require_role("admin")),
):
    """
    Delete a job (admin only).

    Permanently removes job data.

    **Rate limit**: 10 requests per minute
    **Requires**: Admin role
    """
    deleted = job_manager.delete_job(job_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")

    logger.info(f"Job {job_id} deleted by admin {current_user.get('user_id')}")
    return None
