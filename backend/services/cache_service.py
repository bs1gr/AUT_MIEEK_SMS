"""
Caching service for analytics and performance optimization.

Implements multi-layer caching:
- Layer 1: In-memory cache (FastAPI app level)
- Layer 2: Redis cache (distributed deployments)
- Layer 3: Database queries (indexed for performance)

Cache invalidation is triggered on data mutations:
- Grade creation/update/delete
- Attendance creation/update/delete
- Course updates
- Daily performance updates
"""

import logging
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional

import redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ==================== In-Memory Cache ====================

class InMemoryCache:
    """Simple in-memory cache with TTL support."""

    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        """Initialize in-memory cache.

        Args:
            default_ttl: Default time-to-live in seconds (300 = 5 minutes)
        """
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired.

        Args:
            key: Cache key

        Returns:
            Cached value if found and not expired, None otherwise
        """
        if key not in self.cache:
            return None

        value, expiration = self.cache[key]
        import time

        if time.time() > expiration:
            del self.cache[key]
            return None

        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        import time

        ttl = ttl or self.default_ttl
        self.cache[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        """Delete key from cache.

        Args:
            key: Cache key to delete
        """
        if key in self.cache:
            del self.cache[key]

    def clear(self) -> None:
        """Clear entire cache."""
        self.cache.clear()

    def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching pattern.

        Args:
            pattern: Key pattern (supports wildcards like 'analytics:student:*')
        """
        import fnmatch

        keys_to_delete = [k for k in self.cache.keys() if fnmatch.fnmatch(k, pattern)]
        for key in keys_to_delete:
            del self.cache[key]


# ==================== Redis Cache ====================


class RedisCache:
    """Redis-based distributed cache."""

    def __init__(self, url: Optional[str] = None, default_ttl: int = 900):
        """Initialize Redis cache.

        Args:
            url: Redis URL (redis://localhost:6379/0). Uses REDIS_URL env var if not provided.
            default_ttl: Default time-to-live in seconds (900 = 15 minutes)
        """
        self.enabled = os.getenv("REDIS_ENABLED", "false").lower() == "true"
        self.default_ttl = default_ttl
        self.client: Optional[redis.Redis] = None

        if self.enabled:
            try:
                redis_url = url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
                self.client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self.client.ping()
                logger.info("Redis cache connected: %s", redis_url)
            except Exception as e:
                logger.warning("Failed to connect to Redis: %s. Falling back to in-memory cache.", e)
                self.client = None
                self.enabled = False

    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache.

        Args:
            key: Cache key

        Returns:
            Cached value if found, None otherwise
        """
        if not self.enabled or not self.client:
            return None

        try:
            import json

            data = self.client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning("Redis get error for key %s: %s", key, e)
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store value in Redis cache with TTL.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time-to-live in seconds (uses default if None)
        """
        if not self.enabled or not self.client:
            return

        try:
            import json

            ttl = ttl or self.default_ttl
            self.client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning("Redis set error for key %s: %s", key, e)

    def delete(self, key: str) -> None:
        """Delete key from Redis cache.

        Args:
            key: Cache key to delete
        """
        if not self.enabled or not self.client:
            return

        try:
            self.client.delete(key)
        except Exception as e:
            logger.warning("Redis delete error for key %s: %s", key, e)

    def clear(self) -> None:
        """Clear entire Redis cache (use with caution!)."""
        if not self.enabled or not self.client:
            return

        try:
            self.client.flushdb()
        except Exception as e:
            logger.warning("Redis clear error: %s", e)

    def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching pattern.

        Args:
            pattern: Key pattern (supports wildcards like 'analytics:student:*')
        """
        if not self.enabled or not self.client:
            return

        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
        except Exception as e:
            logger.warning("Redis pattern delete error for pattern %s: %s", pattern, e)


# ==================== Unified Cache Layer ====================


class CacheManager:
    """Manages both in-memory and Redis caching with fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        """Initialize cache manager with both layers.

        Args:
            redis_url: Optional Redis URL for distributed caching
        """
        self.in_memory = InMemoryCache(default_ttl=300)  # 5 minutes
        self.redis = RedisCache(url=redis_url, default_ttl=900)  # 15 minutes

    def get(self, key: str) -> Optional[Any]:
        """Get from cache (tries in-memory first, then Redis).

        Args:
            key: Cache key

        Returns:
            Cached value if found in either layer
        """
        # Try in-memory first (fastest)
        value = self.in_memory.get(key)
        if value is not None:
            return value

        # Try Redis if enabled
        value = self.redis.get(key)
        if value is not None:
            # Populate in-memory from Redis
            self.in_memory.set(key, value, ttl=300)
            return value

        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store in both cache layers.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds
        """
        self.in_memory.set(key, value, ttl=ttl or 300)
        self.redis.set(key, value, ttl=ttl or 900)

    def delete(self, key: str) -> None:
        """Delete from all cache layers.

        Args:
            key: Cache key to delete
        """
        self.in_memory.delete(key)
        self.redis.delete(key)

    def clear(self) -> None:
        """Clear all cache layers."""
        self.in_memory.clear()
        self.redis.clear()

    def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching pattern across cache layers.

        Args:
            pattern: Key pattern (wildcards supported)
        """
        self.in_memory.delete_pattern(pattern)
        self.redis.delete_pattern(pattern)

    def invalidate_student_cache(self, student_id: int) -> None:
        """Invalidate all cache entries for a student.

        Called when student grades, attendance, or performance changes.

        Args:
            student_id: Student ID
        """
        patterns = [
            f"analytics:student:{student_id}:*",
            f"analytics:performance:*:student={student_id}",
            f"analytics:trends:*:student={student_id}",
        ]
        for pattern in patterns:
            self.delete_pattern(pattern)
        logger.debug("Invalidated student cache: student_id=%d", student_id)

    def invalidate_course_cache(self, course_id: int) -> None:
        """Invalidate all cache entries for a course.

        Called when course grades or comparison data changes.

        Args:
            course_id: Course ID
        """
        patterns = [
            f"analytics:course:{course_id}:*",
            f"analytics:comparison:*:course={course_id}",
            f"analytics:distribution:*:course={course_id}",
        ]
        for pattern in patterns:
            self.delete_pattern(pattern)
        logger.debug("Invalidated course cache: course_id=%d", course_id)


