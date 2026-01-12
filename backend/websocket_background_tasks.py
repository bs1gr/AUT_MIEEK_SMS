"""
Background tasks for WebSocket maintenance

Provides:
- Periodic cleanup of stale connections
- Connection health monitoring
- Statistics collection
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, Any

from backend.websocket_server import cleanup_stale_connections
from backend.websocket_config import connection_manager

logger = logging.getLogger(__name__)

# Global task references
cleanup_task: Optional[asyncio.Task[Any]] = None
monitoring_task: Optional[asyncio.Task[Any]] = None


async def cleanup_stale_connections_task():
    """
    Periodically cleanup stale WebSocket connections

    Runs every 60 seconds, cleans up connections older than 5 minutes
    """
    while True:
        try:
            await asyncio.sleep(60)  # Run every 60 seconds
            await cleanup_stale_connections(timeout_seconds=300)  # 5 minute timeout

        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}", exc_info=True)


async def connection_monitoring_task():
    """
    Periodically log connection statistics for monitoring

    Runs every 5 minutes, logs active connections and statistics
    """
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes

            stats = connection_manager.get_connection_stats()
            logger.info(
                f"WebSocket stats - Connections: {stats['total_connections']}, "
                f"Online Users: {stats['online_users']}, "
                f"Rooms: {stats['rooms']}"
            )

        except asyncio.CancelledError:
            logger.info("Monitoring task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in monitoring task: {e}", exc_info=True)


async def start_background_tasks():
    """Start all background maintenance tasks"""
    global cleanup_task, monitoring_task

    try:
        logger.info("Starting WebSocket background tasks")

        # Create cleanup task
        cleanup_task = asyncio.create_task(cleanup_stale_connections_task())
        logger.info("Cleanup task started")

        # Create monitoring task
        monitoring_task = asyncio.create_task(connection_monitoring_task())
        logger.info("Monitoring task started")

    except Exception as e:
        logger.error(f"Error starting background tasks: {e}", exc_info=True)
        raise


async def stop_background_tasks():
    """Stop all background maintenance tasks"""
    global cleanup_task, monitoring_task

    try:
        logger.info("Stopping WebSocket background tasks")

        # Cancel cleanup task
        if cleanup_task and not cleanup_task.done():
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Cleanup task stopped")

        # Cancel monitoring task
        if monitoring_task and not monitoring_task.done():
            monitoring_task.cancel()
            try:
                await monitoring_task
            except asyncio.CancelledError:
                pass
            logger.info("Monitoring task stopped")

        # Disconnect all remaining WebSocket clients
        logger.info("Disconnecting WebSocket clients")
        # sio.disconnect() will handle cleanup

    except Exception as e:
        logger.error(f"Error stopping background tasks: {e}", exc_info=True)


@asynccontextmanager
async def websocket_lifecycle():
    """
    Context manager for WebSocket lifecycle

    Usage in lifespan:
        async with websocket_lifecycle():
            yield
    """
    try:
        logger.info("Initializing WebSocket lifecycle")
        await start_background_tasks()
        logger.info("WebSocket lifecycle initialized")
        yield
    finally:
        logger.info("Shutting down WebSocket lifecycle")
        await stop_background_tasks()
        logger.info("WebSocket lifecycle shutdown complete")


# Export for use in lifespan
__all__ = [
    "start_background_tasks",
    "stop_background_tasks",
    "websocket_lifecycle",
    "cleanup_stale_connections_task",
    "connection_monitoring_task",
]
