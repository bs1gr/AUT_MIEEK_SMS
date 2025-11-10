"""
Simple in-memory cache for API responses
Provides time-based caching with LRU eviction policy
"""

from functools import wraps
from time import time
from typing import Callable, Any, Optional
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


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


# Convenience function for clearing all caches
def clear_all_caches() -> None:
    """Clear all global caches."""
    response_cache.clear()
    logger.info("All caches cleared")
