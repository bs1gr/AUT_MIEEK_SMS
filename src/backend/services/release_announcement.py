"""New-release announcement for every signed-in user (owner, 2026-10-13).

Each time a stable release newer than the installed version is published on GitHub, everyone
sees it (banner + notification bell). The server asks GitHub at most once per CHECK_INTERVAL and
shares the answer with all users, so many clients never hit GitHub's anonymous rate limit, and
clients without internet access are still told when the server has it.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional

from backend.routers.control import maintenance

CHECK_INTERVAL_SECONDS = 6 * 60 * 60
RETRY_AFTER_FAILURE_SECONDS = 30 * 60

_lock = threading.Lock()
_cache: Dict[str, Any] = {"checked_at": None, "release": None}


def _latest_release(now: float) -> Optional[Dict[str, Any]]:
    with _lock:
        checked_at = _cache["checked_at"]
        max_age = CHECK_INTERVAL_SECONDS if _cache["release"] else RETRY_AFTER_FAILURE_SECONDS
        if checked_at is None or now - checked_at >= max_age:
            _cache["release"] = maintenance._fetch_github_release(channel="stable")
            _cache["checked_at"] = now
        return _cache["release"]


def get_release_announcement(now: Optional[float] = None) -> Dict[str, Any]:
    """The latest stable release and whether it is newer than this installation."""
    release = _latest_release(time.monotonic() if now is None else now) or {}
    current = maintenance._get_version()
    latest = str(release.get("tag_name") or "").lstrip("v") or None
    return {
        "current_version": current,
        "latest_version": latest,
        "update_available": bool(latest) and maintenance._version_is_newer(latest, current),
        "release_name": release.get("name"),
        "release_url": release.get("html_url"),
    }


def reset_cache() -> None:
    """Forget the last check (tests)."""
    with _lock:
        _cache.update(checked_at=None, release=None)
