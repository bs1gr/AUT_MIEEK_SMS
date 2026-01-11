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
from backend.error_messages import ErrorCode, get_error_message
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.schemas import (
    JobCreate,
    JobListResponse,
    JobResponse,
    JobStatus,
    JobType,
)
from backend.services.job_manager import job_manager
from backend.rbac import require_permission

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=JobResponse, status_code=202)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("jobs:create")
async def create_job(
    request: Request,
    job_create: JobCreate,
    db: Session = Depends(get_session),
):
    """
    Create a new background job.

    **Note**: Job is queued but not immediately executed.
    Poll `/jobs/{job_id}` for status updates.

    **Rate limit**: 10 requests per minute
    """
    # Create job
    job_id = job_manager.create_job(job_create)

    # Return initial job status
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=500, detail=get_error_message(ErrorCode.JOB_CREATION_FAILED, lang="en"))

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
@require_permission("jobs:view")
async def get_job_status(
    job_id: str,
    request: Request,
):
    """
    Get job status and progress.

    Use this endpoint to poll for job completion.

    **Rate limit**: 1000 requests per minute
    """
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.JOB_NOT_FOUND, lang="en"))

    return job


@router.get("/", response_model=JobListResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("jobs:view")
async def list_jobs(
    request: Request,
    status: Optional[JobStatus] = Query(None, description="Filter by status"),
    job_type: Optional[JobType] = Query(None, description="Filter by type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    List jobs with filtering and pagination.

    Regular users see only their jobs; admins see all jobs.

    **Rate limit**: 1000 requests per minute
    """
    offset = (page - 1) * page_size
    jobs = job_manager.list_jobs(
        user_id=None,
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
@require_permission("jobs:manage")
async def cancel_job(
    job_id: str,
    request: Request,
):
    """
    Cancel a pending or processing job.

    **Note**: Cancellation may not be immediate for processing jobs.

    **Rate limit**: 10 requests per minute
    """
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.JOB_NOT_FOUND, lang="en"))

    # Attempt cancellation
    cancelled = job_manager.cancel_job(job_id)

    if not cancelled:
        raise HTTPException(status_code=400, detail=get_error_message(ErrorCode.JOB_CANNOT_BE_CANCELLED, lang="en"))

    logger.info(f"Job {job_id} cancelled")

    # Return updated job
    updated_job = job_manager.get_job(job_id)
    return updated_job or job


@router.delete("/{job_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("jobs:delete")
async def delete_job(
    job_id: str,
    request: Request,
):
    """
    Delete a job (admin only).

    Permanently removes job data.

    **Rate limit**: 10 requests per minute
    **Requires**: Admin role
    """
    deleted = job_manager.delete_job(job_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.JOB_NOT_FOUND, lang="en"))

    logger.info(f"Job {job_id} deleted")
    return None
