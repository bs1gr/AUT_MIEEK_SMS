"""
Import/Export API Router for bulk data operations (Feature #127).

Endpoints for:
- Creating and managing import jobs
- Creating and managing export jobs
- Retrieving import/export history
- Email/SMTP settings management
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.models import ImportJob, ExportJob
from backend.rbac import require_permission
from backend.security.current_user import get_current_user
from backend.schemas import (
    APIResponse,
    ImportJobResponse,
    ExportJobCreate,
    ExportJobResponse,
    success_response,
    error_response,
)
from backend.services.import_export_service import ImportExportService
from backend.services.async_export_service import AsyncExportService
from backend.services.email_notification_service import EmailNotificationService
from backend.config import settings
from backend.routers.routers_auth import optional_require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import-export", tags=["Import/Export"])
service = ImportExportService()
async_export_service = AsyncExportService()


# ========== IMPORT ENDPOINTS ==========


@router.post("/imports/students", response_model=APIResponse[ImportJobResponse])
@require_permission("imports:create")
async def create_student_import(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> APIResponse[ImportJobResponse]:
    """
    Create a new student import job.

    - **file**: CSV or XLSX file with student data
    - **Returns**: ImportJob with ID for tracking

    **Permissions**: imports:create
    """
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")

        # Validate file type
        if not file.filename.lower().endswith((".csv", ".xlsx")):
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")

        # Create import job
        job = service.create_import_job(
            db=db,
            file_name=file.filename,
            file_type=file.filename.split(".")[-1].lower(),
            file_object=file,
            import_type="students",
            total_rows=0,  # Will update after parsing
            user_id=current_user.id if current_user else None,
        )

        # Trigger background processing
        background_tasks.add_task(service.process_import_job, db, job.id)

        return success_response(
            ImportJobResponse(
                id=job.id,
                file_name=job.file_name,
                file_type=job.file_type,
                import_type=job.import_type,
                status=job.status,
                total_rows=job.total_rows,
                successful_rows=job.successful_rows,
                failed_rows=job.failed_rows,
                validation_errors=job.validation_errors,
                file_path=job.file_path,
                imported_by=job.imported_by,
                created_at=job.created_at,
                completed_at=job.completed_at,
            ),
            request_id=request.state.request_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating import job: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", f"Failed to create import job: {str(e)}", request_id=request.state.request_id
        )


@router.post("/imports/courses", response_model=APIResponse[ImportJobResponse])
@require_permission("imports:create")
async def create_course_import(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> APIResponse[ImportJobResponse]:
    """
    Create a new course import job.

    **Permissions**: imports:create
    """
    try:
        if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx")):
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")

        job = service.create_import_job(
            db=db,
            file_name=file.filename,
            file_type=file.filename.split(".")[-1].lower(),
            file_object=file,
            import_type="courses",
            total_rows=0,
            user_id=current_user.id if current_user else None,
        )

        background_tasks.add_task(service.process_import_job, db, job.id)

        return success_response(
            ImportJobResponse(
                id=job.id,
                file_name=job.file_name,
                file_type=job.file_type,
                import_type=job.import_type,
                status=job.status,
                total_rows=job.total_rows,
                successful_rows=job.successful_rows,
                failed_rows=job.failed_rows,
                validation_errors=job.validation_errors,
                file_path=job.file_path,
                imported_by=job.imported_by,
                created_at=job.created_at,
                completed_at=job.completed_at,
            ),
            request_id=request.state.request_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating course import: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", f"Failed to create import job: {str(e)}", request_id=request.state.request_id
        )


@router.post("/imports/grades", response_model=APIResponse[ImportJobResponse])
@require_permission("imports:create")
async def create_grade_import(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> APIResponse[ImportJobResponse]:
    """
    Create a new grade import job.

    **Permissions**: imports:create
    """
    try:
        if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx")):
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")

        job = service.create_import_job(
            db=db,
            file_name=file.filename,
            file_type=file.filename.split(".")[-1].lower(),
            file_object=file,
            import_type="grades",
            total_rows=0,
            user_id=current_user.id if current_user else None,
        )

        background_tasks.add_task(service.process_import_job, db, job.id)

        return success_response(
            ImportJobResponse(
                id=job.id,
                file_name=job.file_name,
                file_type=job.file_type,
                import_type=job.import_type,
                status=job.status,
                total_rows=job.total_rows,
                successful_rows=job.successful_rows,
                failed_rows=job.failed_rows,
                validation_errors=job.validation_errors,
                file_path=job.file_path,
                imported_by=job.imported_by,
                created_at=job.created_at,
                completed_at=job.completed_at,
            ),
            request_id=request.state.request_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grade import: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", f"Failed to create import job: {str(e)}", request_id=request.state.request_id
        )


@router.get("/imports/{import_job_id}", response_model=APIResponse[ImportJobResponse])
@require_permission("imports:view")
async def get_import_job(
    import_job_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> APIResponse[ImportJobResponse]:
    """
    Retrieve import job details.

    **Permissions**: imports:view
    """
    job = db.query(ImportJob).filter(ImportJob.id == import_job_id).first()
    if not job:
        return error_response("NOT_FOUND", f"Import job {import_job_id} not found", request_id=request.state.request_id)

    return success_response(
        ImportJobResponse(
            id=job.id,
            file_name=job.file_name,
            file_type=job.file_type,
            import_type=job.import_type,
            status=job.status,
            total_rows=job.total_rows,
            successful_rows=job.successful_rows,
            failed_rows=job.failed_rows,
            validation_errors=job.validation_errors,
            file_path=job.file_path,
            imported_by=job.imported_by,
            created_at=job.created_at,
            completed_at=job.completed_at,
        ),
        request_id=request.state.request_id,
    )


@router.get("/imports", response_model=APIResponse[dict])
@require_permission("imports:view")
async def list_import_jobs(
    request: Request,
    import_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> APIResponse[dict]:
    """
    List import jobs with optional filtering.

    **Permissions**: imports:view
    """
    query = db.query(ImportJob)

    if import_type:
        query = query.filter(ImportJob.import_type == import_type)
    if status:
        query = query.filter(ImportJob.status == status)

    total = query.count()
    jobs = query.offset(skip).limit(limit).all()

    return success_response(
        {
            "jobs": [
                ImportJobResponse(
                    id=job.id,
                    file_name=job.file_name,
                    file_type=job.file_type,
                    import_type=job.import_type,
                    status=job.status,
                    total_rows=job.total_rows,
                    successful_rows=job.successful_rows,
                    failed_rows=job.failed_rows,
                    validation_errors=job.validation_errors,
                    file_path=job.file_path,
                    imported_by=job.imported_by,
                    created_at=job.created_at,
                    completed_at=job.completed_at,
                )
                for job in jobs
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
        request_id=request.state.request_id,
    )


@router.post("/imports/{import_job_id}/commit", response_model=APIResponse[ImportJobResponse])
@require_permission("imports:create")
async def commit_import_job(
    import_job_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> APIResponse[ImportJobResponse]:
    """
    Commit a validated import job to the database.

    **Permissions**: imports:create
    """
    job = db.query(ImportJob).filter(ImportJob.id == import_job_id).first()
    if not job:
        return error_response("NOT_FOUND", "Import job not found", request_id=request.state.request_id)

    if job.status != "ready":
        return error_response(
            "INVALID_STATE",
            f"Job is in '{job.status}' state, must be 'ready' to commit",
            request_id=request.state.request_id,
        )

    # Trigger background processing
    background_tasks.add_task(service.commit_import_job, db, job.id)

    # Optimistic status update for response
    return success_response(
        ImportJobResponse(
            id=job.id,
            file_name=job.file_name,
            file_type=job.file_type,
            import_type=job.import_type,
            status="importing",
            total_rows=job.total_rows,
            successful_rows=job.successful_rows,
            failed_rows=job.failed_rows,
            validation_errors=job.validation_errors,
            file_path=job.file_path,
            imported_by=job.imported_by,
            created_at=job.created_at,
            completed_at=job.completed_at,
        ),
        request_id=request.state.request_id,
    )


# ========== EXPORT ENDPOINTS ==========


@router.post("/exports", response_model=APIResponse[ExportJobResponse])
@require_permission("exports:generate")
async def create_export(
    request: Request,
    background_tasks: BackgroundTasks,
    export_request: ExportJobCreate,
    export_format: str = Query("excel", pattern="^(excel|csv|pdf)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> APIResponse[ExportJobResponse]:
    """
    Create a new async export job.

    Returns immediately with job ID (< 100ms). Export processes in background.

    - **export_type**: students, courses, grades, attendance, dashboard
    - **export_format**: excel (default), csv, pdf
    - **filters**: Optional filtering criteria

    **Permissions**: exports:generate

    **Returns**: Export job with ID for polling status
    """
    try:
        job = service.create_export_job(
            db=db,
            export_type=export_request.export_type,
            file_format=export_request.file_format,
            filters=export_request.filters,
            user_id=current_user.id if current_user else None,
        )

        # Queue background task - non-blocking
        background_tasks.add_task(
            async_export_service.process_export_task,
            job.id,
            export_request.export_type,
            export_format,
            export_request.filters,
            getattr(export_request, "limit", 10000),
        )

        # Return immediately with job ID (< 100ms response time)
        return success_response(
            ExportJobResponse(
                id=job.id,
                export_type=job.export_type,
                file_format=job.file_format,
                file_path=None,  # Not yet generated
                status=job.status,
                total_records=0,  # Will be updated when complete
                filters=job.filters,
                scheduled=job.scheduled,
                schedule_frequency=job.schedule_frequency,
                scheduled_at=job.scheduled_at,
                created_by=job.created_by,
                created_at=job.created_at,
                completed_at=None,
            ),
            request_id=request.state.request_id,
        )

    except Exception as e:
        logger.error(f"Error creating export job: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", f"Failed to create export: {str(e)}", request_id=request.state.request_id
        )


@router.get("/exports/{export_job_id}", response_model=APIResponse[ExportJobResponse])
@require_permission("exports:view")
async def get_export_job(
    export_job_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> APIResponse[ExportJobResponse]:
    """
    Retrieve export job details.

    **Permissions**: exports:view
    """
    job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
    if not job:
        return error_response("NOT_FOUND", f"Export job {export_job_id} not found", request_id=request.state.request_id)

    return success_response(
        ExportJobResponse(
            id=job.id,
            export_type=job.export_type,
            file_format=job.file_format,
            file_path=job.file_path,
            status=job.status,
            total_records=job.total_records,
            filters=job.filters,
            scheduled=job.scheduled,
            schedule_frequency=job.schedule_frequency,
            scheduled_at=job.scheduled_at,
            created_by=job.created_by,
            created_at=job.created_at,
            completed_at=job.completed_at,
        ),
        request_id=request.state.request_id,
    )


@router.get("/exports/{export_job_id}/download")
@require_permission("exports:download")
async def download_export(
    export_job_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Download completed export file.

    Only available when export status is 'completed'.

    **Permissions**: exports:download
    """
    import os
    from fastapi.responses import FileResponse

    job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
    if not job:
        return error_response("NOT_FOUND", f"Export job {export_job_id} not found", request_id=request.state.request_id)

    if job.status != "completed":
        return error_response(
            "INVALID_STATE", f"Export not ready (status: {job.status})", request_id=request.state.request_id
        )

    if not job.file_path or not os.path.exists(job.file_path):
        return error_response("NOT_FOUND", "Export file not found", request_id=request.state.request_id)

    # Log download
    logger.info(
        f"Downloading export {export_job_id} for user {request.state.user_id if hasattr(request.state, 'user_id') else 'unknown'}"
    )

    # Return file
    filename = f"{job.export_type}_export_{job.id}.{job.file_format}"
    return FileResponse(
        path=job.file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if job.file_format == "xlsx"
        else "application/octet-stream",
    )


