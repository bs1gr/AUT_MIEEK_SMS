"""Which database SMS Lite uses: QNAP PostgreSQL when configured, otherwise a local SQLite file.

Without QNAP credentials Lite is a standalone install and uses its own SQLite file.

With QNAP credentials, Lite never falls back to a local database (owner's decision,
2026-10-05). It used to switch to local SQLite "for this session" whenever QNAP was
unreachable, logging only to debug.log; teachers then entered data that QNAP never saw and
that vanished from view once QNAP was back. Now Lite asks to retry until QNAP answers, or
quits.

Imported by the Lite entrypoint before any other backend module (the engine is created at
import time), so this module must stay free of backend imports.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote_plus

REQUIRED_KEYS = ("host", "port", "dbname", "user", "password")


class QnapUnavailable(Exception):
    """QNAP credentials exist but cannot be used: unreadable, incomplete, or the server is unreachable."""


def load_credentials(path: Path) -> dict[str, Any]:
    try:
        creds = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise QnapUnavailable(f"credentials file {path} could not be read ({exc})") from exc
    missing = [key for key in REQUIRED_KEYS if not isinstance(creds, dict) or not creds.get(key)]
    if missing:
        raise QnapUnavailable(f"credentials file {path} is missing: {', '.join(missing)}")
    return creds


def probe(creds: dict[str, Any]) -> None:
    """Open and close one connection; a short timeout so an offline NAS fails in seconds."""
    try:
        import psycopg

        with psycopg.connect(
            host=creds["host"],
            port=creds["port"],
            dbname=creds["dbname"],
            user=creds["user"],
            password=creds["password"],
            sslmode=creds.get("sslmode", "disable"),
            connect_timeout=5,
        ):
            pass
    except Exception as exc:  # psycopg raises several types; any failure means "not usable"
        raise QnapUnavailable(f"QNAP PostgreSQL at {creds['host']}:{creds['port']} is unreachable ({exc})") from exc


def postgres_url(creds: dict[str, Any]) -> str:
    return (
        f"postgresql+psycopg://{quote_plus(str(creds['user']))}:{quote_plus(str(creds['password']))}"
        f"@{creds['host']}:{creds['port']}/{quote_plus(str(creds['dbname']))}"
    )


def unavailable_message(reason: str) -> str:
    """Shown to the user (EN + EL: Lite has no language setting this early)."""
    return (
        "SMS Lite cannot use the shared QNAP database.\n"
        f"{reason}\n\n"
        "Check the network or Tailscale connection, then press Retry. SMS Lite does not start on a "
        "local database while it is set up for QNAP, so that nothing is entered where the school "
        "cannot see it.\n\n"
        "Το SMS Lite δεν μπορεί να χρησιμοποιήσει την κοινή βάση δεδομένων QNAP.\n\n"
        "Ελέγξτε το δίκτυο ή τη σύνδεση Tailscale και πατήστε «Επανάληψη». Το SMS Lite δεν ξεκινά "
        "με τοπική βάση όταν είναι ρυθμισμένο για το QNAP, ώστε να μην καταχωρούνται δεδομένα που "
        "η σχολή δεν βλέπει."
    )


def select_database(
    creds_file: Path | None,
    sqlite_url: str,
    ask_retry: Callable[[str], bool],
    probe_fn: Callable[[dict[str, Any]], None] = probe,
) -> tuple[str, str | None]:
    """Return (DATABASE_URL, POSTGRES_SSLMODE or None).

    No credentials file: the local SQLite URL. Credentials present: the QNAP URL once a
    connection succeeds; while it does not, ``ask_retry(message)`` decides whether to try
    again. Declining raises ``SystemExit``: Lite must not start on a local database.
    """
    if creds_file is None:
        return sqlite_url, None
    while True:
        try:
            creds = load_credentials(creds_file)
            probe_fn(creds)
            return postgres_url(creds), str(creds.get("sslmode", "disable"))
        except QnapUnavailable as exc:
            if not ask_retry(unavailable_message(str(exc))):
                raise SystemExit(f"SMS Lite stopped: {exc}") from exc


def windows_retry_dialog(message: str) -> bool:
    """Native Retry/Cancel box (button captions follow the Windows language). True = Retry."""
    import ctypes

    mb_retrycancel, mb_iconerror, mb_topmost, idretry = 0x5, 0x10, 0x40000, 4
    user32 = getattr(ctypes, "windll").user32  # Windows-only attribute; Lite is a Windows app
    result = user32.MessageBoxW(None, message, "SMS Lite — QNAP", mb_retrycancel | mb_iconerror | mb_topmost)
    return bool(result == idretry)
