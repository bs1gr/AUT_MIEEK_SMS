"""
SocketIO WebSocket server configuration for real-time notifications

Provides:
- AsyncServer instance
- Event handlers (connect, disconnect, message)
- Authentication
- CORS configuration
- Error handling
"""

from typing import Optional
import logging
from datetime import datetime

try:
    from socketio import AsyncServer
except ImportError:
    raise ImportError("python-socketio not installed. Run: pip install python-socketio[aiohttp]")

from backend.websocket_config import connection_manager

logger = logging.getLogger(__name__)

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
    """
    try:
        # Extract user ID from auth
        if not auth or "user_id" not in auth:
            logger.warning(f"Connection attempt without user_id from {sid}")
            return False  # Reject connection

        user_id = auth.get("user_id")
        if not isinstance(user_id, int) or user_id <= 0:
            logger.warning(f"Invalid user_id from {sid}: {user_id}")
            return False

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
            await sio.emit("pong", {"timestamp": datetime.utcnow().isoformat()}, to=sid)

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
        await sio.emit("heartbeat_ack", {"timestamp": datetime.utcnow().isoformat()}, to=sid)

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
            "timestamp": datetime.utcnow().isoformat(),
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
