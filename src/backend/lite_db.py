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


class QnapCredentialsRejected(QnapUnavailable):
    """The server answered but refused the saved user name or password: Retry cannot help."""


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
        if "password authentication failed" in str(exc):
            raise QnapCredentialsRejected(
                f"QNAP PostgreSQL at {creds['host']}:{creds['port']} rejected the saved password for "
                f"user \"{creds['user']}\""
            ) from exc
        raise QnapUnavailable(f"QNAP PostgreSQL at {creds['host']}:{creds['port']} is unreachable ({exc})") from exc


def postgres_url(creds: dict[str, Any]) -> str:
    return (
        f"postgresql+psycopg://{quote_plus(str(creds['user']))}:{quote_plus(str(creds['password']))}"
        f"@{creds['host']}:{creds['port']}/{quote_plus(str(creds['dbname']))}"
    )


def unavailable_message(reason: str, credentials_rejected: bool = False) -> str:
    """Shown to the user (EN + EL: Lite has no language setting this early)."""
    if credentials_rejected:
        return (
            "SMS Lite cannot use the shared QNAP database.\n"
            f"{reason}.\n\n"
            "The database password has probably been changed. Run the SMS installer again on this PC "
            "and enter the current QNAP password (or choose local SQLite). Retry will not help until "
            "then.\n\n"
            "Το SMS Lite δεν μπορεί να χρησιμοποιήσει την κοινή βάση δεδομένων QNAP: η βάση απέρριψε "
            "τον αποθηκευμένο κωδικό.\n\n"
            "Πιθανότατα ο κωδικός της βάσης άλλαξε. Εκτελέστε ξανά την εγκατάσταση του SMS σε αυτόν τον "
            "υπολογιστή και δώστε τον τρέχοντα κωδικό του QNAP (ή επιλέξτε τοπική SQLite). Η «Επανάληψη» "
            "δεν θα βοηθήσει μέχρι τότε."
        )
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
            message = unavailable_message(str(exc), isinstance(exc, QnapCredentialsRejected))
            if not ask_retry(message):
                raise SystemExit(f"SMS Lite stopped: {exc}") from exc


def load_initial_admin(path: Path) -> dict[str, str] | None:
    """The administrator the installer asked for on a local-SQLite install, or None.

    ``initial-admin.json`` holds ``email``, ``password`` and optionally ``full_name``. It is
    single-use: the entrypoint deletes it once bootstrap has run. An unreadable or invalid file
    is ignored (the caller logs it), so a bad file never stops Lite from starting.
    """
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    email = str(data.get("email") or "").strip()
    password = str(data.get("password") or "")
    # config.Settings validates these at startup (EmailStr; DEFAULT_ADMIN_PASSWORD stripped and at
    # least 8 characters), so anything it would reject must be ignored here, not crash Lite.
    if len(password) < 8 or password != password.strip():
        return None
    try:
        from email_validator import EmailNotValidError, validate_email

        email = validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError:
        return None
    full_name = str(data.get("full_name") or "").strip() or "System Administrator"
    return {"email": email, "password": password, "full_name": full_name}


def windows_retry_dialog(message: str) -> bool:
    """Native Retry/Cancel box (button captions follow the Windows language). True = Retry."""
    import ctypes

    mb_retrycancel, mb_iconerror, mb_topmost, idretry = 0x5, 0x10, 0x40000, 4
    user32 = getattr(ctypes, "windll").user32  # Windows-only attribute; Lite is a Windows app
    result = user32.MessageBoxW(None, message, "SMS Lite — QNAP", mb_retrycancel | mb_iconerror | mb_topmost)
    return bool(result == idretry)
