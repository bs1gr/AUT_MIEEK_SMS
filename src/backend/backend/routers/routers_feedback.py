"""
Feedback API Router
Allows users to submit feedback or suggestions (anonymous or authenticated).
Also supports listing feedback and importing GitHub feedback entries.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.models import AuditLog
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.routers.routers_auth import optional_require_role
from backend.schemas import (
    FeedbackEntry,
    FeedbackImportRequest,
    FeedbackImportResponse,
    paginated_response,
    success_response,
)

router = APIRouter(prefix="/feedback", tags=["Feedback"])
logger = logging.getLogger(__name__)


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        cleaned = value.replace("Z", "+00:00") if isinstance(value, str) else value
        if isinstance(cleaned, str):
            return datetime.fromisoformat(cleaned)
        return None
    except ValueError:
        return None


def _resolve_source(entry: AuditLog, details: dict[str, Any]) -> str:
    if entry.action == "feedback_github":
        return "github"
    if entry.action == "feedback_archived":
        source = details.get("source")
        if source in {"app", "github"}:
            return source
        original_action = details.get("original_action")
        return "github" if original_action == "feedback_github" else "app"
    return "app"


def _to_feedback_entry(entry: AuditLog) -> FeedbackEntry:
    details = entry.details or {}
    source = _resolve_source(entry, details)
    is_github = source == "github"
    archived = entry.action == "feedback_archived" or bool(details.get("archived"))

    created_at = _parse_datetime(details.get("created_at")) if is_github else None

    return FeedbackEntry(
        id=entry.id,
        source=source,
        kind=details.get("kind") or ("feedback" if not is_github else None),
        title=details.get("title"),
        body=details.get("body") or details.get("feedback"),
        url=details.get("url"),
        author=details.get("author"),
        created_at=created_at,
        received_at=entry.timestamp,
        repository=details.get("repository"),
        metadata=details.get("metadata"),
        archived=archived,
    )


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


@router.get("/entries")
async def list_feedback_entries(
    request: Request,
    db: Session = Depends(get_session),
    source: Optional[str] = None,
    include_archived: bool = False,
    skip: int = 0,
    limit: int = 50,
    current_user: Any = Depends(optional_require_role("admin", "teacher")),
):
    _ = current_user

    base_actions = ["feedback", "feedback_github"]
    if include_archived:
        base_actions.append("feedback_archived")

    query = db.query(AuditLog).filter(AuditLog.action.in_(base_actions))

    normalized_source = (source or "").strip().lower()
    if normalized_source == "github":
        query = query.filter(AuditLog.action.in_(["feedback_github", "feedback_archived"]))
    elif normalized_source == "app":
        query = query.filter(AuditLog.action.in_(["feedback", "feedback_archived"]))

    total = query.count()
    safe_skip = max(skip, 0)
    safe_limit = max(min(limit, 200), 1)
    entries = query.order_by(AuditLog.timestamp.desc()).offset(safe_skip).limit(safe_limit).all()

    items = [_to_feedback_entry(entry).model_dump() for entry in entries]
    request_id = getattr(request.state, "request_id", "unknown")
    return paginated_response(items, total, safe_skip, safe_limit, request_id=request_id)


@router.post("/github/import", response_model=None, status_code=status.HTTP_201_CREATED)
async def import_github_feedback(
    request: Request,
    payload: FeedbackImportRequest,
    db: Session = Depends(get_session),
    current_user: Any = Depends(optional_require_role("admin", "teacher")),
):
    _ = current_user

    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No items provided.")

    audit_entries: list[AuditLog] = []
    for item in payload.items:
        details = {
            "kind": item.kind,
            "title": item.title,
            "body": item.body,
            "url": item.url,
            "author": item.author,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "repository": item.repository,
            "source_id": item.source_id,
            "metadata": item.metadata,
        }

        audit_entries.append(
            AuditLog(
                action="feedback_github",
                resource="feedback",
                resource_id=item.source_id,
                user_id=getattr(current_user, "id", None),
                user_email=getattr(current_user, "email", None),
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details=details,
                success=True,
            )
        )

    db.add_all(audit_entries)
    db.commit()

    request_id = getattr(request.state, "request_id", "unknown")
    response = FeedbackImportResponse(imported=len(audit_entries))
    return success_response(response.model_dump(), request_id=request_id)


@router.patch("/entries/{entry_id}/archive")
async def archive_feedback_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_session),
    current_user: Any = Depends(optional_require_role("admin", "teacher")),
):
    _ = current_user
    entry = db.query(AuditLog).filter(AuditLog.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback entry not found.")

    if entry.action == "feedback_archived":
        request_id = getattr(request.state, "request_id", "unknown")
        return success_response({"archived": True}, request_id=request_id)

    if entry.action not in {"feedback", "feedback_github"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entry cannot be archived.")

    details = entry.details or {}
    details["archived"] = True
    details["archived_at"] = datetime.utcnow().isoformat()
    details["original_action"] = entry.action
    details["source"] = "github" if entry.action == "feedback_github" else "app"
    entry.details = details
    entry.action = "feedback_archived"
    db.commit()

    request_id = getattr(request.state, "request_id", "unknown")
    return success_response({"archived": True}, request_id=request_id)


@router.patch("/entries/{entry_id}/unarchive")
async def unarchive_feedback_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_session),
    current_user: Any = Depends(optional_require_role("admin", "teacher")),
):
    _ = current_user
    entry = db.query(AuditLog).filter(AuditLog.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback entry not found.")

    if entry.action != "feedback_archived":
        request_id = getattr(request.state, "request_id", "unknown")
        return success_response({"archived": False}, request_id=request_id)

    details = entry.details or {}
    source = details.get("source")
    original_action = details.get("original_action")
    if original_action in {"feedback", "feedback_github"}:
        entry.action = original_action
    elif source == "github":
        entry.action = "feedback_github"
    else:
        entry.action = "feedback"

    details["archived"] = False
    entry.details = details
    db.commit()

    request_id = getattr(request.state, "request_id", "unknown")
    return success_response({"archived": False}, request_id=request_id)


@router.delete("/entries/{entry_id}")
async def delete_feedback_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_session),
    current_user: Any = Depends(optional_require_role("admin", "teacher")),
):
    _ = current_user
    entry = db.query(AuditLog).filter(AuditLog.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback entry not found.")

    if entry.action not in {"feedback", "feedback_github", "feedback_archived"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entry cannot be removed.")

    db.delete(entry)
    db.commit()

    request_id = getattr(request.state, "request_id", "unknown")
    return success_response({"deleted": True}, request_id=request_id)
