"""System diagnostics helpers used by ops modules.

This module provides minimal, well-typed helpers so operational code
and tests can import diagnostics utilities without requiring heavy
third-party dependencies at type-check time.
"""

from __future__ import annotations

import logging
import shutil
import socket
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from .base import OperationResult

logger = logging.getLogger(__name__)


class SystemStatusChecker:
    """Minimal system status helper used by ops (port checks, simple process lookups)."""

    def __init__(self, root_dir: Optional[Path] = None):
        self.root_dir = root_dir

    def check_port_in_use(self, port: int) -> bool:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                return True
        except Exception:
            return False

    def get_process_on_port(self, port: int) -> Optional[SimpleNamespace]:
        # Try to minimally detect a process on a port without a hard dependency
        # on psutil. This returns a simple namespace similar to the shape used
        # by callers (pid, name, exe, cmdline) or None if not found.
        try:
            import psutil  # type: ignore

            for conn in psutil.net_connections(kind="inet"):
                try:
                    laddr = getattr(conn, "laddr", None)
                    # no-op local placeholder removed — not needed
                    if laddr is not None:
                        try:
                            port_val = getattr(laddr, "port")
                        except Exception:
                            # some psutil versions/platforms represent laddr as tuple
                            try:
                                port_val = laddr[1]
                            except Exception:
                                port_val = None
                    else:
                        port_val = None

                    status = getattr(conn, "status", "")
                except Exception:
                    port_val = None
                    status = ""

                if port_val == port and status == "LISTEN":
                    try:
                        proc = psutil.Process(conn.pid)
                        return SimpleNamespace(
                            pid=conn.pid,
                            name=proc.name(),
                            exe=proc.exe() if hasattr(proc, "exe") else None,
                            cmdline=(" ".join(proc.cmdline()) if hasattr(proc, "cmdline") else None),
                        )
                    except Exception:
                        return SimpleNamespace(pid=conn.pid, name="Unknown", exe=None, cmdline=None)
        except Exception:
            # psutil not available — fall back to a conservative (False/None) result
            logger.debug(
                "psutil not available when checking ports; returning no process info",
                exc_info=True,
            )
            return None

        return None


class DependencyChecker:
    """Simple dependency checker used by setup operations.

    This intentionally performs lightweight checks (node/python/docker presence)
    and returns an OperationResult so SetupOperations can make decisions.
    """

    def __init__(self, root_dir: Optional[Path] = None):
        self.root_dir = root_dir

    def execute(self) -> OperationResult:
        # Check Python version
        py_ok = True
        py_version = None
        try:
            import sys

            py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
            py_ok = sys.version_info >= (3, 11)
        except Exception:
            py_ok = False

        # Check Node.js availability
        node_path = shutil.which("node") or shutil.which("node.exe")
        node_ok = bool(node_path)

        # Check docker availability (best-effort)
        docker_ok = bool(shutil.which("docker"))

        status = {
            "python_installed": py_ok,
            "python_version": py_version,
            "node_installed": node_ok,
            "docker_installed": docker_ok,
        }

        # If python is missing or node is missing, treat as failure. Otherwise success.
        if not py_ok or not node_ok:
            return OperationResult.failure_result("Dependencies missing", data={"status": status})

        return OperationResult.success_result("Dependencies OK", data={"status": status})
