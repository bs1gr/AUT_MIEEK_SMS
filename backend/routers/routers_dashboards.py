"""Dashboards router for custom dashboard management (Phase A, Feature 3).

Provides endpoints for managing user-specific dashboard configurations:
- Create, read, update, delete dashboards
- Set default dashboard
- Validate dashboard names
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy import IntegrityError
from sqlalchemy.orm import Session

from backend.dependencies import get_db
from backend.schemas.response import APIResponse, error_response, success_response
from backend.security.current_user import get_current_user
from backend.services.dashboard_service import DashboardService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboards",
    tags=["dashboards"],
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
    },
)


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================


@router.get(
    "",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="List user dashboards",
)
async def list_dashboards(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[List[Dict[str, Any]]]:
    """Get all dashboards for the current user."""
    try:
        service = DashboardService(db)
        dashboards = service.get_user_dashboards(current_user.id)
        result = [
            {
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "is_default": d.is_default,
                "created_at": d.created_at.isoformat(),
                "updated_at": d.updated_at.isoformat(),
            }
            for d in dashboards
        ]
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error listing dashboards: {str(e)}")
        return error_response(
            code="LIST_ERROR",
            message="Failed to list dashboards",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.post(
    "",
    response_model=APIResponse[Dict[str, Any]],
    summary="Create dashboard",
)
async def create_dashboard(
    request: Request,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    """Create a new dashboard for the current user.

    Request body:
    - name: Dashboard name (required, max 255 chars, unique per user)
    - description: Optional description (max 500 chars)
    - configuration: Dashboard config with selected charts (required)
    """
    try:
        # Validate required fields
        if "name" not in body or not body["name"]:
            return error_response(
                code="VALIDATION_ERROR",
                message="Dashboard name is required",
                request_id=request.state.request_id,
            )

        if "configuration" not in body or not body["configuration"]:
            return error_response(
                code="VALIDATION_ERROR",
                message="Configuration is required",
                request_id=request.state.request_id,
            )

        service = DashboardService(db)
        dashboard = service.create_dashboard(
            user_id=current_user.id,
            name=body["name"],
            description=body.get("description"),
            configuration=body["configuration"],
        )

        result = {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "configuration": dashboard.configuration,
            "is_default": dashboard.is_default,
            "created_at": dashboard.created_at.isoformat(),
            "updated_at": dashboard.updated_at.isoformat(),
        }
        return success_response(result, request_id=request.state.request_id)
    except ValueError as e:
        logger.warning(f"Validation error creating dashboard: {str(e)}")
        return error_response(
            code="VALIDATION_ERROR",
            message=str(e),
            request_id=request.state.request_id,
        )
    except IntegrityError as e:
        logger.warning(f"Dashboard name already exists for user: {str(e)}")
        db.rollback()
        return error_response(
            code="DUPLICATE_ERROR",
            message="A dashboard with this name already exists",
            request_id=request.state.request_id,
        )
    except Exception as e:
        logger.error(f"Error creating dashboard: {type(e).__name__}: {str(e)}", exc_info=True)
        return error_response(
            code="CREATE_ERROR",
            message=f"Failed to create dashboard: {str(e)}",
            details={"error": str(e), "type": type(e).__name__},
            request_id=request.state.request_id,
        )


@router.get(
    "/{dashboard_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get dashboard",
)
async def get_dashboard(
    request: Request,
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    """Get a specific dashboard."""
    try:
        service = DashboardService(db)
        dashboard = service.get_dashboard(dashboard_id)

        if not dashboard:
            return error_response(
                code="NOT_FOUND",
                message="Dashboard not found",
                request_id=request.state.request_id,
            )

        # Permission check: user can only access their own dashboards
        if dashboard.user_id != current_user.id:
            return error_response(
                code="FORBIDDEN",
                message="You do not have permission to access this dashboard",
                request_id=request.state.request_id,
            )

        result = {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "configuration": dashboard.configuration,
            "is_default": dashboard.is_default,
            "created_at": dashboard.created_at.isoformat(),
            "updated_at": dashboard.updated_at.isoformat(),
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        return error_response(
            code="GET_ERROR",
            message="Failed to get dashboard",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.put(
    "/{dashboard_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Update dashboard",
)
async def update_dashboard(
    request: Request,
    dashboard_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    """Update a dashboard (name, description, or configuration)."""
    try:
        service = DashboardService(db)
        dashboard = service.update_dashboard(
            dashboard_id=dashboard_id,
            user_id=current_user.id,
            name=body.get("name"),
            description=body.get("description"),
            configuration=body.get("configuration"),
        )

        if not dashboard:
            return error_response(
                code="NOT_FOUND",
                message="Dashboard not found or you don't have permission to update it",
                request_id=request.state.request_id,
            )

        result = {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "configuration": dashboard.configuration,
            "is_default": dashboard.is_default,
            "created_at": dashboard.created_at.isoformat(),
            "updated_at": dashboard.updated_at.isoformat(),
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error updating dashboard: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to update dashboard",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.delete(
    "/{dashboard_id}",
    response_model=APIResponse[Dict[str, str]],
    summary="Delete dashboard",
)
async def delete_dashboard(
    request: Request,
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, str]]:
    """Delete a dashboard."""
    try:
        service = DashboardService(db)
        deleted = service.delete_dashboard(dashboard_id, current_user.id)

        if not deleted:
            return error_response(
                code="NOT_FOUND",
                message="Dashboard not found or you don't have permission to delete it",
                request_id=request.state.request_id,
            )

        return success_response(
            {"message": "Dashboard deleted successfully"},
            request_id=request.state.request_id,
        )
    except Exception as e:
        logger.error(f"Error deleting dashboard: {str(e)}")
        return error_response(
            code="DELETE_ERROR",
            message="Failed to delete dashboard",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.post(
    "/{dashboard_id}/set-default",
    response_model=APIResponse[Dict[str, Any]],
    summary="Set dashboard as default",
)
async def set_default_dashboard(
    request: Request,
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> APIResponse[Dict[str, Any]]:
    """Set a dashboard as the user's default."""
    try:
        service = DashboardService(db)
        dashboard = service.set_default_dashboard(dashboard_id, current_user.id)

        if not dashboard:
            return error_response(
                code="NOT_FOUND",
                message="Dashboard not found or you don't have permission to set it as default",
                request_id=request.state.request_id,
            )

        result = {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "configuration": dashboard.configuration,
            "is_default": dashboard.is_default,
            "created_at": dashboard.created_at.isoformat(),
            "updated_at": dashboard.updated_at.isoformat(),
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error setting default dashboard: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to set default dashboard",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )
