"""
Background job management service.

Handles:
- Job creation and queuing
- Progress tracking with Redis
- Job status updates
- Job result storage
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from backend.cache import redis_cache
from backend.schemas.jobs import (
    JobCreate,
    JobResponse,
    JobResult,
    JobStatus,
    JobType,
)

logger = logging.getLogger(__name__)

# Redis key prefixes
JOB_KEY_PREFIX = "job:"
JOB_LIST_KEY = "jobs:list"
USER_JOBS_KEY_PREFIX = "jobs:user:"

# Job expiration (keep completed jobs for 24 hours)
JOB_TTL = timedelta(hours=24)


class JobManager:
    """Manages background job lifecycle and persistence."""

    @staticmethod
    def create_job(job_create: JobCreate) -> str:
        """
        Create a new job and store in Redis.

        Args:
            job_create: Job creation parameters

        Returns:
            Job ID (UUID)
        """
        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        job_data = {
            "job_id": job_id,
            "job_type": job_create.job_type.value,
            "status": JobStatus.PENDING.value,
            "created_at": now.isoformat(),
            "started_at": None,
            "completed_at": None,
            "progress": None,
            "result": None,
            "user_id": job_create.user_id,
            "priority": job_create.priority,
            "parameters": job_create.parameters,
            "estimated_duration_seconds": None,
            "error_message": None,
        }

        # Store job data
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        redis_cache.set(job_key, job_data, JOB_TTL)

        # Add to job list (stored as JSON array)
        job_list = redis_cache.get(JOB_LIST_KEY) or []
        job_list.insert(0, {"id": job_id, "timestamp": now.timestamp()})  # Newest first
        # Keep only last 1000 jobs
        job_list = job_list[:1000]
        redis_cache.set(JOB_LIST_KEY, job_list, JOB_TTL)

        # Add to user's job list if user_id provided
        if job_create.user_id:
            user_key = f"{USER_JOBS_KEY_PREFIX}{job_create.user_id}"
            user_jobs = redis_cache.get(user_key) or []
            user_jobs.insert(0, {"id": job_id, "timestamp": now.timestamp()})
            user_jobs = user_jobs[:100]  # Keep last 100 per user
            redis_cache.set(user_key, user_jobs, JOB_TTL)

        logger.info(f"Created job {job_id} of type {job_create.job_type.value}")
        return job_id

    @staticmethod
    def get_job(job_id: str) -> Optional[JobResponse]:
        """
        Get job by ID.

        Args:
            job_id: Job identifier

        Returns:
            Job response or None if not found
        """
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        job_data = redis_cache.get(job_key)

        if not job_data:
            return None

        # Convert datetime strings back to datetime objects
        if job_data.get("created_at"):
            job_data["created_at"] = datetime.fromisoformat(job_data["created_at"])
        if job_data.get("started_at"):
            job_data["started_at"] = datetime.fromisoformat(job_data["started_at"])
        if job_data.get("completed_at"):
            job_data["completed_at"] = datetime.fromisoformat(job_data["completed_at"])

        return JobResponse(**job_data)

    @staticmethod
    def update_status(
        job_id: str, status: JobStatus, error_message: Optional[str] = None
    ) -> None:
        """
        Update job status.

        Args:
            job_id: Job identifier
            status: New status
            error_message: Error message if status is FAILED
        """
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        job_data = redis_cache.get(job_key)

        if not job_data:
            logger.warning(f"Job {job_id} not found for status update")
            return

        job_data["status"] = status.value
        now = datetime.now(timezone.utc).isoformat()

        if status == JobStatus.PROCESSING and not job_data.get("started_at"):
            job_data["started_at"] = now

        if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            job_data["completed_at"] = now

        if error_message:
            job_data["error_message"] = error_message

        redis_cache.set(job_key, job_data, JOB_TTL)
        logger.info(f"Job {job_id} status updated to {status.value}")

    @staticmethod
    def update_progress(
        job_id: str,
        current: int,
        total: int,
        message: Optional[str] = None,
        processed: int = 0,
        failed: int = 0,
        skipped: int = 0,
    ) -> None:
        """
        Update job progress.

        Args:
            job_id: Job identifier
            current: Current progress value
            total: Total items to process
            message: Progress message
            processed: Number of successfully processed items
            failed: Number of failed items
            skipped: Number of skipped items
        """
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        job_data = redis_cache.get(job_key)

        if not job_data:
            logger.warning(f"Job {job_id} not found for progress update")
            return

        percentage = (current / total * 100) if total > 0 else 0

        progress = {
            "current": current,
            "total": total,
            "percentage": round(percentage, 2),
            "message": message,
            "processed_items": processed,
            "failed_items": failed,
            "skipped_items": skipped,
        }

        job_data["progress"] = progress

        # Auto-update status to PROCESSING if still PENDING
        if job_data["status"] == JobStatus.PENDING.value:
            job_data["status"] = JobStatus.PROCESSING.value
            job_data["started_at"] = datetime.now(timezone.utc).isoformat()

        redis_cache.set(job_key, job_data, JOB_TTL)

    @staticmethod
    def set_result(job_id: str, result: JobResult) -> None:
        """
        Set job result and mark as completed/failed.

        Args:
            job_id: Job identifier
            result: Job execution result
        """
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        job_data = redis_cache.get(job_key)

        if not job_data:
            logger.warning(f"Job {job_id} not found for result update")
            return

        job_data["result"] = result.model_dump()
        job_data["status"] = (
            JobStatus.COMPLETED.value if result.success else JobStatus.FAILED.value
        )
        job_data["completed_at"] = datetime.now(timezone.utc).isoformat()

        if not result.success and result.errors:
            job_data["error_message"] = "; ".join(result.errors[:3])  # First 3 errors

        redis_cache.set(job_key, job_data, JOB_TTL)
        logger.info(f"Job {job_id} completed with success={result.success}")

    @staticmethod
    def list_jobs(
        user_id: Optional[int] = None,
        status: Optional[JobStatus] = None,
        job_type: Optional[JobType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[JobResponse]:
        """
        List jobs with optional filtering.

        Args:
            user_id: Filter by user ID
            status: Filter by status
            job_type: Filter by job type
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip

        Returns:
            List of job responses
        """
        # Get job list from cache
        if user_id:
            key = f"{USER_JOBS_KEY_PREFIX}{user_id}"
        else:
            key = JOB_LIST_KEY

        job_list = redis_cache.get(key) or []

        # Apply offset and limit
        paginated_list = job_list[offset : offset + limit]

        jobs = []
        for job_entry in paginated_list:
            job_id = job_entry.get("id")
            if not job_id:
                continue

            job = JobManager.get_job(job_id)
            if job:
                # Apply filters
                if status and job.status != status:
                    continue
                if job_type and job.job_type != job_type:
                    continue
                jobs.append(job)

        return jobs

    @staticmethod
    def cancel_job(job_id: str) -> bool:
        """
        Cancel a pending or processing job.

        Args:
            job_id: Job identifier

        Returns:
            True if cancelled, False if job not found or already completed
        """
        job = JobManager.get_job(job_id)

        if not job:
            return False

        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            return False

        JobManager.update_status(job_id, JobStatus.CANCELLED)
        return True

    @staticmethod
    def delete_job(job_id: str) -> bool:
        """
        Delete a job from Redis.

        Args:
            job_id: Job identifier

        Returns:
            True if deleted, False if not found
        """
        job_key = f"{JOB_KEY_PREFIX}{job_id}"
        job = redis_cache.get(job_key)

        if not job:
            return False

        # Delete job data
        deleted = redis_cache.delete(job_key)

        if deleted:
            # Remove from job list
            job_list = redis_cache.get(JOB_LIST_KEY) or []
            job_list = [j for j in job_list if j.get("id") != job_id]
            redis_cache.set(JOB_LIST_KEY, job_list, JOB_TTL)

            logger.info(f"Deleted job {job_id}")

        return deleted


# Singleton instance
job_manager = JobManager()
