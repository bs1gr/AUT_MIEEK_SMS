"""
SocketIO WebSocket server configuration for real-time notifications

Provides:
- AsyncServer instance
- Event handlers (connect, disconnect, message)
- Authentication
- CORS configuration
- Error handling
"""

from typing import Any, Optional
import asyncio
import logging
from datetime import datetime, timezone

try:
    from socketio import AsyncServer
except ImportError:
    raise ImportError("python-socketio not installed. Run: pip install python-socketio")

import backend.models as models
from backend.config import settings
from backend.db import SessionLocal
from backend.security.current_user import decode_access_token
from backend.websocket_config import connection_manager

logger = logging.getLogger(__name__)


def _claimed_user_id(auth: Any) -> Optional[int]:
    claimed = auth.get("user_id") if isinstance(auth, dict) else None
    if isinstance(claimed, bool) or not isinstance(claimed, int) or claimed <= 0:
        return None
    return claimed


def user_id_for_connection(auth: Any) -> Optional[int]:
    """The account a Socket.IO connection may listen as, or None to refuse it.

    The client sends ``{"token": <access token>, "user_id": <id>}``. The id alone used to be
    believed and the token was never looked at, so whoever could reach /socket.io could
    register as any user.

    With authentication on, the token decides: it must be a valid access token of an active
    account that is not waiting for a password change, and that account's id is used whatever
    id was claimed. In strict mode a connection without a token is refused. Without
    authentication (AUTH_ENABLED off or AUTH_MODE=disabled) there are no accounts to tell
    apart and the claimed id is accepted, as the rest of the API accepts anonymous requests.
    """
    if not isinstance(auth, dict):
        return None

    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))
    auth_mode = str(getattr(settings, "AUTH_MODE", "disabled") or "disabled").lower()
    if not auth_enabled or auth_mode == "disabled":
        return _claimed_user_id(auth)

    token = auth.get("token")
    if not token:
        return None if auth_mode == "strict" else _claimed_user_id(auth)

    try:
        email = str(decode_access_token(str(token)).get("sub") or "")
    except Exception:
        return None
    if not email:
        return None

    with SessionLocal() as db:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None or not bool(getattr(user, "is_active", False)):
            return None
        if bool(getattr(user, "password_change_required", False)):
            return None
        return int(user.id)


# Configure SocketIO server
sio = AsyncServer(
    async_mode="asgi",  # Fixed: Use 'asgi' for FastAPI (was 'aiohttp')
    cors_allowed_origins="*",  # Configure properly for production
    logger=False,  # Disable socketio logging (use app logging instead)
    engineio_logger=False,
    ping_timeout=120,  # 2 minutes
    ping_interval=25,  # 25 seconds
    max_http_buffer_size=1e6,  # 1MB max message size
)


@sio.event
async def connect(sid, environ, auth):
    """
    Handle WebSocket connection

    Args:
        sid: Socket ID (unique session identifier)
        environ: ASGI environ dict
        auth: Authentication data from client

    Expected auth format:
        {
            "token": "jwt_token",
            "user_id": 123
        }

    Who the connection belongs to is decided by user_id_for_connection (the token, when
    authentication is on), not by the id the client claims.
    """
    try:
        # The lookup reads the database, so it runs off the event loop.
        user_id = await asyncio.to_thread(user_id_for_connection, auth)
        if user_id is None:
            logger.warning(f"Refused Socket.IO connection {sid}: no valid access token or user id")
            return False  # Reject connection

        # Register connection in connection manager
        await connection_manager.connect(user_id=user_id, session_id=sid)

        logger.info(f"WebSocket connected: user_id={user_id}, sid={sid}")
        return True

    except Exception as e:
        logger.error(f"Error in connect handler: {e}", exc_info=True)
        return False


@sio.event
async def disconnect(sid):
    """
    Handle WebSocket disconnection

    Args:
        sid: Socket ID being disconnected
    """
    try:
        # Find user_id for this session
        if sid in connection_manager.session_map:
            connection = connection_manager.session_map[sid]
            user_id = connection.user_id

            # Unregister connection
            await connection_manager.disconnect(user_id=user_id, session_id=sid)
            logger.info(f"WebSocket disconnected: user_id={user_id}, sid={sid}")
        else:
            logger.debug(f"Disconnect for unknown session: {sid}")

    except Exception as e:
        logger.error(f"Error in disconnect handler: {e}", exc_info=True)


