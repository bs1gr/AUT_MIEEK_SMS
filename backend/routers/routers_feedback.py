"""
Feedback API Router
Allows users to submit feedback or suggestions (anonymous or authenticated).
"""

from fastapi import APIRouter, Request, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from backend.db import get_session
from backend.models import AuditLog
from backend.schemas.users import UserResponse
from backend.routers.routers_auth import optional_require_role
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
import logging

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback"])
logger = logging.getLogger(__name__)


@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_WRITE)
async def submit_feedback(
    request: Request,
    db: Session = Depends(get_session),
    user: UserResponse = Depends(optional_require_role()),
):
    data = await request.json()
    feedback = data.get("feedback", "").strip()
    if not feedback:
        return JSONResponse({"detail": "Feedback is required."}, status_code=400)

    # Log feedback in AuditLog for traceability
    audit = AuditLog(
        action="feedback",
        resource="feedback",
        resource_id=None,
        user_id=getattr(user, "id", None),
        user_email=getattr(user, "email", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"feedback": feedback},
        success=True,
    )
    db.add(audit)
    db.commit()
    from backend.logging_config import safe_log_context

    logger.info(
        "Feedback submitted",
        extra=safe_log_context(
            user_id=getattr(user, "id", None),
            feedback_length=len(feedback),
        ),
    )
    return {"status": "ok"}
