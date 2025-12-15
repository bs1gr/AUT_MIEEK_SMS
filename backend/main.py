"""
Student Management System - Main Entry Point
Version: 1.12.5

Minimal entry point that creates and runs the FastAPI application.
All application logic has been modularized into:
- app_factory.py: Application creation and configuration
- lifespan.py: Startup/shutdown lifecycle management
- middleware_config.py: Middleware registration
- error_handlers.py: Exception handler registration
- router_registry.py: Router registration

RECOMMENDED STARTUP:
- Docker: Use DOCKER.ps1 -Start (one-click deployment)
- Native: Use NATIVE.ps1 -Start (development mode with hot reload)
- Direct: uvicorn backend.main:app --host 127.0.0.1 --port 8000
"""

import sys
import io
import os
from pathlib import Path
from backend.import_resolver import ensure_backend_importable

# UTF-8 encoding fix for Windows console
if sys.platform == "win32" and os.environ.get("PYTEST_CURRENT_TEST") is None:
    try:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        try:
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
    except Exception:
        pass

# Ensure project root is on sys.path for absolute imports via centralized resolver
ensure_backend_importable()

from backend.app_factory import create_app
from backend.db import get_session as get_db  # Export for backward compatibility  # noqa: F401
import uvicorn
import subprocess  # Export for tests  # noqa: F401


# Create the FastAPI application
app = create_app()


# Backward compatibility stubs for tests that monkeypatch main module
# These functions have been refactored into other modules but tests may still reference them
def _detect_frontend_port():
    """Stub for backward compatibility - actual implementation in health_checks.py"""
    return None


def _is_port_open(host, port, timeout=0.5):
    """Stub for backward compatibility - actual implementation in health_checks.py"""
    return False


def _resolve_npm_command():
    """Stub for backward compatibility - actual implementation moved to control routers"""
    return None


def _find_pids_on_port(port):
    """Stub for backward compatibility - actual implementation moved to control routers"""
    return []


def _safe_run(cmd_args, timeout=5):
    """Stub for backward compatibility - actual implementation moved to control routers"""
    from types import SimpleNamespace
    return SimpleNamespace(returncode=0, stdout="", stderr="")


def _infer_restart_command():
    """Stub for backward compatibility - actual implementation moved to control routers"""
    return None


def _spawn_restart_thread(command, delay_seconds=0.75):
    """Stub for backward compatibility - actual implementation moved to control routers"""
    pass


def get_version() -> str:
    """Read version from VERSION file."""
    try:
        version_file = Path(__file__).resolve().parent.parent / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    except Exception:
        pass
    return "unknown"


def main() -> None:
    """
    Main entry point for running the application directly.
    
    Configures and starts the Uvicorn server.
    """
    VERSION = get_version()

    print("\n" + "=" * 70)
    print("STUDENT MANAGEMENT SYSTEM API")
    print("=" * 70)
    print(f"  Version: {VERSION}")
    print("  Status: Production Ready")
    print("  Framework: FastAPI (Modular Architecture)")
    print("=" * 70)
    print("\nStarting API Server...")
    print("  URL: http://localhost:8000")
    print("  Swagger Docs: http://localhost:8000/docs")
    print("  ReDoc: http://localhost:8000/redoc")
    print("  Health Check: http://localhost:8000/health")
    print("\n  Press CTRL+C to stop the server\n")
    print("=" * 70 + "\n")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
    )


if __name__ == "__main__":
    main()
