"""
SMTP runtime-override helpers.

Loads / saves / applies a JSON file that lets admin users configure SMTP
settings through the UI without touching environment variables.  The file
is stored at ``src/backend/data/smtp_override.json`` and is intentionally
kept outside version control.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from backend.config import settings

logger = logging.getLogger(__name__)

_SMTP_OVERRIDE_PATH: Path = Path(__file__).resolve().parents[1] / "data" / "smtp_override.json"

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


def load() -> dict[str, Any]:
    """Return the saved SMTP override dict, or empty dict if missing/corrupt."""
    if _SMTP_OVERRIDE_PATH.exists():
        try:
            return json.loads(_SMTP_OVERRIDE_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save(data: dict[str, Any]) -> None:
    """Persist the SMTP override dict to disk."""
    _SMTP_OVERRIDE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SMTP_OVERRIDE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


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
