"""Opt-in settings for a database that is far away (tens of milliseconds per round trip).

At home the database answers in under a millisecond, so nobody notices that a request spends
several round trips before it runs its first real query. On the cloud host (plan todo 44) the
QNAP is about 65 ms away and those round trips are most of a page's loading time:

    connection test (pre-ping)      1 round trip
    BEGIN                           1
    ROLLBACK when the session ends  1
    user's permissions              2-4

Each switch below removes one of them. All are OFF unless their environment variable is set, so
installs that do not ask for them behave exactly as before.

``DB_PRE_PING_IDLE_SECONDS``  (float, default 0 = test every time)
    Test a pooled connection only when it has been idle for longer than this. A page sends its
    requests within a second or two of each other; testing the connection again for each one
    buys nothing. A connection that was fine a few seconds ago can still have died, in which
    case that one request fails and the next gets a fresh connection.

``DB_AUTOCOMMIT_READS``  (bool, default off)
    Run GET/HEAD/OPTIONS requests without a transaction (no BEGIN, no ROLLBACK). PostgreSQL's
    default READ COMMITTED level already gives every statement its own snapshot, so reads see
    the same data either way. The difference is for a read request that also writes: each of
    its statements is then committed by itself and a later error does not undo it.

``PERMISSION_CACHE_TTL_SECONDS``  (float, default 0 = off) lives in backend.permission_cache.
"""

from __future__ import annotations

import logging
import os
import time

from sqlalchemy import event
from sqlalchemy import exc as sa_exc

logger = logging.getLogger(__name__)

READ_ONLY_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
_LAST_USED = "sms_last_used"


def _float_env(name: str) -> float:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return 0.0
    try:
        return max(0.0, float(raw))
    except ValueError:
        logger.warning("%s=%r is not a number; ignoring it", name, raw)
        return 0.0


def pre_ping_idle_seconds() -> float:
    return _float_env("DB_PRE_PING_IDLE_SECONDS")


def autocommit_reads_enabled() -> bool:
    return (os.environ.get("DB_AUTOCOMMIT_READS") or "").strip().lower() in {"1", "true", "yes", "on"}


def install_idle_pre_ping(engine, idle_seconds: float) -> None:
    """Replace "test on every checkout" with "test after ``idle_seconds`` of disuse".

    The engine must have been created with ``pool_pre_ping=False``. A failed test raises
    DisconnectionError, which makes the pool discard the connection and try another, exactly
    as the built-in pre-ping does.
    """

    @event.listens_for(engine, "connect")
    def _fresh(dbapi_connection, connection_record):  # pragma: no cover - trivial
        connection_record.info[_LAST_USED] = time.monotonic()

    @event.listens_for(engine, "checkin")
    def _returned(dbapi_connection, connection_record):
        connection_record.info[_LAST_USED] = time.monotonic()

    @event.listens_for(engine, "checkout")
    def _test_if_idle(dbapi_connection, connection_record, connection_proxy):
        last_used = connection_record.info.get(_LAST_USED)
        if last_used is not None and time.monotonic() - last_used < idle_seconds:
            return
        try:
            alive = engine.dialect.do_ping(dbapi_connection)
        except Exception as exc:
            raise sa_exc.DisconnectionError("pooled connection failed its idle test") from exc
        if not alive:
            raise sa_exc.DisconnectionError("pooled connection failed its idle test")


def session_bind_for(request, engine, autocommit_engine):
    """The engine a request's session should use: the transaction-less one for plain reads."""
    if autocommit_engine is None or request is None:
        return engine
    method = (getattr(request, "method", "") or "").upper()
    return autocommit_engine if method in READ_ONLY_METHODS else engine