# ==================== Global Cache Instance ====================

_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get or create global cache manager instance.

    Returns:
        CacheManager instance
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager(redis_url=os.getenv("REDIS_URL"))
    return _cache_manager


# ==================== Caching Decorators ====================


def cached(ttl: int = 300, key_prefix: str = "cache"):
    """Decorator to cache function results.

    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Build cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]

            # Add numeric arguments to key
            for arg in args[1:]:  # Skip 'self' if method
                if isinstance(arg, (int, str)):
                    key_parts.append(str(arg))

            # Add keyword arguments to key
            for k, v in sorted(kwargs.items()):
                if isinstance(v, (int, str)):
                    key_parts.append(f"{k}={v}")

            cache_key = ":".join(key_parts)

            # Try to get from cache
            cache = get_cache_manager()
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug("Cache hit: %s", cache_key)
                return cached_value

            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl)
            logger.debug("Cache miss (computed): %s", cache_key)

            return result

        return wrapper

    return decorator


# ==================== Cache Invalidation Helpers ====================


def invalidate_analytics_on_grade_change(student_id: int, course_id: int) -> None:
    """Invalidate analytics cache when grades change.

    Args:
        student_id: Affected student ID
        course_id: Affected course ID
    """
    cache = get_cache_manager()
    cache.invalidate_student_cache(student_id)
    cache.invalidate_course_cache(course_id)


def invalidate_analytics_on_attendance_change(student_id: int, course_id: int) -> None:
    """Invalidate analytics cache when attendance changes.

    Args:
        student_id: Affected student ID
        course_id: Affected course ID
    """
    cache = get_cache_manager()
    cache.invalidate_student_cache(student_id)
    cache.invalidate_course_cache(course_id)


def clear_all_analytics_cache() -> None:
    """Clear all analytics-related cache (use rarely).

    Useful for manual admin operations or testing.
    """
    cache = get_cache_manager()
    cache.delete_pattern("analytics:*")
    logger.info("Cleared all analytics cache")
