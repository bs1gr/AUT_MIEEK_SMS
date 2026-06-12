"""
WebSocket connection manager and notification broadcasting service.
Handles real-time notification delivery to connected clients.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasting.

    Keeps track of active connections per user and provides methods
    to broadcast notifications to specific users or all connected clients.
    """

    def __init__(self) -> None:
        """Initialize the connection manager."""
        # Map of user_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        """Register a new WebSocket connection for a user.

        Args:
            user_id: ID of the user
            websocket: The WebSocket connection object

        Raises:
            Exception: If websocket accept fails
        """
        try:
            await websocket.accept()

            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()

            self.active_connections[user_id].add(websocket)
            logger.debug(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")
        except Exception as e:
            logger.error(f"Failed to accept WebSocket connection for user {user_id}: {e}")
            raise

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        """Unregister a WebSocket connection for a user.

        Args:
            user_id: ID of the user
            websocket: The WebSocket connection object
        """
        try:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                logger.debug(f"User {user_id} disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting user {user_id}: {e}")

    async def send_personal_message(self, message: dict, websocket: WebSocket) -> None:
        """Send a message to a specific WebSocket connection.

        Args:
            message: Dictionary containing message data
            websocket: The WebSocket connection to send to
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    async def broadcast_to_user(self, user_id: int, message: dict) -> int:
        """Broadcast a message to all connections of a specific user.

        Args:
            user_id: ID of the user to broadcast to
            message: Dictionary containing message data

        Returns:
            Number of connections message was sent to
        """
        count = 0
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to send message to user {user_id}: {e}")
                    disconnected.add(connection)

            # Clean up disconnected websockets
            for connection in disconnected:
                self.active_connections[user_id].discard(connection)

        return count

    async def broadcast_to_multiple_users(self, user_ids: list[int], message: dict) -> Dict[int, int]:
        """Broadcast a message to multiple users.

        Args:
            user_ids: List of user IDs to broadcast to
            message: Dictionary containing message data

        Returns:
            Dictionary mapping user_id -> number of connections message was sent to
        """
        results = {}
        for user_id in user_ids:
            results[user_id] = await self.broadcast_to_user(user_id, message)
        return results

    async def broadcast_to_all(self, message: dict) -> int:
        """Broadcast a message to all connected clients.

        Args:
            message: Dictionary containing message data

        Returns:
            Total number of connections message was sent to
        """
        total_count = 0
        for user_id in list(self.active_connections.keys()):
            total_count += await self.broadcast_to_user(user_id, message)
        return total_count

    def get_connected_users(self) -> list[int]:
        """Get list of currently connected user IDs.

        Returns:
            List of user IDs with active connections
        """
        return list(self.active_connections.keys())

    def get_connection_count(self, user_id: Optional[int] = None) -> int:
        """Get number of active connections.

        Args:
            user_id: If provided, return count for specific user; else return total

        Returns:
            Number of active connections
        """
        if user_id is not None:
            return len(self.active_connections.get(user_id, set()))

        return sum(len(conns) for conns in self.active_connections.values())


# Global connection manager instance
manager = ConnectionManager()


async def broadcast_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[dict[str, Any]] = None,
) -> None:
    """Broadcast a notification to a user via WebSocket.

    Args:
        user_id: ID of user to notify
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        data: Additional context data

    Example:
        >>> await broadcast_notification(
        ...     user_id=123,
        ...     notification_type="grade_update",
        ...     title="Grade Posted",
        ...     message="Your grade for Exam 1 has been posted",
        ...     data={"grade": 85, "course_id": 5}
        ... )
    """
    payload: dict[str, Any] = {
        "type": notification_type,
        "title": title,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if data:
        payload["data"] = data

    await manager.broadcast_to_user(user_id, payload)


async def broadcast_system_message(title: str, message: str, data: Optional[dict[str, Any]] = None) -> int:
    """Broadcast a system message to all connected users.

    Args:
        title: Message title
        message: Message content
        data: Additional context data

    Returns:
        Total number of connections message was sent to
    """
    payload: dict[str, Any] = {
        "type": "system_message",
        "title": title,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if data:
        payload["data"] = data

    return await manager.broadcast_to_all(payload)
