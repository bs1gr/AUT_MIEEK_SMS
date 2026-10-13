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


def password_prompt_message(reason: str) -> str:
    """Shown above the password field when QNAP refused the saved password (EN + EL)."""
    return (
        f"{reason}.\n"
        "The database password has probably been changed. Enter the current QNAP database password; "
        "it is tested and then saved on this PC.\n\n"
        "Το QNAP απέρριψε τον αποθηκευμένο κωδικό. Πιθανότατα ο κωδικός της βάσης άλλαξε. Δώστε τον "
        "τρέχοντα κωδικό της βάσης QNAP· θα ελεγχθεί και θα αποθηκευτεί σε αυτόν τον υπολογιστή."
    )


def save_password(creds_file: Path, password: str) -> None:
    """Replace only the password in the credentials file, keeping every other setting."""
    data = json.loads(creds_file.read_text(encoding="utf-8-sig"))
    data["password"] = password
    creds_file.write_text(json.dumps(data, indent=2), encoding="utf-8")


def select_database(
    creds_file: Path | None,
    sqlite_url: str,
    ask_retry: Callable[[str], bool],
    probe_fn: Callable[[dict[str, Any]], None] = probe,
    ask_password: Callable[[str], str | None] | None = None,
) -> tuple[str, str | None]:
    """Return (DATABASE_URL, POSTGRES_SSLMODE or None).

    No credentials file: the local SQLite URL. Credentials present: the QNAP URL once a
    connection succeeds; while it does not, ``ask_retry(message)`` decides whether to try
    again. Declining raises ``SystemExit``: Lite must not start on a local database.

    When the server refuses the saved password, Retry cannot help, so ``ask_password``
    (if given) asks for the current one instead. A password that works is saved to the
    credentials file; cancelling stops Lite. Without ``ask_password`` it falls back to
    ``ask_retry``.
    """
    if creds_file is None:
        return sqlite_url, None
    typed_password: str | None = None
    while True:
        try:
            creds = load_credentials(creds_file)
            if typed_password is not None:
                creds["password"] = typed_password
            probe_fn(creds)
            if typed_password is not None:
                try:
                    save_password(creds_file, typed_password)
                except (OSError, ValueError):
                    pass  # this session works; the next start asks again
            return postgres_url(creds), str(creds.get("sslmode", "disable"))
        except QnapCredentialsRejected as exc:
            if ask_password is None:
                if not ask_retry(unavailable_message(str(exc), credentials_rejected=True)):
                    raise SystemExit(f"SMS Lite stopped: {exc}") from exc
                continue
            typed_password = ask_password(password_prompt_message(str(exc)))
            if not typed_password:
                raise SystemExit(f"SMS Lite stopped: {exc}") from exc
        except QnapUnavailable as exc:
            if not ask_retry(unavailable_message(str(exc))):
                raise SystemExit(f"SMS Lite stopped: {exc}") from exc


def app_serves(app: Any, path: str, method: str = "GET") -> bool:
    """Whether the app routes `method path` anywhere.

    Since FastAPI 0.143 an included router is one nested entry in app.routes, not a copy of its
    routes, so listing route paths misses everything included (2026-10-13: Lite logged
    "Control router NOT in app" and registered it a second time). Matching goes through nested
    routers.
    """
    from starlette.routing import Match

    scope = {"type": "http", "path": path, "method": method, "root_path": "", "headers": [], "query_string": b""}
    for route in app.routes:
        try:
            match, _ = route.matches(scope)
        except Exception:
            continue
        if match != Match.NONE:
            return True
    return False


def api_operation_count(app: Any) -> int | None:
    """Operations in the OpenAPI schema: the meaningful size of the API (len(app.routes) only
    counts top-level entries since FastAPI 0.143). None if the schema cannot be built."""
    try:
        return sum(len(methods) for methods in app.openapi().get("paths", {}).values())
    except Exception:
        return None


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


# A small WinForms window: the message, a hidden password field, OK / Cancel. The message comes
# in through an environment variable and the password goes out on stdout, so neither is ever on
# a command line. Exit code 0 = OK.
PASSWORD_DIALOG_PS = r"""
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$form = New-Object Windows.Forms.Form
$form.Text = 'SMS Lite - QNAP'
$form.FormBorderStyle = 'FixedDialog'
$form.StartPosition = 'CenterScreen'
$form.MinimizeBox = $false
$form.MaximizeBox = $false
$form.TopMost = $true
$form.ClientSize = New-Object Drawing.Size(520, 250)
$label = New-Object Windows.Forms.Label
$label.Text = $env:SMS_LITE_PROMPT
$label.SetBounds(12, 12, 496, 140)
$box = New-Object Windows.Forms.TextBox
$box.UseSystemPasswordChar = $true
$box.SetBounds(12, 160, 496, 24)
$ok = New-Object Windows.Forms.Button
$ok.Text = 'OK'
$ok.DialogResult = 'OK'
$ok.SetBounds(302, 205, 90, 28)
$cancel = New-Object Windows.Forms.Button
$cancel.Text = 'Cancel / Άκυρο'
$cancel.DialogResult = 'Cancel'
$cancel.SetBounds(398, 205, 110, 28)
$form.Controls.AddRange(@($label, $box, $ok, $cancel))
$form.AcceptButton = $ok
$form.CancelButton = $cancel
$form.Add_Shown({ $box.Focus() })
if ($form.ShowDialog() -eq 'OK' -and $box.Text) { [Console]::Out.Write($box.Text); exit 0 }
exit 1
"""


def windows_password_dialog(message: str) -> str | None:
    """Ask for the QNAP password in a native window. None = cancelled."""
    import base64
    import os
    import subprocess

    encoded = base64.b64encode(PASSWORD_DIALOG_PS.encode("utf-16-le")).decode("ascii")
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
            capture_output=True,
            env={**os.environ, "SMS_LITE_PROMPT": message},
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            timeout=1800,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.decode("utf-8-sig", errors="replace") or None


def windows_retry_dialog(message: str) -> bool:
    """Native Retry/Cancel box (button captions follow the Windows language). True = Retry."""
    import ctypes

    mb_retrycancel, mb_iconerror, mb_topmost, idretry = 0x5, 0x10, 0x40000, 4
    user32 = getattr(ctypes, "windll").user32  # Windows-only attribute; Lite is a Windows app
    result = user32.MessageBoxW(None, message, "SMS Lite — QNAP", mb_retrycancel | mb_iconerror | mb_topmost)
    return bool(result == idretry)
