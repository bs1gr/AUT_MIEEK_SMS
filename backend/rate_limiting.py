"""
Rate Limiting Utilities
Provides decorators and helpers for applying rate limits to API endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize limiter (can be imported in routers)
limiter = Limiter(key_func=get_remote_address)

# Common rate limit strings
RATE_LIMIT_READ = "60/minute"  # Read operations: 60 requests per minute
RATE_LIMIT_WRITE = "10/minute"  # Write operations: 10 requests per minute
RATE_LIMIT_HEAVY = "5/minute"   # Heavy operations (imports, exports): 5 per minute
RATE_LIMIT_AUTH = "20/minute"   # Authentication attempts: 20 per minute