@router.get("/exports", response_model=APIResponse[dict])
@require_permission("exports:view")
async def list_exports(
    request: Request,
    export_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> APIResponse[dict]:
    """
    List export jobs with optional filtering.

    **Permissions**: exports:view
    """
    query = db.query(ExportJob)

    if export_type:
        query = query.filter(ExportJob.export_type == export_type)
    if status:
        query = query.filter(ExportJob.status == status)

    total = query.count()
    jobs = query.offset(skip).limit(limit).all()

    return success_response(
        {
            "exports": [
                ExportJobResponse(
                    id=job.id,
                    export_type=job.export_type,
                    file_format=job.file_format,
                    file_path=job.file_path,
                    status=job.status,
                    total_records=job.total_records,
                    filters=job.filters,
                    scheduled=job.scheduled,
                    schedule_frequency=job.schedule_frequency,
                    scheduled_at=job.scheduled_at,
                    created_by=job.created_by,
                    created_at=job.created_at,
                    completed_at=job.completed_at,
                )
                for job in jobs
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
        request_id=request.state.request_id,
    )


# ========== HISTORY ENDPOINTS ==========


@router.get("/history", response_model=APIResponse[dict])
@require_permission("audit:view")
async def get_import_export_history(
    request: Request,
    operation_type: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> APIResponse[dict]:
    """
    Retrieve import/export history with audit trail.

    **Permissions**: audit:view
    """
    history = service.get_history(
        db=db,
        operation_type=operation_type,
        resource_type=resource_type,
        user_id=None,  # Allow viewing all history
        limit=limit,
    )

    return success_response(
        {
            "history": [
                {
                    "id": h.id,
                    "operation_type": h.operation_type,
                    "resource_type": h.resource_type,
                    "user_id": h.user_id,
                    "job_id": h.job_id,
                    "action": h.action,
                    "details": h.details,
                    "timestamp": h.timestamp,
                }
                for h in history
            ],
            "total": len(history),
        },
        request_id=request.state.request_id,
    )


# ========== EMAIL / SMTP SETTINGS ENDPOINTS ==========

from backend.services import smtp_override as _smtp  # noqa: E402


@router.get("/settings/email")
async def get_email_settings(
    request: Request,
    current_user: Any = Depends(optional_require_role(["admin"])),
) -> APIResponse[dict]:
    """Return current SMTP configuration (password masked)."""
    override = _smtp.load()
    has_password = bool(override.get("smtp_password") or settings.SMTP_PASSWORD)
    return success_response({
        "smtp_host": override.get("smtp_host", settings.SMTP_HOST or ""),
        "smtp_port": override.get("smtp_port", settings.SMTP_PORT),
        "smtp_username": override.get("smtp_username", settings.SMTP_USER or ""),
        "smtp_password": "••••••••" if has_password else "",
        "from_email": override.get("from_email", settings.SMTP_FROM or ""),
        "admin_emails": override.get("admin_emails", []),
        "notify_on_completion": override.get("notify_on_completion", True),
        "notify_on_failure": override.get("notify_on_failure", True),
        "notify_on_schedule_failure": override.get("notify_on_schedule_failure", True),
        "is_configured": EmailNotificationService.is_enabled(),
    }, request_id=request.state.request_id)


@router.put("/settings/email")
async def update_email_settings(
    request: Request,
    payload: dict,
    current_user: Any = Depends(optional_require_role(["admin"])),
) -> APIResponse[dict]:
    """Persist SMTP settings and apply them to the running process."""
    override = _smtp.load()
    fields = ["smtp_host", "smtp_port", "from_email", "smtp_username", "admin_emails",
              "notify_on_completion", "notify_on_failure", "notify_on_schedule_failure"]
    for field in fields:
        if field in payload:
            override[field] = payload[field]
    # Only overwrite stored password when a real value is provided
    if payload.get("smtp_password") and payload["smtp_password"] != "••••••••":
        override["smtp_password"] = payload["smtp_password"]
    _smtp.save(override)
    _smtp.apply(override)
    return success_response({
        "saved": True,
        "is_configured": EmailNotificationService.is_enabled(),
    }, request_id=request.state.request_id)


@router.post("/settings/email/test")
async def test_email_settings(
    request: Request,
    payload: dict,
    current_user: Any = Depends(optional_require_role(["admin"])),
) -> APIResponse[dict]:
    """Send a test email using the current SMTP configuration."""
    recipient = (payload.get("recipient_email") or "").strip()
    if not recipient:
        raise HTTPException(status_code=400, detail="recipient_email is required")
    if not EmailNotificationService.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="Email service not configured — set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM",
        )
    html = (
        "<p>This is a test email from the <strong>Student Management System</strong>.</p>"
        "<p>SMTP configuration is working correctly.</p>"
    )
    success = EmailNotificationService.send_email(recipient, "SMS — Test Email", html)
    return success_response({"success": success}, request_id=request.state.request_id)
