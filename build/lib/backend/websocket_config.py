"""
WebSocket Configuration & Connection Manager for Real-Time Notifications

This module handles:
- WebSocket server initialization
- Client connection management
- User tracking and authentication
- Room-based broadcasting
- Reconnection handling
"""

from typing import Dict, Set, Any
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@dataclass
class ClientConnection:
    """Represents a connected WebSocket client"""

    user_id: int
    session_id: str
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_heartbeat: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def update_heartbeat(self) -> None:
        """Update the last heartbeat timestamp"""
        self.last_heartbeat = datetime.now(timezone.utc)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time notifications.

    Features:
    - Track active user connections
    - Support multiple connections per user (different tabs/devices)
    - Broadcast messages to specific users
    - Handle connection lifecycle (connect/disconnect)
    - Support room-based messaging (e.g., 'course_123')
    """

    def __init__(self) -> None:
        """Initialize the connection manager"""
        # Map of user_id -> Set of session_ids
        self.active_connections: Dict[int, Set[str]] = {}
        # Map of session_id -> ClientConnection
        self.session_map: Dict[str, ClientConnection] = {}
        # Map of room_name -> Set of user_ids
        self.rooms: Dict[str, Set[int]] = {}

    async def connect(self, user_id: int, session_id: str) -> ClientConnection:
        """
        Register a new WebSocket connection.

        Args:
            user_id: The ID of the connected user
            session_id: Unique session identifier

        Returns:
            ClientConnection: The new connection object
        """
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(session_id)
        connection = ClientConnection(user_id=user_id, session_id=session_id)
        self.session_map[session_id] = connection

        logger.info(
            f"User {user_id} connected (session: {session_id}). Total connections: {self.get_connection_count()}"
        )
        return connection

    async def disconnect(self, user_id: int, session_id: str) -> None:
        """
        Unregister a WebSocket connection.

        Args:
            user_id: The ID of the disconnected user
            session_id: The session identifier
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(session_id)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} fully disconnected")

        if session_id in self.session_map:
            del self.session_map[session_id]

        logger.info(f"Session {session_id} disconnected. Total connections: {self.get_connection_count()}")

    def get_user_connections(self, user_id: int) -> int:
        """
        Get the number of active connections for a user.

        Args:
            user_id: The user ID

        Returns:
            int: Number of active connections
        """
        return len(self.active_connections.get(user_id, set()))

    def is_user_online(self, user_id: int) -> bool:
        """
        Check if a user has any active connections.

        Args:
            user_id: The user ID

        Returns:
            bool: True if user is online
        """
        return user_id in self.active_connections

    def get_connection_count(self) -> int:
        """
        Get total number of active connections.

        Returns:
            int: Total active connection count
        """
        return len(self.session_map)

    def get_online_users(self) -> Set[int]:
        """
        Get set of all online user IDs.

        Returns:
            Set[int]: Set of online user IDs
        """
        return set(self.active_connections.keys())

    async def join_room(self, user_id: int, room_name: str) -> None:
        """
        Add a user to a room for room-based broadcasting.

        Args:
            user_id: The user ID
            room_name: Name of the room (e.g., 'course_123')
        """
        if room_name not in self.rooms:
            self.rooms[room_name] = set()
        self.rooms[room_name].add(user_id)
        logger.debug(f"User {user_id} joined room {room_name}")

    async def leave_room(self, user_id: int, room_name: str) -> None:
        """
        Remove a user from a room.

        Args:
            user_id: The user ID
            room_name: Name of the room
        """
        if room_name in self.rooms:
            self.rooms[room_name].discard(user_id)
            if not self.rooms[room_name]:
                del self.rooms[room_name]
        logger.debug(f"User {user_id} left room {room_name}")

    def get_room_users(self, room_name: str) -> Set[int]:
        """
        Get all users in a specific room.

        Args:
            room_name: Name of the room

        Returns:
            Set[int]: Set of user IDs in the room
        """
        return self.rooms.get(room_name, set())

    def update_heartbeat(self, session_id: str) -> None:
        """
        Update the heartbeat for a session.

        Args:
            session_id: The session identifier
        """
        if session_id in self.session_map:
            self.session_map[session_id].update_heartbeat()

    def get_stale_sessions(self, timeout_seconds: int = 300) -> Set[str]:
        """
        Get sessions that have not sent heartbeat within timeout.

        Args:
            timeout_seconds: Timeout in seconds (default: 5 minutes)

        Returns:
            Set[str]: Set of stale session IDs
        """
        now = datetime.now(timezone.utc)
        stale = set()
        for session_id, connection in self.session_map.items():
            # Ensure last_heartbeat is timezone-aware to prevent TypeError with naive datetimes
            last_heartbeat = connection.last_heartbeat
            if last_heartbeat.tzinfo is None:
                last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)

            elapsed = (now - last_heartbeat).total_seconds()
            if elapsed > timeout_seconds:
                stale.add(session_id)
        return stale

    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about active connections.

        Returns:
            Dict: Connection statistics
        """
        return {
            "total_connections": self.get_connection_count(),
            "online_users": len(self.get_online_users()),
            "rooms": len(self.rooms),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global connection manager instance
connection_manager = ConnectionManager()
