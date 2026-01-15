"""
Rate Limiting Utilities
Provides decorators and helpers for applying rate limits to API endpoints.
Supports dynamic configuration via backend/rate_limit_config.py
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


def _get_dynamic_limits():
    """Get rate limits from config manager with env var overrides."""
    try:
        from backend.rate_limit_config import get_rate_limit_config

        config = get_rate_limit_config()

        # Check environment variables first (for deployment-time overrides)
        # then fall back to persistent config
        read_limit = int(os.environ.get("RATE_LIMIT_READ_PER_MINUTE", config.get("read")))
        write_limit = int(os.environ.get("RATE_LIMIT_WRITE_PER_MINUTE", config.get("write")))
        heavy_limit = int(os.environ.get("RATE_LIMIT_HEAVY_PER_MINUTE", config.get("heavy")))
        auth_limit = int(os.environ.get("RATE_LIMIT_AUTH_PER_MINUTE", config.get("auth")))
        import_limit = int(os.environ.get("RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE", config.get("teacher_import")))

        return {
            "read": read_limit,
            "write": write_limit,
            "heavy": heavy_limit,
            "auth": auth_limit,
            "teacher_import": import_limit,
        }
    except Exception:
        # Fallback to hardcoded defaults if config manager fails
        return {
            "read": int(os.environ.get("RATE_LIMIT_READ_PER_MINUTE", 1000)),
            "write": int(os.environ.get("RATE_LIMIT_WRITE_PER_MINUTE", 500)),
            "heavy": int(os.environ.get("RATE_LIMIT_HEAVY_PER_MINUTE", 200)),
            "auth": int(os.environ.get("RATE_LIMIT_AUTH_PER_MINUTE", 120)),
            "teacher_import": int(os.environ.get("RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE", 5000)),
        }


# Get initial limits
_limits = _get_dynamic_limits()
_DEFAULT_READ = _limits["read"]
_DEFAULT_WRITE = _limits["write"]
_DEFAULT_HEAVY = _limits["heavy"]
_DEFAULT_AUTH = _limits["auth"]
_DEFAULT_TEACHER_IMPORT = _limits["teacher_import"]

# Exported strings expected across the codebase/tests
RATE_LIMIT_READ = f"{_DEFAULT_READ}/minute"
RATE_LIMIT_WRITE = f"{_DEFAULT_WRITE}/minute"
RATE_LIMIT_HEAVY = f"{_DEFAULT_HEAVY}/minute"
RATE_LIMIT_AUTH = f"{_DEFAULT_AUTH}/minute"
RATE_LIMIT_TEACHER_IMPORT = f"{_DEFAULT_TEACHER_IMPORT}/minute"


# Function to update rate limit strings at runtime
def update_rate_limit_strings():
    """Update exported rate limit strings (called by config endpoint after changes)."""
    global RATE_LIMIT_READ, RATE_LIMIT_WRITE, RATE_LIMIT_HEAVY, RATE_LIMIT_AUTH, RATE_LIMIT_TEACHER_IMPORT
    global _DEFAULT_READ, _DEFAULT_WRITE, _DEFAULT_HEAVY, _DEFAULT_AUTH, _DEFAULT_TEACHER_IMPORT

    _limits = _get_dynamic_limits()
    _DEFAULT_READ = _limits["read"]
    _DEFAULT_WRITE = _limits["write"]
    _DEFAULT_HEAVY = _limits["heavy"]
    _DEFAULT_AUTH = _limits["auth"]
    _DEFAULT_TEACHER_IMPORT = _limits["teacher_import"]

    RATE_LIMIT_READ = f"{_DEFAULT_READ}/minute"
    RATE_LIMIT_WRITE = f"{_DEFAULT_WRITE}/minute"
    RATE_LIMIT_HEAVY = f"{_DEFAULT_HEAVY}/minute"
    RATE_LIMIT_AUTH = f"{_DEFAULT_AUTH}/minute"
    RATE_LIMIT_TEACHER_IMPORT = f"{_DEFAULT_TEACHER_IMPORT}/minute"


# Quick helpers so tests and docs can parse numeric value if required
def _limit_value(limit_str: str) -> int:
    """Return numeric portion for a "<n>/minute" formatted limit."""
    try:
        return int(limit_str.split("/")[0])
    except Exception:
        raise ValueError("Invalid rate limit format, expected '<n>/minute'")


# Backwards-compat: attach helper to module so tests/tools can import
DEFAULTS = {
    "read": _DEFAULT_READ,
    "write": _DEFAULT_WRITE,
    "heavy": _DEFAULT_HEAVY,
    "auth": _DEFAULT_AUTH,
    "teacher_import": _DEFAULT_TEACHER_IMPORT,
}
