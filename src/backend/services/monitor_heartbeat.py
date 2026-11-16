"""The "alive and well" signal for a monitoring service outside the server.

Nothing watched the cloud host (plan todo 54). A server that has stopped cannot say so, and a
backup that failed said so only in a log and on a page. The usual answer is a dead man's
switch: the server tells a service outside, at a fixed pace, that all is well; when the signal
stops coming, the service tells a person. Any such service works (healthchecks.io, an Uptime
Kuma "push" monitor, ...): they all give an address to call.

What "all is well" means here: this process runs, its scheduler runs, the database answers and
the automatic backup is in order (services/database_backup.backup_health). When one of them
is not, the signal is withheld, and the service raises the alarm after the grace time set
there. If the service has an address for reporting a failure at once (healthchecks.io: the
ping address followed by ``/fail``), ``MONITOR_FAIL_URL`` is called instead.

Only the fact goes out. What is sent to the failure address is one of a few fixed phrases
("the database does not answer"), never an error text: that can carry host names or more.

Off unless ``MONITOR_PING_URL`` is set.
"""

from __future__ import annotations

import logging
import urllib.request
from typing import Any, Callable

from backend.config import get_settings
from backend.services import database_backup

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 10
_MIN_MINUTES = 5


def heartbeat_settings() -> tuple[str, str, int]:
    """(ping address, failure address, minutes between signals)."""
    settings = get_settings()
    ping_url = str(getattr(settings, "MONITOR_PING_URL", "") or "").strip()
    fail_url = str(getattr(settings, "MONITOR_FAIL_URL", "") or "").strip()
    try:
        minutes = int(getattr(settings, "MONITOR_PING_MINUTES", 60) or 60)
    except (TypeError, ValueError):
        minutes = 60
    return ping_url, fail_url, max(_MIN_MINUTES, minutes)


def _is_web_address(url: str) -> bool:
    return url.lower().startswith(("https://", "http://"))


def _database_answers(session_factory: Callable[[], Any]) -> bool:
    try:
        from sqlalchemy import text

        with session_factory() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("Heartbeat: the database does not answer: %s", exc)
        return False


def server_condition(session_factory: Callable[[], Any] | None = None) -> tuple[bool, str]:
    """(all is well, what is not). The second part is a short fixed phrase, see the module text."""
    factory = session_factory or database_backup.configured_session_factory()
    if factory is not None and not _database_answers(factory):
        return False, "the database does not answer"
    health = database_backup.backup_health()
    if health["status"] == "problem":
        return False, str(health["reason"])
    return True, ""


def _call(url: str, body: str | None = None) -> bool:
    """One request to the monitoring service. False when it could not be delivered."""
    try:
        data = body.encode("utf-8") if body is not None else None
        request = urllib.request.Request(  # noqa: S310 - the scheme is checked by the caller
            url,
            data=data,
            method="POST" if data is not None else "GET",
            headers={"User-Agent": "sms-heartbeat"},
        )
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:  # noqa: S310
            return 200 <= int(response.status) < 300
    except Exception as exc:
        # Not an error of this server: the alarm of the service is exactly for a signal that
        # does not arrive.
        logger.warning("Heartbeat: the monitoring service could not be reached: %s", exc)
        return False


def send_heartbeat(session_factory: Callable[[], Any] | None = None) -> dict[str, Any]:
    """Send the signal if all is well. Called by the scheduler; never raises.

    Returns what it did: ``{"status": "off" | "sent" | "not_delivered" | "withheld" |
    "reported", ...}``.
    """
    ping_url, fail_url, _minutes = heartbeat_settings()
    if not _is_web_address(ping_url):
        return {"status": "off"}

    try:
        well, reason = server_condition(session_factory)
    except Exception as exc:
        logger.warning("Heartbeat: the server could not check itself: %s", exc)
        well, reason = False, "the server could not check itself"

    if well:
        return {"status": "sent" if _call(ping_url) else "not_delivered"}

    logger.warning("Heartbeat withheld (%s): the monitoring service will raise the alarm", reason)
    if _is_web_address(fail_url):
        _call(fail_url, reason)
        return {"status": "reported", "reason": reason}
    return {"status": "withheld", "reason": reason}
