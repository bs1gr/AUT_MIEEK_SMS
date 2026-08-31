"""Semester archive router.

Admin-only: backs up a semester's data, then archives (records a permanent
performance snapshot for, then hard-deletes the raw enrollment/grade/
attendance/daily-performance rows of) every course a student has passed in
that semester. Student profiles and unfinished/failed enrollments are never
touched.
"""

import logging
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.rate_limiting import RATE_LIMIT_HEAVY, RATE_LIMIT_READ, limiter
from backend.routers.routers_auth import optional_require_role
from backend.schemas.semester_archive import (
    SemesterArchiveExecuteRequest,
    SemesterArchiveExecuteResponse,
    SemesterArchiveExportListItem,
    SemesterArchivePreviewRequest,
    SemesterArchivePreviewResponse,
    SemesterListItem,
)
from backend.services import semester_export_service
from backend.services.semester_archive_service import SemesterArchiveService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/semester-archive",
    tags=["Semester Archive"],
    responses={404: {"description": "Not found"}},
)


@router.get("/semesters", response_model=List[SemesterListItem])
@limiter.limit(RATE_LIMIT_READ)
def list_semesters(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
):
    try:
        return SemesterArchiveService(db).list_semesters()
    except Exception as exc:
        logger.error("Error listing semesters for archive: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.post("/preview", response_model=SemesterArchivePreviewResponse)
@limiter.limit(RATE_LIMIT_HEAVY)
def preview_semester_archive(
    request: Request,
    payload: SemesterArchivePreviewRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
):
    try:
        return SemesterArchiveService(db).preview(payload.semester, payload.pass_threshold)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error previewing semester archive: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.post("/execute", response_model=SemesterArchiveExecuteResponse)
@limiter.limit(RATE_LIMIT_HEAVY)
def execute_semester_archive(
    request: Request,
    payload: SemesterArchiveExecuteRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
):
    if payload.confirm_text != payload.semester:
        raise http_error(
            422,
            ErrorCode.SEMESTER_ARCHIVE_CONFIRMATION_MISMATCH,
            "Confirmation text must exactly match the semester name",
            request,
            context={"semester": payload.semester},
        )

    try:
        admin_user_id = getattr(current_user, "id", None)
        return SemesterArchiveService(db).execute(payload.semester, payload.pass_threshold, admin_user_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error executing semester archive: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/exports", response_model=List[SemesterArchiveExportListItem])
@limiter.limit(RATE_LIMIT_READ)
def list_semester_archive_exports(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
):
    try:
        return SemesterArchiveService(db).list_exports()
    except Exception as exc:
        logger.error("Error listing semester archive exports: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/exports/{export_id}/download")
@limiter.limit(RATE_LIMIT_READ)
def download_semester_archive_export(
    export_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
):
    try:
        exports = SemesterArchiveService(db).list_exports()
        export_row = next((e for e in exports if e.id == export_id), None)
        if not export_row or not export_row.export_filename:
            raise http_error(
                404,
                ErrorCode.SEMESTER_ARCHIVE_NOT_FOUND,
                "Semester archive export not found",
                request,
                context={"export_id": export_id},
            )

        backup_dir = semester_export_service.SEMESTER_ARCHIVE_DIR.resolve()
        target_path = (backup_dir / f"{export_row.export_filename}.enc").resolve()
        if not target_path.is_relative_to(backup_dir) or not target_path.exists():
            raise http_error(
                404,
                ErrorCode.SEMESTER_ARCHIVE_NOT_FOUND,
                "Semester archive export file not found",
                request,
                context={"export_id": export_id},
            )

        return FileResponse(target_path, media_type="application/octet-stream", filename=target_path.name)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error downloading semester archive export: %s", exc, exc_info=True)
        raise internal_server_error(request=request)
