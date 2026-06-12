"""Compatibility shim for legacy import path.

This module re-exports the consolidated Control Panel router assembled from
sub-routers in backend.routers.control.* and provides a few test-facing
symbols expected by older tests (e.g., monkeypatch hooks).

Goal: Keep this file minimal and side-effect free. All real implementations
live under backend.routers.control.*
"""

from __future__ import annotations

from typing import Optional, Tuple

from backend.routers.control import router as _combined_router
from backend.routers.control.common import (
    check_docker_running as _real_check_docker_running,
)
from backend.routers.control.common import (
    check_npm_installed as _real_check_npm_installed,
)
from backend.routers.control.operations import (
    download_database_backup as download_database_backup,
)

router = _combined_router


def _check_npm_installed() -> Tuple[bool, Optional[str]]:
    """Return (npm_ok, npm_version). Tests may monkeypatch this symbol.

    By default, delegate to the real implementation in control.common.
    """
    return _real_check_npm_installed()


def _check_docker_running() -> bool:
    """Return whether Docker is reachable. Tests may monkeypatch this symbol.

    By default, delegate to the real implementation in control.common.
    """
    return _real_check_docker_running()


__all__ = [
    "router",
    "download_database_backup",
    "_check_npm_installed",
    "_check_docker_running",
]
