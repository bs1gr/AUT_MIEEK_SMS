"""Short-lived cache of permission decisions (opt-in, for a database that is far away).

``has_permission`` asks the database two to four questions on every request. With
``PERMISSION_CACHE_TTL_SECONDS`` set (default 0 = off), an answer is reused for that many
seconds instead.

What this trades away, and why it is bounded:
* A change made through THIS process (granting or revoking a permission, changing a role, editing
  a user) clears the whole cache at once, so it takes effect on the next request as before.
* A change made by ANOTHER process on the same database (the home install while the cloud host is
  running, or the other way round) is seen here only when the cached answer expires, so at most
  the TTL later. Keep the TTL short.
* Whether the account exists and is active is not cached: that lookup still runs on every request.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

logger = logging.getLogger(__name__)

RBAC_TABLES = frozenset({"users", "roles", "permissions", "role_permissions", "user_roles", "user_permissions"})

_lock = threading.Lock()
_entries: dict[tuple, tuple[float, bool]] = {}
_MAX_ENTRIES = 5000


def ttl_seconds() -> float:
    raw = (os.environ.get("PERMISSION_CACHE_TTL_SECONDS") or "").strip()
    if not raw:
        return 0.0
    try:
        return max(0.0, float(raw))
    except ValueError:
        logger.warning("PERMISSION_CACHE_TTL_SECONDS=%r is not a number; the cache stays off", raw)
        return 0.0


def _key(user, permission_key: str) -> tuple:
    return (getattr(user, "id", None), (getattr(user, "role", "") or "").strip().lower(), permission_key)


def get(user, permission_key: str) -> Optional[bool]:
    ttl = ttl_seconds()
    if ttl <= 0 or getattr(user, "id", None) is None:
        return None
    with _lock:
        entry = _entries.get(_key(user, permission_key))
    if entry is None:
        return None
    stored_at, allowed = entry
    if time.monotonic() - stored_at >= ttl:
        return None
    return allowed


def put(user, permission_key: str, allowed: bool) -> None:
    if ttl_seconds() <= 0 or getattr(user, "id", None) is None:
        return
    with _lock:
        if len(_entries) >= _MAX_ENTRIES:
            _entries.clear()
        _entries[_key(user, permission_key)] = (time.monotonic(), bool(allowed))


def clear() -> None:
    with _lock:
        _entries.clear()


def _touches_rbac(objects) -> bool:
    for obj in objects:
        if getattr(obj, "__tablename__", None) in RBAC_TABLES:
            return True
    return False


def install_invalidation(session_factory) -> None:
    """Clear the cache whenever a session of ``session_factory`` writes to an RBAC table."""
    from sqlalchemy import event

    @event.listens_for(session_factory, "after_flush")
    def _after_flush(session, flush_context):
        if _touches_rbac(session.new) or _touches_rbac(session.dirty) or _touches_rbac(session.deleted):
            clear()

    @event.listens_for(session_factory, "do_orm_execute")
    def _bulk_write(execute_state):
        # query.update() / query.delete() and Core-style ORM DML never reach after_flush.
        if not (execute_state.is_update or execute_state.is_delete or execute_state.is_insert):
            return
        mapper = execute_state.bind_mapper
        table = getattr(getattr(mapper, "local_table", None), "name", None)
        if table in RBAC_TABLES:
            clear()
