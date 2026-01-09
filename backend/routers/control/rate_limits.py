"""
Rate Limiting Control Endpoints
Admin-only endpoints for managing dynamic rate limiting configuration.
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from backend.errors import ErrorCode, http_error
from backend.rate_limit_config import get_rate_limit_config
from backend.rate_limiting import update_rate_limit_strings
from backend.routers.routers_auth import optional_require_role

router = APIRouter()
logger = logging.getLogger(__name__)


class RateLimitUpdate(BaseModel):
    """Model for updating individual rate limit."""

    limit_type: str = Field(..., description="Type: read, write, heavy, auth, or teacher_import")
    value: int = Field(..., ge=1, description="Requests per minute (min 1)")


class RateLimitBulkUpdate(BaseModel):
    """Model for updating multiple rate limits at once."""

    limits: Dict[str, int] = Field(..., description="Dictionary of limit_type: value")


class RateLimitResponse(BaseModel):
    """Response with current rate limit configuration."""

    current: Dict[str, int]
    defaults: Dict[str, int]
    timestamp: str


@router.get("/rate-limits", response_model=RateLimitResponse)
async def get_rate_limits(request: Request, current_admin: str = Depends(optional_require_role("admin"))):
    """Get current rate limit configuration (admin only)."""
    from datetime import datetime, timezone

    config = get_rate_limit_config()

    return RateLimitResponse(
        current=config.get_all(),
        defaults=config.get_defaults(),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/rate-limits/update")
async def update_rate_limit(
    request: Request,
    update: RateLimitUpdate,
    current_admin: str = Depends(optional_require_role("admin")),
):
    """Update a single rate limit (admin only)."""
    config = get_rate_limit_config()

    if not config.set(update.limit_type, update.value):
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.CONTROL_INVALID_REQUEST,
            "Invalid limit type or value. Type must be one of: read, write, heavy, auth, teacher_import. Value must be >= 1.",
            request,
        )

    # Update runtime strings
    update_rate_limit_strings()

    logger.info(
        f"Rate limit updated: {update.limit_type}={update.value}",
        extra={
            "admin": current_admin,
            "limit_type": update.limit_type,
            "value": update.value,
        },
    )

    return {
        "success": True,
        "message": f"Rate limit '{update.limit_type}' updated to {update.value}/minute",
        "current": config.get_all(),
    }


@router.post("/rate-limits/bulk-update")
async def bulk_update_rate_limits(
    request: Request,
    bulk_update: RateLimitBulkUpdate,
    current_admin: str = Depends(optional_require_role("admin")),
):
    """Update multiple rate limits at once (admin only)."""
    config = get_rate_limit_config()

    results = config.set_multiple(bulk_update.limits)

    failed = [k for k, v in results.items() if not v]
    if failed:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.CONTROL_INVALID_REQUEST,
            f"Failed to update limits: {', '.join(failed)}. Check that types and values are valid.",
            request,
        )

    # Update runtime strings
    update_rate_limit_strings()

    logger.info(
        f"Rate limits bulk updated: {bulk_update.limits}",
        extra={
            "admin": current_admin,
            "count": len(bulk_update.limits),
        },
    )

    return {
        "success": True,
        "message": f"Updated {len(bulk_update.limits)} rate limits",
        "current": config.get_all(),
    }


@router.post("/rate-limits/reset")
async def reset_rate_limits(
    request: Request,
    current_admin: str = Depends(optional_require_role("admin")),
):
    """Reset all rate limits to defaults (admin only)."""
    config = get_rate_limit_config()

    if not config.reset_to_defaults():
        raise http_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "Failed to reset rate limits",
            request,
        )

    # Update runtime strings
    update_rate_limit_strings()

    logger.info("Rate limits reset to defaults", extra={"admin": current_admin})

    return {
        "success": True,
        "message": "All rate limits reset to defaults",
        "current": config.get_all(),
    }
