"""
Feedback API Router
Allows users to submit feedback or suggestions (anonymous or authenticated).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.models import AuditLog
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter

router = APIRouter(prefix="/feedback", tags=["Feedback"])
logger = logging.getLogger(__name__)


@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_WRITE)
async def submit_feedback(
    request: Request,
    db: Session = Depends(get_session),
):
    data = await request.json()
    feedback = data.get("feedback", "").strip()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback is required.")

    # Log feedback in AuditLog for traceability (anonymous allowed)
    audit = AuditLog(
        action="feedback",
        resource="feedback",
        resource_id=None,
        user_id=None,  # Anonymous feedback
        user_email=None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"feedback": feedback},
        success=True,
    )
    db.add(audit)
    db.commit()
    from backend.logging_config import safe_log_context

    logger.info(
        "Feedback submitted (anonymous)",
        extra=safe_log_context(
            user_id=None,
            feedback_length=len(feedback),
        ),
    )
    return {"status": "ok"}