@sio.event
async def message(sid, data):
    """
    Handle incoming message (for testing/debugging)

    Args:
        sid: Socket ID of sender
        data: Message data from client

    Expected data format:
        {
            "type": "notification_ack" | "ping" | etc,
            "payload": {...}
        }
    """
    try:
        if not isinstance(data, dict):
            logger.warning(f"Invalid message format from {sid}: {type(data)}")
            return

        msg_type = data.get("type", "unknown")
        logger.debug(f"Message from {sid}: type={msg_type}")

        # Handle different message types
        if msg_type == "ping":
            # Send heartbeat response
            await sio.emit("pong", {"timestamp": datetime.now(timezone.utc).isoformat()}, to=sid)

        elif msg_type == "notification_ack":
            # Acknowledge notification receipt
            notification_id = data.get("notification_id")
            logger.debug(f"Notification ack from {sid}: notification_id={notification_id}")

        else:
            logger.debug(f"Unknown message type from {sid}: {msg_type}")

    except Exception as e:
        logger.error(f"Error in message handler: {e}", exc_info=True)


@sio.event
async def heartbeat(sid):
    """
    Handle client heartbeat for connection health

    Args:
        sid: Socket ID sending heartbeat
    """
    try:
        connection_manager.update_heartbeat(sid)
        await sio.emit("heartbeat_ack", {"timestamp": datetime.now(timezone.utc).isoformat()}, to=sid)

    except Exception as e:
        logger.error(f"Error in heartbeat handler: {e}", exc_info=True)


async def broadcast_notification(
    user_ids: list,
    title: str,
    body: str,
    notification_type: str = "info",
    icon: Optional[str] = None,
    action_url: Optional[str] = None,
):
    """
    Broadcast a notification to specific users via WebSocket

    Args:
        user_ids: List of user IDs to notify
        title: Notification title
        body: Notification body
        notification_type: Type of notification (info, warning, error, success)
        icon: Optional icon URL
        action_url: Optional action URL

    Emits to clients:
        {
            "id": notification_id,
            "title": title,
            "body": body,
            "type": notification_type,
            "icon": icon,
            "action_url": action_url,
            "timestamp": ISO8601 timestamp
        }
    """
    try:
        notification_data = {
            "title": title,
            "body": body,
            "type": notification_type,
            "icon": icon,
            "action_url": action_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Send to each user's connections
        for user_id in user_ids:
            # Get all sessions for this user
            sessions = connection_manager.active_connections.get(user_id, set())

            for session_id in sessions:
                try:
                    await sio.emit("notification", notification_data, to=session_id)
                except Exception as e:
                    logger.error(f"Failed to send notification to {user_id}/{session_id}: {e}")

        logger.info(f"Broadcast notification to {len(user_ids)} users: {title}")

    except Exception as e:
        logger.error(f"Error in broadcast_notification: {e}", exc_info=True)


async def send_notification_to_user(
    user_id: int,
    title: str,
    body: str,
    notification_type: str = "info",
    icon: Optional[str] = None,
    action_url: Optional[str] = None,
):
    """
    Send notification to a single user

    Args:
        user_id: User ID to notify
        title: Notification title
        body: Notification body
        notification_type: Type of notification
        icon: Optional icon URL
        action_url: Optional action URL
    """
    await broadcast_notification(
        user_ids=[user_id],
        title=title,
        body=body,
        notification_type=notification_type,
        icon=icon,
        action_url=action_url,
    )


async def broadcast_to_room(
    room_name: str,
    title: str,
    body: str,
    notification_type: str = "info",
    icon: Optional[str] = None,
    action_url: Optional[str] = None,
):
    """
    Broadcast notification to all users in a room (e.g., course_123)

    Args:
        room_name: Room name (e.g., "course_123", "class_A")
        title: Notification title
        body: Notification body
        notification_type: Type of notification
        icon: Optional icon URL
        action_url: Optional action URL
    """
    try:
        room_users = connection_manager.get_room_users(room_name)

        if room_users:
            await broadcast_notification(
                user_ids=list(room_users),
                title=title,
                body=body,
                notification_type=notification_type,
                icon=icon,
                action_url=action_url,
            )
            logger.info(f"Broadcast to room {room_name}: {len(room_users)} users")
        else:
            logger.debug(f"No users in room {room_name}")

    except Exception as e:
        logger.error(f"Error in broadcast_to_room: {e}", exc_info=True)


async def cleanup_stale_connections(timeout_seconds: int = 300):
    """
    Cleanup stale WebSocket connections

    Args:
        timeout_seconds: Timeout in seconds (default 5 minutes)
    """
    try:
        stale_sessions = connection_manager.get_stale_sessions(timeout_seconds)

        for session_id in stale_sessions:
            try:
                await sio.disconnect(session_id)
                logger.info(f"Disconnected stale session: {session_id}")
            except Exception as e:
                logger.error(f"Error disconnecting stale session {session_id}: {e}")

        if stale_sessions:
            logger.info(f"Cleaned up {len(stale_sessions)} stale connections")

    except Exception as e:
        logger.error(f"Error in cleanup_stale_connections: {e}", exc_info=True)


# Export for use in other modules
__all__ = [
    "sio",
    "broadcast_notification",
    "send_notification_to_user",
    "broadcast_to_room",
    "cleanup_stale_connections",
]
