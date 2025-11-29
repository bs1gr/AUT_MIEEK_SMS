"""
Rate Limiting Utilities
Provides decorators and helpers for applying rate limits to API endpoints.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize limiter without loading .env file (avoids encoding issues on Windows)
# Explicitly disable reading .env at import time by passing config with ENV_FILE=None.
# The limiter will be attached to app.state in main.py
# Disable rate limiting automatically when running under pytest to avoid
# flakiness and artificial 429s in unit tests.
_testing = bool(os.environ.get("PYTEST_CURRENT_TEST"))

limiter = Limiter(key_func=get_remote_address, enabled=(not _testing), storage_uri="memory://")

# Constants aligned with test expectations (ensuring increasing permissiveness: heavy < write < read)
RATE_LIMIT_READ = "300/minute"   # Read operations - increased for attendance calendar
RATE_LIMIT_WRITE = "200/minute"  # Write operations - increased for bulk attendance saves
RATE_LIMIT_HEAVY = "30/minute"   # Heavy operations (imports, exports) - increased for batch operations
RATE_LIMIT_AUTH = "20/minute"    # Authentication attempts (kept strict for security)
