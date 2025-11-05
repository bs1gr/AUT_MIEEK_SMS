"""Shared helpers for backend test assertions."""

from __future__ import annotations

from typing import Any, Mapping


def get_error_message(response_json: Mapping[str, Any]) -> str:
    """Return the textual error message from a structured HTTP error payload."""

    detail = response_json.get("detail")
    if isinstance(detail, Mapping):
        message = detail.get("message")
        if isinstance(message, str):
            return message
        return str(detail)
    if detail is None:
        return ""
    return str(detail)


__all__ = ["get_error_message"]
