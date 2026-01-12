"""
Student Management System - Main Entry Point
Version: 1.17.1

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

import subprocess  # noqa: F401 - Required for tests to monkeypatch subprocess.run/Popen
import sys
from pathlib import Path

from fastapi import FastAPI

from .app_factory import create_app

"""
Student Management System — FastAPI backend

Entry point for the backend application. This file is used by Uvicorn/Gunicorn.
"""
# Patch sys.path for local dev (if run directly)
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
# Entrypoint for Uvicorn/Gunicorn
app: FastAPI = create_app()
# For local dev: run with `python backend/main.py`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
# NOTE: `app` is created above. Do NOT recreate it here to avoid multiple
# FastAPI instances which break test dependency overrides.


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
