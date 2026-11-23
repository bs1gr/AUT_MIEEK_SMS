"""
Grade sheet routes (plan todo 75): the list of a course's students with their scores, for one
assessment, for every assessment, or by category, as JSON for the page and as PDF or Excel.

Access is ``reports:generate``, as for the Analytics page and the other reports (teachers and
administrators).
"""

import logging
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.rate_limiting import RATE_LIMIT_READ, limiter
from backend.rbac import require_permission
from backend.security.current_user import optional_signed_in_user
from backend.services import grade_sheet_export
from backend.services.grade_sheet_service import GradeSheetService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/grade-sheets", tags=["Grade sheets"], responses={404: {"description": "Not found"}})

SheetKind = Literal["assessment", "matrix", "categories"]


def _teacher_name(user: Any) -> Optional[str]:
    """Who prints the sheet: the account's full name, else its e-mail; nobody with auth off."""
    if user is None:
        return None
    return (getattr(user, "full_name", None) or "").strip() or (getattr(user, "email", None) or "").strip() or None


@router.get("/course/{course_id}/assessments")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def list_assessments(request: Request, course_id: int, db: Session = Depends(get_db)):
    """Every assessment of the course (same name and category), oldest first, with how many are graded."""
    try:
        return GradeSheetService(db).assessments(course_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing the assessments of a course")
        raise internal_server_error(request=request)


@router.get("/course/{course_id}")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_grade_sheet(
    request: Request,
    course_id: int,
    kind: SheetKind = Query("assessment"),
    assessment: Optional[str] = Query(None, description="The key from /assessments (kind=assessment)"),
    db: Session = Depends(get_db),
):
    """
    One grade sheet of a course, every enrolled student A to Z by surname.

    - **kind=assessment**: one assessment (its **assessment** key): score, out of, percentage
    - **kind=matrix**: one column per assessment, then the final grade
    - **kind=categories**: one column per category, then the final grade
    """
    try:
        return GradeSheetService(db).sheet(course_id, kind, assessment)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error building a grade sheet")
        raise internal_server_error(request=request)


@router.get("/course/{course_id}/export/{file_format}")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def export_grade_sheet(
    request: Request,
    course_id: int,
    file_format: Literal["pdf", "excel"],
    kind: SheetKind = Query("assessment"),
    assessment: Optional[str] = Query(None),
    lang: Optional[str] = Query(None, description="'en' or 'el'; defaults to Accept-Language"),
    db: Session = Depends(get_db),
    user=Depends(optional_signed_in_user),
):
    """The same sheet as a PDF to print or an Excel file, with the signed-in teacher's name on it."""
    try:
        sheet = GradeSheetService(db).sheet(course_id, kind, assessment)
        options = {
            "lang": grade_sheet_export.resolve_lang(lang, request.headers.get("accept-language")),
            "teacher": _teacher_name(user),
        }
        if file_format == "pdf":
            content = grade_sheet_export.build_pdf(sheet, **options)
            media_type, extension = grade_sheet_export.PDF_MEDIA_TYPE, "pdf"
        else:
            content = grade_sheet_export.build_excel(sheet, **options)
            media_type, extension = grade_sheet_export.EXCEL_MEDIA_TYPE, "xlsx"
        filename = grade_sheet_export.export_filename(sheet, extension)
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except grade_sheet_export.PdfUnavailable:
        logger.exception("PDF export is unavailable")
        raise http_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            ErrorCode.EXPORT_FAILED,
            "PDF export is temporarily unavailable",
            request,
        )
    except Exception:
        logger.exception("Error exporting a grade sheet")
        raise internal_server_error(request=request)
