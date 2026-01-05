"""
Notification API endpoints.
Handles getting, managing, and broadcasting notifications.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from backend.dependencies import get_db, optional_require_role
from backend.rate_limiting import limiter, RATE_LIMIT_READ, RATE_LIMIT_WRITE
from backend.schemas import (
    NotificationListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    NotificationUpdate,
    BroadcastNotificationCreate,
)
from backend.services.notification_service import NotificationService, NotificationPreferenceService
from backend.services.websocket_manager import manager, broadcast_notification
from backend.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


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
    from backend.security.jwt import decode_token

    user_id = None
    try:
        # Verify token
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
            return

        payload = decode_token(token)
        user_id = payload.get("sub")

        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        # Convert sub to int if it's a string
        user_id = int(user_id)

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


# ==================== Notification Management ====================


@router.get("/", response_model=NotificationListResponse)
@limiter.limit(RATE_LIMIT_READ)
async def get_notifications(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
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

    user_id = current_user.get("user_id")

    notifications, total = NotificationService.get_notifications(
        db, user_id=user_id, skip=skip, limit=limit, unread_only=unread_only
    )

    unread_count = NotificationService.get_unread_count(db, user_id)

    return NotificationListResponse(
        total=total,
        unread_count=unread_count,
        items=[NotificationResponse.model_validate(n) for n in notifications],
    )


@router.get("/unread-count", response_model=dict)
@limiter.limit(RATE_LIMIT_READ)
async def get_unread_count(
    request: Request,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Get count of unread notifications for current user.

    Returns:
        Dictionary with unread_count
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")
    count = NotificationService.get_unread_count(db, user_id)

    return {"unread_count": count}


@router.put("/{notification_id}", response_model=NotificationResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def update_notification(
    request: Request,
    notification_id: int,
    update: NotificationUpdate,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Mark notification as read/unread.

    Path Parameters:
        notification_id: ID of notification to update

    Returns:
        Updated NotificationResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")

    if update.is_read:
        notification = NotificationService.mark_as_read(db, notification_id, user_id)
    else:
        # For now, we only support marking as read
        from backend.models import Notification

        notification = db.query(Notification).filter(Notification.id == notification_id).first()

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
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Mark a notification as read.

    Path Parameters:
        notification_id: ID of notification to mark as read

    Returns:
        Updated NotificationResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")

    notification = NotificationService.mark_as_read(db, notification_id, user_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    return NotificationResponse.model_validate(notification)


@router.post("/read-all", response_model=dict)
@limiter.limit(RATE_LIMIT_WRITE)
async def mark_all_as_read(
    request: Request,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for current user.

    Returns:
        Dictionary with count of marked notifications
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")
    count = NotificationService.mark_all_as_read(db, user_id)

    return {"marked_count": count}


@router.delete("/{notification_id}")
@limiter.limit(RATE_LIMIT_WRITE)
async def delete_notification(
    request: Request,
    notification_id: int,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Delete a notification.

    Path Parameters:
        notification_id: ID of notification to delete

    Returns:
        Success message
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")

    success = NotificationService.delete_notification(db, notification_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"detail": "Notification deleted successfully"}


# ==================== Notification Preferences ====================


@router.get("/preferences", response_model=NotificationPreferenceResponse)
@limiter.limit(RATE_LIMIT_READ)
async def get_preferences(
    request: Request,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Get notification preferences for current user.

    Returns:
        NotificationPreferenceResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")
    prefs = NotificationPreferenceService.get_or_create_preferences(db, user_id)

    return NotificationPreferenceResponse.model_validate(prefs)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def update_preferences(
    request: Request,
    updates: NotificationPreferenceUpdate,
    current_user: dict = Depends(optional_require_role("user")),
    db: Session = Depends(get_db),
):
    """Update notification preferences for current user.

    Returns:
        Updated NotificationPreferenceResponse
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = current_user.get("user_id")

    # Convert to dict and remove None values
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}

    prefs = NotificationPreferenceService.update_preferences(db, user_id, update_dict)

    return NotificationPreferenceResponse.model_validate(prefs)


# ==================== Admin Broadcast ====================


@router.post("/broadcast", response_model=dict)
@limiter.limit(RATE_LIMIT_WRITE)
async def broadcast_notification_endpoint(
    request: Request,
    broadcast: BroadcastNotificationCreate,
    current_user: dict = Depends(optional_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Broadcast a notification to users (admin only).

    Request Body:
        broadcast: BroadcastNotificationCreate with notification details

    Returns:
        Dictionary with broadcast statistics
    """
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can broadcast notifications")

    user_ids = broadcast.user_ids or []

    if not user_ids and not broadcast.role_filter:
        # Broadcast to all users
        user_ids = [u.id for u in db.query(User).filter(User.is_active).all()]
    elif broadcast.role_filter:
        # Filter by role
        user_ids = [u.id for u in db.query(User).filter(User.role == broadcast.role_filter, User.is_active).all()]

    # Create notifications in database and broadcast via WebSocket
    sent_count = 0
    for user_id in user_ids:
        try:
            # Create in database
            NotificationService.create_notification(
                db,
                user_id=user_id,
                notification_type=broadcast.notification_type,
                title=broadcast.title,
                message=broadcast.message,
                data=broadcast.data,
            )

            # Broadcast via WebSocket
            await broadcast_notification(
                user_id=user_id,
                notification_type=broadcast.notification_type,
                title=broadcast.title,
                message=broadcast.message,
                data=broadcast.data,
            )

            sent_count += 1
        except Exception as e:
            logger.error(f"Failed to broadcast to user {user_id}: {e}")

    return {
        "total_users": len(user_ids),
        "sent_count": sent_count,
        "detail": f"Notification broadcast to {sent_count} users",
    }
