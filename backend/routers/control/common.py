"""
Shared utilities and configuration for Control Panel routers.
This module centralizes helpers, constants, and rate limiter access
so subrouters can remain lightweight and focused.
"""

from __future__ import annotations

import logging
import os
import shutil
import socket
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psutil  # type: ignore

# Import project utilities lazily via resolver to work in different execution modes
from backend.import_resolver import import_names

# Rate limiting (required project guidance)
(limiter, RATE_LIMIT_HEAVY, RATE_LIMIT_READ) = import_names(
    "rate_limiting", "limiter", "RATE_LIMIT_HEAVY", "RATE_LIMIT_READ"
)

logger = logging.getLogger(__name__)

# -----------------------------
# Constants
# -----------------------------
TIMEOUT_PORT_CHECK = 0.5
TIMEOUT_COMMAND_SHORT = 5
TIMEOUT_COMMAND_MEDIUM = 10
TIMEOUT_DOCKER_STOP = 120
TIMEOUT_DOCKER_DOWN = 180
TIMEOUT_NPM_INSTALL = 300
TIMEOUT_PIP_INSTALL = 300
TIMEOUT_DOCKER_BUILD = 600

BACKEND_PORTS = [8000, 8001, 8002]
FRONTEND_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]
COMMON_DEV_PORTS = [8000, 8080, 5173]

GRAFANA_PORT = 3000
PROMETHEUS_PORT = 9090
LOKI_PORT = 3100

# -----------------------------
# Environment helpers
# -----------------------------


def in_docker_container() -> bool:
    """Detect if running inside a Docker container (best-effort, cross-platform safe)."""
    if os.path.exists("/.dockerenv"):
        return True
    if sys.platform != "win32":
        try:
            with open("/proc/1/cgroup", "rt") as f:
                if "docker" in f.read():
                    return True
        except Exception:
            pass
    return False


def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=TIMEOUT_PORT_CHECK):
            return True
    except OSError:
        return False


def get_process_on_port(port: int) -> Optional[Dict[str, Any]]:
    try:
        for conn in psutil.net_connections(kind="inet"):
            # Safely extract local address port across platforms/psutil versions
            try:
                laddr = getattr(conn, "laddr", None)
                port_val = None
                if laddr is not None:
                    # namedtuple with .port on some platforms, tuple on others
                    try:
                        port_val = getattr(laddr, "port")
                    except Exception:
                        try:
                            port_val = laddr[1]  # type: ignore[index]
                        except Exception:
                            port_val = None
                status = getattr(conn, "status", "")
            except Exception:
                port_val = None
                status = ""

            if port_val == port and status == "LISTEN":
                try:
                    proc = psutil.Process(conn.pid)  # type: ignore[arg-type]
                    return {
                        "pid": conn.pid,
                        "name": proc.name(),
                        "exe": proc.exe(),
                        "cmdline": " ".join(proc.cmdline()),
                    }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return {"pid": conn.pid, "name": "Unknown", "exe": None, "cmdline": None}
    except Exception as e:
        logger.warning(f"Error checking port {port}: {e}")
    return None


# -----------------------------
# Frontend dev server helpers
# -----------------------------

FRONTEND_PORT_PREFERRED = 5173
FRONTEND_PORT_CANDIDATES = list(range(5173, 5181))


def _allow_taskkill() -> bool:
    return os.environ.get("CONTROL_API_ALLOW_TASKKILL", "0") == "1"


def safe_run(cmd_args: List[str], timeout: int = 5):
    try:
        if not _allow_taskkill():
            try:
                if cmd_args and isinstance(cmd_args, (list, tuple)):
                    cmd0 = str(cmd_args[0]).lower()
                    full = " ".join(map(str, cmd_args)).lower()
                    if "taskkill" in cmd0 or ("/im" in full and "node.exe" in full):
                        logger.info("CONTROL_API_ALLOW_TASKKILL not set: skipping destructive command: %s", cmd_args)
                        from types import SimpleNamespace

                        return SimpleNamespace(returncode=0, stdout="", stderr="")
            except Exception:
                pass

        return subprocess.run(cmd_args, check=False, capture_output=True, text=True, timeout=timeout)
    except Exception as e:
        logger.warning(f"Safe run failed for {cmd_args}: {e}")
        from types import SimpleNamespace

        return SimpleNamespace(returncode=1, stdout="", stderr=str(e))


def resolve_npm_command() -> Optional[str]:
    for name in ("npm", "npm.cmd"):
        found = shutil.which(name)
        if found:
            return found
    nvm_home = os.environ.get("NVM_HOME", "")
    nvm_symlink = os.environ.get("NVM_SYMLINK", "")
    candidates = [
        os.path.join(os.environ.get("ProgramFiles", r"C:\\Program Files"), "nodejs", "npm.cmd"),
        os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\\Program Files (x86)"), "nodejs", "npm.cmd"),
        os.path.join(
            os.environ.get("LOCALAPPDATA", os.path.expandvars(r"%LOCALAPPDATA%")), "Programs", "nodejs", "npm.cmd"
        ),
        os.path.join(os.environ.get("APPDATA", os.path.expandvars(r"%APPDATA%")), "npm", "npm.cmd"),
        os.path.join(nvm_home, "nodejs", "npm.cmd") if nvm_home else "",
        os.path.join(nvm_symlink, "npm.cmd") if nvm_symlink else "",
    ]
    for path in candidates:
        try:
            if path and os.path.isfile(path):
                return path
        except Exception:
            continue
    found_npx = shutil.which("npx.cmd") or shutil.which("npx")
    if found_npx:
        return found_npx
    return None


def mask_token(tok: Optional[str]) -> str:
    if not tok:
        return "<none>"
    try:
        return tok[:4] + "..." + tok[-4:]
    except Exception:
        return "<masked>"


def find_pids_on_port(port: int) -> List[int]:
    try:
        proc = subprocess.run(
            ["netstat", "-ano"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
        pids: set[int] = set()
        for line in proc.stdout.splitlines():
            line = line.strip()
            if f":{port}" in line and "LISTEN" in line.upper():
                parts = [t for t in line.split() if t]
                if parts and len(parts) >= 5:
                    pid_str = parts[-1]
                    try:
                        pid = int(pid_str)
                        pids.add(pid)
                    except ValueError:
                        pass
        return list(pids)
    except Exception as e:
        logger.warning(f"Failed to find PIDs on port {port}: {e}")
        return []


def run_command(cmd: List[str], timeout: int = 30) -> Tuple[bool, str, str]:
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace")
        return res.returncode == 0, res.stdout, res.stderr
    except subprocess.TimeoutExpired:
        return False, "", f"Command timed out after {timeout}s"
    except Exception as e:
        return False, "", str(e)


def check_docker_running() -> bool:
    ok, _, _ = run_command(["docker", "info"], timeout=TIMEOUT_COMMAND_SHORT)
    return ok


def docker_compose(cmd: List[str], cwd: Optional[Path] = None, timeout: int = 60) -> Tuple[bool, str, str]:
    args = ["docker", "compose"] + cmd
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None,
            encoding="utf-8",
            errors="replace",
        )
        success = result.returncode == 0
        if not success and result.stderr:
            logger.warning(f"Docker compose {' '.join(cmd)} failed: {result.stderr[:200]}")
        return success, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        err = f"docker compose {' '.join(cmd)} timed out after {timeout}s"
        logger.error(err)
        return False, "", err
    except FileNotFoundError:
        err = "Docker or docker compose not found in PATH"
        logger.error(err)
        return False, "", err
    except Exception as e:
        logger.error(f"Unexpected error running docker compose: {e}")
        return False, "", str(e)


def docker_volume_exists(name: str) -> bool:
    ok, out, _ = run_command(["docker", "volume", "ls", "--format", "{{.Name}}"])
    if not ok:
        return False
    return name in [line.strip() for line in out.splitlines()]


def create_unique_volume(base_name: str) -> str:
    date_suffix = datetime.now().strftime("%Y%m%d")
    candidate = f"{base_name}_v{date_suffix}"
    idx = 1
    while docker_volume_exists(candidate):
        idx += 1
        candidate = f"{base_name}_v{date_suffix}_{idx}"
    ok, _, err = run_command(["docker", "volume", "create", candidate])
    if not ok:
        raise RuntimeError(f"Failed to create volume {candidate}: {err}")
    return candidate


def check_node_installed() -> tuple[bool, Optional[str]]:
    ok, out, _ = run_command(["node", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    if ok:
        return True, out.strip()
    return False, None


def check_npm_installed() -> tuple[bool, Optional[str]]:
    # On Windows, npm is a batch script (.cmd), so try npm.cmd first
    if sys.platform == "win32":
        ok, out, _ = run_command(["npm.cmd", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
        if ok:
            return True, out.strip()
    # Fallback to npm (Unix-like systems or if npm.cmd failed)
    ok, out, _ = run_command(["npm", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    if ok:
        return True, out.strip()
    return False, None


def check_docker_version() -> Optional[str]:
    ok, out, _ = run_command(["docker", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    return out.strip() if ok else None


def get_frontend_port() -> Optional[int]:
    for port in range(5173, 5181):
        if is_port_open(port):
            return port
    return None


def infer_restart_command() -> Optional[List[str]]:
    env_cmd = os.environ.get("SMS_RESTART_COMMAND", "").strip()
    if env_cmd:
        try:
            import shlex

            parsed = shlex.split(env_cmd)
            if parsed:
                return parsed
        except ValueError:
            logger.warning("Invalid SMS_RESTART_COMMAND: %s", env_cmd)
    argv = sys.argv[:] if sys.argv else []
    if not argv:
        logger.warning("Cannot infer restart command: sys.argv empty")
        return None
    entry = argv[0] or "uvicorn"
    args = argv[1:]
    p = Path(entry)
    lowered = p.suffix.lower()
    if lowered in {".exe", ".bat", ".cmd"}:
        resolved = shutil.which(entry) or entry
        return [resolved, *args]
    if lowered in {".py", ".pyw"} or p.exists():
        run_target = p if p.is_absolute() else (Path.cwd() / p).resolve()
        return [sys.executable, str(run_target), *args]
    return [sys.executable, "-m", entry, *args]


def spawn_restart_thread(command: List[str], delay_seconds: float = 0.75) -> None:
    import time as _time

    def _restart_target():
        try:
            logger.info("Restarting backend with command: %s", command)
            _time.sleep(delay_seconds)
            os.execv(command[0], command)
        except Exception as exc:
            logger.error("Backend restart failed; forcing exit: %s", exc, exc_info=True)
            os._exit(0)

    threading.Thread(target=_restart_target, daemon=True).start()
