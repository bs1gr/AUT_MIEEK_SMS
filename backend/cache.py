"""
Caching layer for SMS backend supporting both in-memory and Redis.

Configuration:
    REDIS_ENABLED=true (in .env for Redis mode)
    REDIS_HOST=redis
    REDIS_PORT=6379
    
Usage:
    from backend.cache import cached, invalidate_cache, CacheConfig
    
    @router.get("/students")
    @cached(ttl=CacheConfig.STUDENTS_LIST)
    async def list_students():
        return {"data": []}
"""

import hashlib
import json
import logging
import os
from functools import wraps
from time import time
from typing import Any, Callable, Optional, cast
from datetime import timedelta

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class CacheConfig:
    """Cache TTL configuration by endpoint"""
    STUDENTS_LIST = timedelta(minutes=5)
    STUDENT_DETAIL = timedelta(minutes=10)
    COURSES_LIST = timedelta(minutes=5)
    COURSE_DETAIL = timedelta(minutes=10)
    GRADES_STATS = timedelta(minutes=15)
    ATTENDANCE_SUMMARY = timedelta(minutes=30)
    HEALTH_CHECK = timedelta(seconds=30)


class TimedLRUCache:
    """
    Time-based LRU cache that expires entries after a specified duration.
    Thread-safe for simple use cases.
    """

    def __init__(self, maxsize: int = 128, ttl_seconds: int = 300):
        """
        Initialize cache with maximum size and time-to-live.

        Args:
            maxsize: Maximum number of cached entries
            ttl_seconds: Time in seconds before cache entries expire
        """
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[Any, float]] = {}
        self._access_times: dict[str, float] = {}

    def _make_key(self, *args: Any, **kwargs: Any) -> str:
        """Create a unique cache key from function arguments."""
        key_data = {"args": args, "kwargs": kwargs}
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value if it exists and hasn't expired."""
        if key not in self._cache:
            return None

        value, timestamp = self._cache[key]
        if time() - timestamp > self.ttl_seconds:
            # Expired, remove it
            del self._cache[key]
            if key in self._access_times:
                del self._access_times[key]
            return None

        # Update access time for LRU
        self._access_times[key] = time()
        return value

    def set(self, key: str, value: Any) -> None:
        """Store value in cache with current timestamp."""
        # Evict oldest if at capacity
        if len(self._cache) >= self.maxsize and key not in self._cache:
            # Find least recently accessed
            if self._access_times:
                oldest_key = min(self._access_times, key=self._access_times.get)  # type: ignore
                del self._cache[oldest_key]
                del self._access_times[oldest_key]

        self._cache[key] = (value, time())
        self._access_times[key] = time()

    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
        self._access_times.clear()

    def stats(self) -> dict[str, Any]:
        """Return cache statistics."""
        return {
            "size": len(self._cache),
            "maxsize": self.maxsize,
            "ttl_seconds": self.ttl_seconds,
        }


# Global cache instance (can be replaced with Redis in production)
response_cache = TimedLRUCache(maxsize=256, ttl_seconds=300)


def cached_response(ttl_seconds: int = 300, maxsize: int = 128):
    """
    Decorator to cache function responses for specified duration.

    Usage:
        @cached_response(ttl_seconds=300)
        def my_expensive_function(arg1, arg2):
            # ... expensive computation
            return result

    Args:
        ttl_seconds: Time in seconds before cache expires (default: 300)
        maxsize: Maximum number of cached entries (default: 128)
    """

    def decorator(func: Callable) -> Callable:
        cache = TimedLRUCache(maxsize=maxsize, ttl_seconds=ttl_seconds)

        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Create cache key
            cache_key = cache._make_key(*args, **kwargs)

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT for {func.__name__}")
                return cached_value

            # Cache miss - execute function
            logger.debug(f"Cache MISS for {func.__name__}")
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result)

            return result

        # Add cache control methods
        wrapper.cache_clear = cache.clear  # type: ignore
        wrapper.cache_stats = cache.stats  # type: ignore

        return wrapper

    return decorator


