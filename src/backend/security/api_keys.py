"""API key authentication helpers for external integrations.

This module provides FastAPI dependencies to validate API keys passed via
`X-API-Key` header. Keys are read from environment variables to avoid
hardcoding secrets in code:

- EXTERNAL_API_KEY: single key value
- EXTERNAL_API_KEYS: comma-separated list of values

Security notes:
- Prefer using random, high-entropy keys (>= 32 chars)
- Rotate keys periodically
- Consider hashing keys at rest if stored in a DB
- Rate-limit endpoints protected by keys
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from starlette import status

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _load_keys() -> set[str]:
    keys: set[str] = set()
    single = (os.environ.get("EXTERNAL_API_KEY") or "").strip()
    if single:
        keys.add(single)
    many = os.environ.get("EXTERNAL_API_KEYS") or ""
    for part in many.split(","):
        val = part.strip()
        if val:
            keys.add(val)
    return keys


def is_valid_api_key(value: Optional[str]) -> bool:
    if not value:
        return False
    return value in _load_keys()


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Strict API key validator.

    Raises 403 when header missing or invalid.
    """
    if not is_valid_api_key(api_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")
    return api_key


async def verify_api_key_optional(
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[str]:
    """Optional API key validator.

    - If header missing: return None (no error)
    - If present but invalid: raise 403
    - If valid: return the key string
    """
    if api_key is None:
        return None
    if not is_valid_api_key(api_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")
    return api_key
