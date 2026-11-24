"""
Analytics Routes
Provides endpoints for student analytics and final grade computations.
Optimized with eager loading to prevent N+1 query problems.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import internal_server_error
from backend.rate_limiting import RATE_LIMIT_READ, limiter
from backend.models import Course
from backend.rbac import require_permission
from backend.services import AnalyticsService
from backend.services.analytics_export_service import AnalyticsExportService
from backend.services.analytics_overview_service import AnalyticsOverviewService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={404: {"description": "Not found"}},
)


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/student/{student_id}/course/{course_id}/final-grade")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def calculate_final_grade(
    request: Request,
    student_id: int,
    course_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Calculate final grade using evaluation rules, grades, daily performance, and attendance."""
    try:
        return service.calculate_final_grade(student_id, course_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Final grade calculation failed: %s", exc, exc_info=True)
        raise internal_server_error("Final grade calculation failed", request)


@router.get("/student/{student_id}/all-courses-summary")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_all_courses_summary(
    request: Request,
    student_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    try:
        return service.get_student_all_courses_summary(student_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student courses summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Student courses summary failed", request)


@router.get("/dashboard")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_dashboard(
    request: Request,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Lightweight dashboard summary used by the frontend and load tests."""
    try:
        return service.get_dashboard_summary()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Dashboard summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Dashboard summary failed", request)


@router.get("/overview")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_class_overview(
    request: Request,
    academic_year: Optional[str] = Query(None, max_length=10),
    class_division: Optional[str] = Query(None, max_length=50),
    course_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    """Final grades, attendance and absence-limit status for active students, by class."""
    try:
        return AnalyticsOverviewService(db).class_overview(academic_year or None, class_division or None, course_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Analytics overview failed: %s", exc, exc_info=True)
        raise internal_server_error("Analytics overview failed", request)


@router.get("/attendance-gaps")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_attendance_gaps(request: Request, days: int = Query(7, ge=1, le=31), db: Session = Depends(get_db)):
    """Scheduled teaching days in the last `days` days with no attendance recorded, per course."""
    from datetime import date

    try:
        return AnalyticsOverviewService(db).attendance_gaps(date.today(), days)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Attendance gaps failed: %s", exc, exc_info=True)
        raise internal_server_error("Attendance gaps failed", request)


@router.get("/student/{student_id}/overview")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_overview(request: Request, student_id: int, db: Session = Depends(get_db)):
    """One student's enrolled courses: final grade, class average, attendance, absence status."""
    try:
        return AnalyticsOverviewService(db).student_overview(student_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student analytics overview failed: %s", exc, exc_info=True)
        raise internal_server_error("Student analytics overview failed", request)


_UNCATEGORIZED = {"en": "Uncategorized", "el": "Χωρίς κατηγορία"}


def _category_name(column: dict, language: str) -> str:
    """A category column's name as the page shows it: the standard label, else the typed name."""
    from backend.services.grade_categories import CATEGORY_KEYS, LABELS

    key = column.get("label_key")
    if key in CATEGORY_KEYS:
        return LABELS.get(language, LABELS["en"])[key]
    if key == "uncategorized":
        return _UNCATEGORIZED.get(language, _UNCATEGORIZED["en"])
    return str(column.get("name") or "")


def _student_export_data(db: Session, student_id: int, course_id: Optional[int], language: str) -> dict:
    """The student view of the Analytics page as exported (plan todo 75 stage 4): the student's
    courses and categories, narrowed to the chosen course as the page narrows them
    (``categoriesForCourse``: that course's own figures, a category it lacks left out)."""
    overview = AnalyticsOverviewService(db).student_overview(student_id)
    courses = [row for row in overview["courses"] if not course_id or row["id"] == course_id]
    categories = []
    for category in overview["categories"]:
        figures = category
        if course_id:
            figures = next((c for c in category["courses"] if c["id"] == course_id), None)
            if figures is None:
                continue
        average, class_average = figures["average"], figures["class_average"]
        categories.append(
            {
                "name": _category_name(category, language),
                "average": average,
                "class_average": class_average,
                "difference": round(average - class_average, 1)
                if average is not None and class_average is not None
                else None,
                "signal": figures["signal"],
            }
        )
    return {
        "student": overview["student"],
        "summary": overview["summary"],
        "courses": [
            {
                "course": f"{row['course_code']} — {row['course_name']}",
                "final_grade": row["final_grade"],
                "class_average": row["class_average"],
                "attendance_rate": (row.get("attendance") or {}).get("rate"),
                "late": (row.get("attendance") or {}).get("late"),
                "absence_status": (row.get("absence") or {}).get("status"),
                "passing": row["passing"],
            }
            for row in courses
        ],
        "categories": categories,
    }


def _build_dashboard_export_data(
    db: Session,
    language: str = "en",
    academic_year: Optional[str] = None,
    class_division: Optional[str] = None,
    course_id: Optional[int] = None,
    student_id: Optional[int] = None,
) -> dict:
    """Export data for the Analytics page: the same figures as GET /analytics/overview.

    Averages are of final grades (course evaluation rules), attendance counts Present and Late
    as attended, and only active students and their live enrollments are included. A class or
    course with nothing graded yet exports 0, as the export format has no empty value.

    Plan todo 75 stage 4: the export follows the filters on screen (the class, the division, the
    course; in the student view, the student) instead of every active student, says which they
    were, and carries the selection's students and its categories (strengths and difficulties),
    or the student's courses and categories.
    """
    overview = AnalyticsOverviewService(db).class_overview(academic_year or None, class_division or None, course_id)
    course = next((row for row in overview["courses"] if row["id"] == course_id), None) if course_id else None
    if course_id and course is None:
        found = db.query(Course).filter(Course.id == course_id).first()
        course = {"course_code": found.course_code, "course_name": found.course_name} if found else None
    unknown = "Άγνωστη Τάξη" if language == "el" else "Unknown Class"

    by_class: dict[str, list] = {}
    for row in overview["students"]:
        by_class.setdefault(row["academic_year"] or unknown, []).append(row)
    class_averages = []
    for label, rows in by_class.items():
        finals = [r["average_final_grade"] for r in rows if r["average_final_grade"] is not None]
        class_averages.append(
            {"label": label, "count": len(rows), "average": round(sum(finals) / len(finals), 2) if finals else 0}
        )
    class_averages.sort(key=lambda item: (-int(item["count"]), str(item["label"])))

    course_averages = [
        {
            "label": row["course_name"],
            "count": row["students"],
            "average": row["average_final_grade"] if row["average_final_grade"] is not None else 0,
        }
        for row in overview["courses"]
    ]
    course_averages.sort(key=lambda item: (-int(item["count"]), str(item["label"])))

    summary = overview["summary"]
    categories = overview["categories"]
    data = {
        "scope": {
            "academic_year": academic_year or None,
            "class_division": class_division or None,
            "course": f"{course['course_code']} — {course['course_name']}" if course else None,
            "student": None,
        },
        "summary": {
            "total_students": summary["students"],
            "total_courses": summary["courses"],
            "average_grade": summary["average_final_grade"] or 0,
            "average_attendance": summary["attendance_rate"] or 0,
        },
        "class_averages": class_averages,
        "course_averages": course_averages,
        "students": overview["students"],
        "categories": {
            "columns": [_category_name(column, language) for column in categories["columns"]],
            "averages": categories["averages"],
            "students": [
                {"name": row["name"], "cells": row["cells"], "signals": row["signals"]}
                for row in categories["students"]
            ],
        },
    }
    if student_id:
        data["student_view"] = _student_export_data(db, student_id, course_id, language)
        data["scope"]["student"] = data["student_view"]["student"]["name"]
    return data


@router.delete("/cache/clear")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("admin:manage")
def clear_analytics_cache(request: Request, service: AnalyticsService = Depends(get_analytics_service)):
    """
    Clear all cached analytics data.

    This endpoint clears the entire analytics cache and should only be used
    when data integrity is critical (e.g., after bulk imports or system corrections).

    **Requires**: admin:manage permission
    **Rate limit**: 60 requests per minute (read limit)
    """
    try:
        service.clear_all_cache()
        logger.info("Analytics cache cleared by %s", request.state.request_id)
        return {
            "success": True,
            "message": "All analytics cache cleared",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("Failed to clear analytics cache: %s", exc, exc_info=True)
        raise internal_server_error("Failed to clear analytics cache", request)


@router.post("/export/excel")
@limiter.limit(RATE_LIMIT_READ)
@require_permission(("analytics:export", "reports:export", "reports:generate"))
def export_dashboard_excel(
    request: Request,
    language: Optional[str] = Query(None),
    timezone: Optional[str] = Query("Europe/Athens"),
    academic_year: Optional[str] = Query(None, max_length=10),
    class_division: Optional[str] = Query(None, max_length=50),
    course_id: Optional[int] = Query(None, ge=1),
    student_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """
    Export dashboard analytics data to Excel format.

    **Permission** (requires one of):
    - analytics:export
    - reports:export
    - reports:generate

    **Rate limit**: 60 requests per minute (read limit)

    Returns:
        StreamingResponse: Excel file with dashboard summary data
    """
    try:
        # Try to get language from query param, then from Accept-Language header
        final_language = language or "en"
        if not language:
            accept_lang = request.headers.get("accept-language", "").split(",")[0].lower()
            if "el" in accept_lang:
                final_language = "el"
            elif "en" in accept_lang:
                final_language = "en"

        logger.info(f"Excel export - query_language={language}, timezone={timezone}, final={final_language}")
        # The filters on screen (plan todo 75 stage 4), and the language: the Excel export used to
        # label a student without a class "Unknown Class" in Greek too.
        export_data = _build_dashboard_export_data(
            db,
            language=final_language,
            academic_year=academic_year,
            class_division=class_division,
            course_id=course_id,
            student_id=student_id,
        )
        export_service = AnalyticsExportService(db, language=final_language, timezone=timezone)
        excel_data = export_service.export_dashboard_to_excel(data=export_data)

        logger.info("Analytics dashboard exported to Excel by %s with language %s", request.state.request_id, language)

        return StreamingResponse(
            iter([excel_data]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=analytics_dashboard.xlsx"},
        )
    except HTTPException:
        raise  # a student that does not exist: 404, not a failed export
    except Exception as exc:
        logger.error("Failed to export dashboard to Excel: %s", exc, exc_info=True)
        raise internal_server_error("Failed to export dashboard to Excel", request)


@router.post("/export/pdf")
@limiter.limit(RATE_LIMIT_READ)
@require_permission(("analytics:export", "reports:export", "reports:generate"))
def export_dashboard_pdf(
    request: Request,
    language: Optional[str] = Query(None),
    timezone: Optional[str] = Query("Europe/Athens"),
    academic_year: Optional[str] = Query(None, max_length=10),
    class_division: Optional[str] = Query(None, max_length=50),
    course_id: Optional[int] = Query(None, ge=1),
    student_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """
    Export dashboard analytics data to PDF format.

    **Permission** (requires one of):
    - analytics:export
    - reports:export
    - reports:generate

    **Rate limit**: 60 requests per minute (read limit)

    Returns:
        StreamingResponse: PDF file with dashboard summary data
    """
    try:
        # Try to get language from query param, then from Accept-Language header
        final_language = language or "en"
        if not language:
            accept_lang = request.headers.get("accept-language", "").split(",")[0].lower()
            if "el" in accept_lang:
                final_language = "el"
            elif "en" in accept_lang:
                final_language = "en"

        logger.info(f"PDF export - query_language={language}, timezone={timezone}, final={final_language}")
        # IMPORTANT: Both must use same language to ensure consistent output (data + export service)
        export_data = _build_dashboard_export_data(
            db,
            language=final_language,
            academic_year=academic_year,
            class_division=class_division,
            course_id=course_id,
            student_id=student_id,
        )
        export_service = AnalyticsExportService(db, language=final_language, timezone=timezone)
        assert export_service.language == final_language, "Language mismatch between data and service"
        pdf_data = export_service.export_dashboard_to_pdf(data=export_data)

        logger.info("Analytics dashboard exported to PDF by %s with language %s", request.state.request_id, language)

        return StreamingResponse(
            iter([pdf_data]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=analytics_dashboard.pdf"},
        )
    except HTTPException:
        raise  # a student that does not exist: 404, not a failed export
    except Exception as exc:
        logger.error("Failed to export dashboard to PDF: %s", exc, exc_info=True)
        raise internal_server_error("Failed to export dashboard to PDF", request)


# Predictive Analytics Endpoints


@router.get("/predictive/student")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:view")
def get_student_predictive_analytics(
    request: Request,
    student_id: int = None,
    course_id: int = None,
    weeks_ahead: int = 4,
    include_attendance: bool = True,
    include_risk_assessment: bool = True,
    include_final_grade: bool = True,
    db: Session = Depends(get_db),
):
    """
    Get predictive analytics for a student including grade trends and risk assessment.

    **Permission** (requires admin or reports:view permission):
    - reports:view

    **Rate limit**: 60 requests per minute (read limit)

    Query Parameters:
    - student_id: Student ID to get predictions for
    - course_id: Optional specific course ID
    - weeks_ahead: Number of weeks to predict (default: 4)
    - include_attendance: Include attendance predictions (default: true)
    - include_risk_assessment: Include risk assessment (default: true)
    - include_final_grade: Include final grade projection (default: true)

    Returns:
        JSON with grade predictions, attendance patterns, risk assessment, and final grade projection
    """
    try:
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id is required")

        service = AnalyticsService(db)
        result = service.get_student_predictive_analytics(
            student_id=student_id,
            course_id=course_id,
            weeks_ahead=weeks_ahead,
            include_attendance=include_attendance,
            include_risk_assessment=include_risk_assessment,
            include_final_grade=include_final_grade,
        )

        logger.info("Retrieved predictive analytics for student %d by %s", student_id, request.state.request_id)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get student predictive analytics: %s", exc, exc_info=True)
        raise internal_server_error("Failed to retrieve predictive analytics", request)


# ============================================================================
# Custom Report Builder Endpoints
# ============================================================================


@router.post("/reports/custom")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:create")
def create_custom_report(
    request: Request,
    report_config: dict,
    db: Session = Depends(get_db),
):
    """Create a new custom report configuration.

    **Permission** (requires reports:create permission):
    - reports:create

    **Rate limit**: 60 requests per minute (read limit)

    Request Body:
    - name: Report name
    - template: Template ID or name
    - dataSeries: Selected metrics
    - chartType: Chart type (line, bar, area, pie)
    - filters: Filter configuration
    - sortBy: Sort rules
    - exportFormat: Export format (pdf, excel, csv)
    - includeCharts: Include visualizations

    Returns:
        JSON with saved report ID and configuration
    """
    try:
        from backend.models import Report

        # Get current user from dependencies
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Create report instance
        new_report = Report(
            user_id=user_id,
            name=report_config.get("name"),
            description=report_config.get("description"),
            report_type="custom",
            template_id=None,
            fields=report_config.get("dataSeries", []),
            filters=report_config.get("filters", {}),
            sort_by=report_config.get("sortBy"),
            export_format=report_config.get("exportFormat", "pdf"),
            include_charts=report_config.get("includeCharts", True),
        )

        # Store chart type in aggregations JSON field as metadata
        new_report.aggregations = {
            "chartType": report_config.get("chartType", "bar"),
            "template": report_config.get("template", "custom"),
        }

        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        logger.info(
            "Created custom report %d by user %d (request %s)", new_report.id, user_id, request.state.request_id
        )

        return {
            "id": new_report.id,
            "name": new_report.name,
            "template": report_config.get("template"),
            "createdAt": new_report.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create custom report: %s", exc, exc_info=True)
        raise internal_server_error("Failed to create custom report", request)


@router.get("/reports/custom/{report_id}")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:view")
def get_custom_report(
    request: Request,
    report_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve a custom report configuration by ID.

    **Permission** (requires reports:view permission):
    - reports:view

    **Rate limit**: 60 requests per minute (read limit)

    Path Parameters:
    - report_id: Report ID

    Returns:
        JSON with complete report configuration
    """
    try:
        from backend.models import Report

        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Reconstruct report configuration
        config = {
            "id": report.id,
            "name": report.name,
            "description": report.description,
            "template": report.aggregations.get("template", "custom") if report.aggregations else "custom",
            "dataSeries": report.fields or [],
            "chartType": report.aggregations.get("chartType", "bar") if report.aggregations else "bar",
            "filters": report.filters or {},
            "sortBy": report.sort_by or [],
            "exportFormat": report.export_format,
            "includeCharts": report.include_charts,
            "createdAt": report.created_at.isoformat(),
            "updatedAt": report.updated_at.isoformat(),
        }

        logger.info("Retrieved custom report %d (request %s)", report_id, request.state.request_id)
        return config
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve custom report: %s", exc, exc_info=True)
        raise internal_server_error("Failed to retrieve custom report", request)
