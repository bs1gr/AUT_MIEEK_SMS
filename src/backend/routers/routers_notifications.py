"""
Notification API endpoints.
Handles getting, managing, and broadcasting notifications.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from backend.db import SessionLocal, get_session as get_db
from backend.models import User
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.security.current_user import get_current_user
from backend.schemas import (
    BroadcastNotificationCreate,
    NotificationListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    NotificationUpdate,
)
from backend.dependencies import get_notification_service
from backend.services import release_announcement
from backend.services.notification_service import NotificationPreferenceService, NotificationService
from backend.services.websocket_manager import broadcast_notification, manager
from backend.security.current_user import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ==================== Helper Functions ====================


def _get_user_id(current_user) -> int | None:
    """Extract user_id from current_user (handles both dict and SimpleNamespace)."""
    if current_user is None:
        return None
    if isinstance(current_user, dict):
        return current_user.get("user_id")
    return getattr(current_user, "id", None)


def _get_user_role(current_user) -> str | None:
    """Extract role from current_user (handles both dict and SimpleNamespace)."""
    if current_user is None:
        return None
    if isinstance(current_user, dict):
        return current_user.get("role")
    return getattr(current_user, "role", None)


def _not_yours(exc: PermissionError) -> HTTPException:
    """The service refuses another account's notification with PermissionError: that is a 403.

    Unhandled, it reached the client as a 500 with a traceback in the log (seen in November
    2026 with two real accounts; the tests gave the notification to the requesting account).
    """
    return HTTPException(status_code=403, detail=str(exc))


# ==================== Notification WebSocket ====================


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """WebSocket endpoint for real-time notifications.

    Requires authentication via JWT token in query string.

    Query Parameters:
        token: JWT authentication token

    Events:
        - Client connects → joins room for their user ID
        - Server sends notifications → client receives in real-time
        - Client disconnects → leaves room

    Example (frontend):
        const ws = new WebSocket('ws://localhost:8000/api/v1/notifications/ws?token=JWT_TOKEN');
        ws.onmessage = (event) => {
            const notification = JSON.parse(event.data);
            console.log('Notification:', notification);
        };
    """
    user_id = None
    db = None
    try:
        # Verify token
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
            return

        try:
            payload = decode_access_token(token)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        subject = payload.get("sub")
        if not subject:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        db = SessionLocal()

        # Resolve subject to a real, active user
        user = None
        try:
            if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                user = db.get(User, int(subject))
            if user is None and isinstance(subject, str):
                user = db.query(User).filter(User.email == subject).first()
        except Exception:
            user = None

        if not user or not getattr(user, "is_active", False):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or inactive")
            return

        user_id = int(user.id)

        # Connect and add to manager
        await manager.connect(user_id, websocket)
        logger.info(f"User {user_id} connected to WebSocket notifications")

        try:
            while True:
                # Keep connection alive and listen for any messages from client
                # Client can send keep-alive pings
                data = await websocket.receive_text()
                logger.debug(f"Received from user {user_id}: {data}")

        except WebSocketDisconnect:
            await manager.disconnect(user_id, websocket)
            logger.info(f"User {user_id} disconnected from WebSocket")

    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_SERVER_ERROR, reason="Internal server error")
        except Exception:
            pass
    finally:
        if db:
            try:
                db.close()
            except Exception:
                pass


# ==================== Notification Management ====================


# Put specific routes first to avoid ID matching
@router.get("/unread-count", response_model=dict)
@limiter.limit(RATE_LIMIT_READ)
async def get_unread_count(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Get count of unread notifications for current user.

    Returns:
        Dictionary with unread_count
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)
    count = service.get_unread_count(user_id)

    return {"unread_count": count}


@router.get("/release-announcement", response_model=dict)
@limiter.limit(RATE_LIMIT_READ)
async def get_release_announcement(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Whether a newer stable release is published (shown to every signed-in user)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await run_in_threadpool(release_announcement.get_release_announcement)


@router.post("/read-all", response_model=dict)
@limiter.limit(RATE_LIMIT_WRITE)
async def mark_all_as_read(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Mark all notifications as read for current user.

    Returns:
        Dictionary with count of marked notifications
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)
    count = service.mark_all_as_read(user_id)

    return {"marked_count": count}


# Preferences routes (specific paths before generic ID routes)
@router.get("/preferences", response_model=NotificationPreferenceResponse)
@limiter.limit(RATE_LIMIT_READ)
async def get_preferences(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification preferences for current user.

    Returns:
        NotificationPreferenceResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)
    prefs = NotificationPreferenceService.get_or_create_preferences(db, user_id)

    return NotificationPreferenceResponse.model_validate(prefs)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def update_preferences(
    request: Request,
    updates: NotificationPreferenceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preferences for current user.

    Returns:
        Updated NotificationPreferenceResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)

    # Convert to dict and remove None values
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}

    prefs = NotificationPreferenceService.update_preferences(db, user_id, update_dict)

    return NotificationPreferenceResponse.model_validate(prefs)


# Generic list route (after specific routes)
@router.get("/", response_model=NotificationListResponse)
@limiter.limit(RATE_LIMIT_READ)
async def get_notifications(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Get notifications for current user.

    Query Parameters:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 50, max: 100)
        unread_only: Only return unread notifications (default: false)

    Returns:
        NotificationListResponse with paginated notifications
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)

    notifications, total = service.get_notifications(user_id=user_id, skip=skip, limit=limit, unread_only=unread_only)

    unread_count = service.get_unread_count(user_id)

    return NotificationListResponse(
        total=total,
        unread_count=unread_count,
        items=[NotificationResponse.model_validate(n) for n in notifications],
    )


@router.put("/{notification_id}", response_model=NotificationResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def update_notification(
    request: Request,
    notification_id: int,
    update: NotificationUpdate,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Mark notification as read/unread.

    Path Parameters:
        notification_id: ID of notification to update

    Returns:
        Updated NotificationResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)

    if update.is_read:
        try:
            notification = service.mark_as_read(notification_id, user_id)
        except PermissionError as exc:
            raise _not_yours(exc) from exc
    else:
        # For now, we only support marking as read
        from backend.models import Notification

        notification = service.db.query(Notification).filter(Notification.id == notification_id).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update notification belonging to another user")

    return NotificationResponse.model_validate(notification)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def mark_as_read(
    request: Request,
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Mark a notification as read.

    Path Parameters:
        notification_id: ID of notification to mark as read

    Returns:
        Updated NotificationResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)

    try:
        notification = service.mark_as_read(notification_id, user_id)
    except PermissionError as exc:
        raise _not_yours(exc) from exc
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    return NotificationResponse.model_validate(notification)


@router.delete("/{notification_id}")
@limiter.limit(RATE_LIMIT_WRITE)
async def delete_notification(
    request: Request,
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Delete a notification.

    Path Parameters:
        notification_id: ID of notification to delete

    Returns:
        Success message
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = _get_user_id(current_user)

    try:
        success = service.delete_notification(notification_id, user_id)
    except PermissionError as exc:
        raise _not_yours(exc) from exc
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"detail": "Notification deleted successfully"}


# ==================== Admin Broadcast ====================


@router.post("/broadcast", response_model=dict)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("notifications:manage")
async def broadcast_notification_endpoint(
    request: Request,
    broadcast: BroadcastNotificationCreate,
    db: Session = Depends(get_db),
    service: NotificationService = Depends(get_notification_service),
    current_user: dict = Depends(get_current_user),
):
    """Broadcast a notification to users (administrators and teachers: ``notifications:manage``).

    Every copy says who sent it (``data.sender_id`` and ``data.sender_name``), and a receiver
    who switched in-app notifications off in their preferences gets no copy.

    Request Body:
        broadcast: BroadcastNotificationCreate with notification details

    Returns:
        Dictionary with broadcast statistics
    """

    user_ids = broadcast.user_ids or []

    if not user_ids and not broadcast.role_filter:
        # Broadcast to all users
        user_ids = [u.id for u in db.query(User).filter(User.is_active).all()]
    elif broadcast.role_filter:
        # Filter by role
        user_ids = [u.id for u in db.query(User).filter(User.role == broadcast.role_filter, User.is_active).all()]

    # Who sent it travels with every copy: a teacher's message to all users must not look like
    # an administrator's. The sender's id and name are set here, never taken from the body.
    sender_id = _get_user_id(current_user)
    sender = db.query(User).filter(User.id == sender_id).first() if sender_id else None
    data = dict(broadcast.data or {})
    data.pop("sender_id", None)
    data.pop("sender_name", None)
    if sender is not None:
        data["sender_id"] = sender.id
        data["sender_name"] = sender.full_name or sender.email

    # Create notifications in database and broadcast via WebSocket
    sent_count = 0
    skipped_count = 0
    for user_id in user_ids:
        try:
            if not NotificationPreferenceService.should_notify(db, user_id, broadcast.notification_type, "in_app"):
                skipped_count += 1
                continue

            # Create in database
            service.create_notification(
                user_id=user_id,
                notification_type=broadcast.notification_type,
                title=broadcast.title,
                message=broadcast.message,
                data=data or None,
            )

            # Broadcast via WebSocket
            await broadcast_notification(
                user_id=user_id,
                notification_type=broadcast.notification_type,
                title=broadcast.title,
                message=broadcast.message,
                data=data or None,
            )

            sent_count += 1
        except Exception as e:
            logger.error(f"Failed to broadcast to user {user_id}: {e}")

    return {
        "total_users": len(user_ids),
        "sent_count": sent_count,
        "skipped_count": skipped_count,
        "detail": f"Notification broadcast to {sent_count} users",
    }