class RedisCache:
    """Redis caching client with fallback to in-memory cache"""

    def __init__(self):
        self.enabled = (
            os.getenv('REDIS_ENABLED', 'false').lower() == 'true'
            and REDIS_AVAILABLE
        )
        self.client: Optional[redis.Redis] = None
        self.fallback_cache = TimedLRUCache(maxsize=256, ttl_seconds=300)

        if self.enabled:
            try:
                self.client = redis.Redis(
                    host=os.getenv('REDIS_HOST', 'localhost'),
                    port=int(os.getenv('REDIS_PORT', 6379)),
                    db=0,
                    decode_responses=True,
                    socket_connect_timeout=5,
                )
                self.client.ping()
                logger.info("✅ Redis cache initialized")
            except Exception as e:
                logger.warning(f"⚠️ Redis unavailable: {e}. Using in-memory cache.")
                self.enabled = False

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.enabled and self.client:
                value = self.client.get(key)
                if value:
                    logger.debug(f"Cache HIT: {key}")
                    # Type cast to satisfy mypy - Redis get() returns bytes|None
                    return json.loads(str(value.decode('utf-8') if isinstance(value, bytes) else value))
            else:
                return self.fallback_cache.get(key)
        except Exception as e:
            logger.warning(f"Cache get error for {key}: {e}")
        return None

    def set(self, key: str, value: Any, ttl: timedelta) -> bool:
        """Set value in cache"""
        try:
            if self.enabled and self.client:
                serialized = json.dumps(value, default=str)
                self.client.setex(key, int(ttl.total_seconds()), serialized)
                logger.debug(f"Cache SET: {key}")
                return True
            else:
                self.fallback_cache.set(key, value)
                return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
        return False

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if self.enabled and self.client:
                self.client.delete(key)
            else:
                if key in self.fallback_cache._cache:
                    del self.fallback_cache._cache[key]
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
        return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate keys matching pattern"""
        try:
            if self.enabled and self.client:
                keys = list(self.client.scan_iter(match=pattern))
                if keys:
                    # Explicitly cast for mypy - Redis.delete() returns int
                    return cast(int, self.client.delete(*keys))
            logger.debug(f"Cache INVALIDATE: {pattern}")
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")
        return 0

    def health_check(self) -> dict:
        """Check cache health"""
        if not self.enabled or not self.client:
            return {"status": "in-memory", "type": "fallback"}

        try:
            self.client.ping()
            return {"status": "healthy", "type": "redis"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


# Global cache instance
redis_cache = RedisCache()


def cache_key(*parts) -> str:
    """Generate cache key from parts"""
    return ":".join(str(p) for p in parts)


def cached_async(
    ttl: timedelta = timedelta(minutes=5),
    key_builder: Optional[Callable] = None
):
    """Decorator for caching async function results"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if key_builder:
                key = key_builder(*args, **kwargs)
            else:
                key_parts = [func.__name__] + list(args)
                key_parts.extend(f"{k}={v}" for k, v in kwargs.items())
                key = cache_key(*key_parts)

            cached_value = redis_cache.get(key)
            if cached_value is not None:
                return cached_value

            result = await func(*args, **kwargs)
            redis_cache.set(key, result, ttl)
            return result

        return wrapper
    return decorator


def cached(ttl: timedelta = timedelta(minutes=5)):
    """Decorator for caching sync function results (FastAPI endpoints)
    
    Works with both Redis (if enabled) and in-memory fallback
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            key_parts = [func.__name__] + list(args)
            key_parts.extend(f"{k}={v}" for k, v in kwargs.items())
            key = cache_key(*key_parts)

            # Try cache first
            cached_value = redis_cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {key}")
                return cached_value

            # Call original function
            result = func(*args, **kwargs)

            # Cache result
            redis_cache.set(key, result, ttl)
            return result

        return wrapper
    return decorator


def invalidate_cache(*key_parts) -> int:
    """Invalidate cache by key pattern"""
    pattern = cache_key(*key_parts) + "*"
    return redis_cache.invalidate_pattern(pattern)


# Convenience function for clearing all caches
def clear_all_caches() -> None:
    """Clear all global caches."""
    response_cache.clear()
    logger.info("All caches cleared")
