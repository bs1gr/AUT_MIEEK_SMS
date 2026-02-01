"""
Custom Reports router for Phase 6 Reporting Enhancements.

Provides endpoints for managing report templates, user-defined reports,
report generation, and report statistics.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from backend.dependencies import get_db
from backend.security.current_user import get_current_user, require_auth_even_if_disabled
from backend.routers.routers_auth import optional_require_role
from backend.schemas.response import APIResponse, error_response, success_response
from backend.schemas.custom_reports import (
    BulkReportGenerationRequest,
    BulkReportGenerationResponse,
    CustomReportCreate,
    CustomReportResponse,
    CustomReportUpdate,
    GeneratedReportCreate,
    GeneratedReportResponse,
    GeneratedReportUpdate,
    ReportGenerationRequest,
    ReportGenerationResponse,
    ReportStatistics,
    ReportTemplateCreate,
    ReportTemplateResponse,
    ReportTemplateUpdate,
)
from backend.services.custom_report_generation_service import CustomReportGenerationService
from backend.services.custom_report_service import CustomReportService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/custom-reports",
    tags=["custom-reports"],
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
    },
)


# ============================================================================
# TEMPLATE ENDPOINTS (ADMIN)
# ============================================================================


@router.post(
    "/templates",
    response_model=APIResponse[Dict[str, Any]],
    summary="Create report template",
)
async def create_report_template(
    request: Request,
    body: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        template = service.create_template(body)
        response = ReportTemplateResponse.model_validate(template)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error creating report template: {str(e)}")
        return error_response(
            code="CREATE_ERROR",
            message="Failed to create report template",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/templates",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="List report templates",
)
async def list_report_templates(
    request: Request,
    category: Optional[str] = Query(None, description="Filter by template category"),
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    limit: int = Query(200, ge=1, le=500, description="Max templates to return"),
    db: Session = Depends(get_db),
) -> APIResponse[List[Dict[str, Any]]]:
    try:
        service = CustomReportService(db)
        templates = service.list_templates(
            category=category,
            report_type=report_type,
            is_active=is_active,
            limit=limit,
        )
        result = [ReportTemplateResponse.model_validate(t).model_dump() for t in templates]
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error listing report templates: {str(e)}")
        return error_response(
            code="LIST_ERROR",
            message="Failed to list report templates",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/templates/{template_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get report template",
)
async def get_report_template(
    request: Request,
    template_id: int,
    db: Session = Depends(get_db),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        template = service.get_template(template_id)
        if not template:
            return error_response(
                code="NOT_FOUND",
                message="Template not found",
                request_id=request.state.request_id,
            )
        response = ReportTemplateResponse.model_validate(template)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting report template {template_id}: {str(e)}")
        return error_response(
            code="GET_ERROR",
            message="Failed to get report template",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.put(
    "/templates/{template_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Update report template",
)
async def update_report_template(
    request: Request,
    template_id: int,
    body: ReportTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        template = service.update_template(template_id, body)
        if not template:
            return error_response(
                code="NOT_FOUND",
                message="Template not found",
                request_id=request.state.request_id,
            )
        response = ReportTemplateResponse.model_validate(template)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error updating report template {template_id}: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to update report template",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.delete(
    "/templates/{template_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Deactivate report template",
)
async def delete_report_template(
    request: Request,
    template_id: int,
    hard_delete: bool = Query(False, description="Permanently delete template"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(optional_require_role("admin")),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        success = service.delete_template(template_id, hard_delete=hard_delete)
        if not success:
            return error_response(
                code="NOT_FOUND",
                message="Template not found",
                request_id=request.state.request_id,
            )
        return success_response(
            {"message": "Template deleted" if hard_delete else "Template deactivated"},
            request_id=request.state.request_id,
        )
    except Exception as e:
        logger.error(f"Error deleting report template {template_id}: {str(e)}")
        return error_response(
            code="DELETE_ERROR",
            message="Failed to delete report template",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


# ============================================================================
# CUSTOM REPORT ENDPOINTS (USER)
# ============================================================================


@router.post(
    "",
    response_model=APIResponse[Dict[str, Any]],
    summary="Create custom report",
)
async def create_custom_report(
    request: Request,
    body: CustomReportCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_auth_even_if_disabled),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        report = service.create_report(current_user.id, body)
        response = CustomReportResponse.model_validate(report)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error creating custom report: {str(e)}")
        return error_response(
            code="CREATE_ERROR",
            message="Failed to create report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="List custom reports",
)
async def list_custom_reports(
    request: Request,
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    include_deleted: bool = Query(False, description="Include soft-deleted reports"),
    limit: int = Query(200, ge=1, le=500, description="Max reports to return"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[List[Dict[str, Any]]]:
    try:
        service = CustomReportService(db)
        reports = service.list_reports(
            current_user.id,
            report_type=report_type,
            include_deleted=include_deleted,
            limit=limit,
        )
        result = [CustomReportResponse.model_validate(r).model_dump() for r in reports]
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error listing custom reports: {str(e)}")
        return error_response(
            code="LIST_ERROR",
            message="Failed to list reports",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/statistics",
    response_model=APIResponse[Dict[str, Any]],
    summary="Report statistics",
)
async def get_report_statistics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        stats = service.get_report_statistics(current_user.id)
        response = ReportStatistics(**stats)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting report statistics: {str(e)}")
        return error_response(
            code="STATS_ERROR",
            message="Failed to get report statistics",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/{report_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get custom report",
)
async def get_custom_report(
    request: Request,
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        report = service.get_report(report_id, current_user.id)
        if not report:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to access this report",
                request_id=request.state.request_id,
            )
        response = CustomReportResponse.model_validate(report)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting custom report {report_id}: {str(e)}")
        return error_response(
            code="GET_ERROR",
            message="Failed to get report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.put(
    "/{report_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Update custom report",
)
async def update_custom_report(
    request: Request,
    report_id: int,
    body: CustomReportUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        report = service.update_report(report_id, current_user.id, body)
        if not report:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to update this report",
                request_id=request.state.request_id,
            )
        response = CustomReportResponse.model_validate(report)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error updating custom report {report_id}: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to update report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.delete(
    "/{report_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Delete custom report",
)
async def delete_custom_report(
    request: Request,
    report_id: int,
    hard_delete: bool = Query(False, description="Permanently delete report"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        success = service.delete_report(report_id, current_user.id, hard_delete=hard_delete)
        if not success:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to delete this report",
                request_id=request.state.request_id,
            )
        return success_response(
            {"message": "Report deleted" if hard_delete else "Report archived"},
            request_id=request.state.request_id,
        )
    except Exception as e:
        logger.error(f"Error deleting custom report {report_id}: {str(e)}")
        return error_response(
            code="DELETE_ERROR",
            message="Failed to delete report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


# ============================================================================
# GENERATION & HISTORY
# ============================================================================


@router.post(
    "/{report_id}/generate",
    response_model=APIResponse[Dict[str, Any]],
    summary="Generate report",
)
async def generate_report(
    request: Request,
    report_id: int,
    body: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        report = service.get_report(report_id, current_user.id)
        if not report:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to generate this report",
                request_id=request.state.request_id,
            )

        export_format = str(body.export_format or report.export_format)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        file_name = f"report_{report_id}_{timestamp}.{export_format}"

        create_data = GeneratedReportCreate(
            report_id=report_id,
            user_id=current_user.id,
            file_name=file_name,
            export_format=export_format,
            status="pending",
        )
        generated = service.create_generated_report(report_id, current_user.id, create_data)

        generated_id = int(cast(int, generated.id))
        background_tasks.add_task(
            CustomReportGenerationService.run_generation_task,
            report_id,
            generated_id,
            current_user.id,
            export_format,
            bool(body.include_charts if body.include_charts is not None else report.include_charts),
        )
        response = ReportGenerationResponse(
            generated_report_id=generated_id,
            status=str(generated.status),
            message="Report generation queued",
        )
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error generating report {report_id}: {str(e)}")
        return error_response(
            code="GENERATE_ERROR",
            message="Failed to generate report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/{report_id}/generated",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="List generated reports",
)
async def list_generated_reports(
    request: Request,
    report_id: int,
    limit: int = Query(100, ge=1, le=500, description="Max generated reports to return"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[List[Dict[str, Any]]]:
    try:
        service = CustomReportService(db)
        report = service.get_report(report_id, current_user.id)
        if not report:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to access this report",
                request_id=request.state.request_id,
            )

        reports = service.list_generated_reports(report_id, current_user.id, limit=limit)
        result = [GeneratedReportResponse.model_validate(r).model_dump() for r in reports]
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error listing generated reports {report_id}: {str(e)}")
        return error_response(
            code="LIST_ERROR",
            message="Failed to list generated reports",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.patch(
    "/{report_id}/generated/{generated_report_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Update generated report",
)
async def update_generated_report(
    request: Request,
    report_id: int,
    generated_report_id: int,
    body: GeneratedReportUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        updated = service.update_generated_report(report_id, generated_report_id, current_user.id, body)
        if not updated:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to update this report instance",
                request_id=request.state.request_id,
            )
        response = GeneratedReportResponse.model_validate(updated)
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error updating generated report {generated_report_id}: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to update generated report",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.post(
    "/bulk-generate",
    response_model=APIResponse[Dict[str, Any]],
    summary="Bulk generate reports",
)
async def bulk_generate_reports(
    request: Request,
    body: BulkReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    try:
        service = CustomReportService(db)
        generated_ids: List[int] = []
        errors: List[Dict[str, Any]] = []

        for report_id in body.report_ids:
            report = service.get_report(report_id, current_user.id)
            if not report:
                errors.append({"report_id": report_id, "error": "Unauthorized or missing report"})
                continue

            export_format = str(body.export_format or report.export_format)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            file_name = f"report_{report_id}_{timestamp}.{export_format}"

            create_data = GeneratedReportCreate(
                report_id=report_id,
                user_id=current_user.id,
                file_name=file_name,
                export_format=export_format,
                status="pending",
            )
            generated = service.create_generated_report(report_id, current_user.id, create_data)
            generated_ids.append(int(cast(int, generated.id)))
            background_tasks.add_task(
                CustomReportGenerationService.run_generation_task,
                report_id,
                int(cast(int, generated.id)),
                current_user.id,
                export_format,
                bool(report.include_charts),
            )

        response = BulkReportGenerationResponse(
            total_requested=len(body.report_ids),
            successful=len(generated_ids),
            failed=len(errors),
            generated_report_ids=generated_ids,
            errors=errors,
        )
        return success_response(response.model_dump(), request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error bulk generating reports: {str(e)}")
        return error_response(
            code="BULK_ERROR",
            message="Failed to generate reports",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )
