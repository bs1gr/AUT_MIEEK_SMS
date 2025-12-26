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

limiter = Limiter(
    key_func=get_remote_address, enabled=(not _testing), storage_uri="memory://"
)

# Default constants: set higher for high-throughput environments.
# These can be overridden via environment variables so deployments can
# increase or decrease limits without changing source.
# Format used by slowapi: "<count>/minute"
# NOTE: Educational tool for teachers - very generous limits for smooth classroom operation
_DEFAULT_READ = int(os.environ.get("RATE_LIMIT_READ_PER_MINUTE", 100000))
_DEFAULT_WRITE = int(os.environ.get("RATE_LIMIT_WRITE_PER_MINUTE", 50000))
_DEFAULT_HEAVY = int(os.environ.get("RATE_LIMIT_HEAVY_PER_MINUTE", 20000))
_DEFAULT_AUTH = int(os.environ.get("RATE_LIMIT_AUTH_PER_MINUTE", 5000))
# Teacher imports: very high limits to allow uninterrupted bulk operations (student lists, grade imports)
_DEFAULT_TEACHER_IMPORT = int(
    os.environ.get("RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE", 100000)
)

# Exported strings expected across the codebase/tests
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
