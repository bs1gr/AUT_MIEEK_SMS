"""
SMTP runtime-override helpers.

Loads / saves / applies a JSON file that lets admin users configure SMTP
settings through the UI without touching environment variables.  The file
is stored at ``src/backend/data/smtp_override.json`` (or ``SMTP_OVERRIDE_PATH``)
and is intentionally kept outside version control.
"""

from __future__ import annotations

import json
import logging
import os
import base64
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from backend.config import settings

logger = logging.getLogger(__name__)


def _default_override_path() -> Path:
    """``SMTP_OVERRIDE_PATH`` if set, else ``src/backend/data/smtp_override.json``.

    Every backend started from a checkout reads the same file, so a throwaway backend
    (RUN_E2E_ISOLATED.ps1) would otherwise send real mail through the developer's
    configured relay and could overwrite its saved settings. It points this into its
    own run directory instead.
    """
    configured = os.environ.get("SMTP_OVERRIDE_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "smtp_override.json"


_SMTP_OVERRIDE_PATH: Path = _default_override_path()
_PASSWORD_ENCRYPTION_PREFIX = "fernet:v1:"
# HKDF "info" label: keeps this key distinct from anything else derived from SECRET_KEY.
_SMTP_KEY_INFO = b"sms.smtp-override.password:v1"

# Fields persisted as-is. The password is never in this list: it is only ever written encrypted.
PLAIN_FIELDS: tuple[str, ...] = (
    "smtp_host",
    "smtp_port",
    "smtp_username",
    "from_email",
    "admin_emails",
    "notify_on_completion",
    "notify_on_failure",
    "notify_on_schedule_failure",
)

_FIELD_TO_ATTR: dict[str, str] = {
    "smtp_host": "SMTP_HOST",
    "smtp_port": "SMTP_PORT",
    "smtp_username": "SMTP_USER",
    "smtp_password": "SMTP_PASSWORD",
    "from_email": "SMTP_FROM",
}


def override_path() -> Path:
    """Return the path used to persist the SMTP override file."""
    return _SMTP_OVERRIDE_PATH


def _password_cipher() -> Fernet:
    """Derive a purpose-specific encryption key from the persistent app secret (HKDF-SHA256)."""
    secret = str(settings.SECRET_KEY or "").encode("utf-8")
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=_SMTP_KEY_INFO).derive(secret)
    return Fernet(base64.urlsafe_b64encode(key))


def _encrypt_password(password: str) -> str:
    token = _password_cipher().encrypt(password.encode("utf-8")).decode("ascii")
    return f"{_PASSWORD_ENCRYPTION_PREFIX}{token}"


def _decrypt_password(password: str) -> str:
    token = password.removeprefix(_PASSWORD_ENCRYPTION_PREFIX).encode("ascii")
    return _password_cipher().decrypt(token).decode("utf-8")


def load() -> dict[str, Any]:
    """Return the saved SMTP override dict, or empty dict if missing/corrupt."""
    if _SMTP_OVERRIDE_PATH.exists():
        try:
            override = json.loads(_SMTP_OVERRIDE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}

        if not isinstance(override, dict):
            return {}

        password = override.get("smtp_password")
        if isinstance(password, str) and password:
            if password.startswith(_PASSWORD_ENCRYPTION_PREFIX):
                try:
                    override["smtp_password"] = _decrypt_password(password)
                except (InvalidToken, UnicodeError, ValueError):
                    logger.error(
                        "Could not decrypt the persisted SMTP password; verify SECRET_KEY and re-enter the password."
                    )
                    override.pop("smtp_password", None)
            else:
                # Migrate existing installations without requiring the admin to re-enter the password.
                try:
                    save(override)
                except OSError:
                    logger.exception("Could not migrate the persisted SMTP password to encrypted storage.")
        return override
    return {}


def save(data: dict[str, Any]) -> None:
    """Persist the SMTP override dict to disk, with the password encrypted.

    Built from an allow-list rather than a copy of ``data``, so a plaintext password (or any
    unexpected key) in the caller's dict can never reach the file.
    """
    _SMTP_OVERRIDE_PATH.parent.mkdir(parents=True, exist_ok=True)
    persisted: dict[str, Any] = {field: data[field] for field in PLAIN_FIELDS if field in data}
    password = data.get("smtp_password")
    if password:
        persisted["smtp_password"] = _encrypt_password(str(password))
    elif "smtp_password" in data:
        # An explicitly cleared password stays cleared, so apply() still overrides the env value.
        persisted["smtp_password"] = ""
    _SMTP_OVERRIDE_PATH.write_text(json.dumps(persisted, indent=2), encoding="utf-8")


def apply(override: dict[str, Any]) -> None:
    """Write override values into the in-memory settings singleton."""
    for json_key, attr in _FIELD_TO_ATTR.items():
        if json_key not in override:
            continue
        value: Any = override[json_key]
        if json_key == "smtp_port":
            try:
                value = int(value)
            except (TypeError, ValueError):
                value = 587
        else:
            value = value or None
        try:
            object.__setattr__(settings, attr, value)
        except Exception:
            pass


def load_and_apply() -> bool:
    """Load override file and apply it to in-memory settings.  Returns True if applied."""
    override = load()
    if not override:
        return False
    apply(override)
    logger.info("SMTP override settings loaded from %s", _SMTP_OVERRIDE_PATH)
    return True
