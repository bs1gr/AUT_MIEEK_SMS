"""
SMS Native Lite - Entry Point for SMS_Native_Lite.exe

Starts FastAPI backend in a daemon thread and opens PyWebView window with React frontend.
"""
import os
import sys
import time
import threading
from pathlib import Path

# CRITICAL: Set env vars BEFORE any backend import (db engine creation is at import time)
os.environ.setdefault('DATABASE_URL', 'sqlite:///./data/sms_lite.db')
os.environ.setdefault('SMS_ENV', 'development')
os.environ.setdefault('DISABLE_STARTUP_TASKS', '1')

import requests
import uvicorn
import webview
from backend.app_factory import create_app


def get_project_root() -> Path:
    """Get absolute path to project root."""
    return Path(__file__).parent.parent


def wait_for_backend(host: str = '127.0.0.1', port: int = 8765, timeout: int = 30) -> bool:
    """Poll backend health endpoint until ready, with timeout."""
    url = f'http://{host}:{port}/health'
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                return True
        except (requests.RequestException, ConnectionError):
            pass
        time.sleep(0.5)
    return False


def run_backend(app, host: str = '127.0.0.1', port: int = 8765) -> None:
    """Run FastAPI server in this thread (daemon)."""
    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level='error',  # Suppress uvicorn logs
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


def main() -> None:
    """Main entry point for SMS Native Lite."""
    # Ensure data directory exists
    data_dir = Path('./data')
    data_dir.mkdir(exist_ok=True)

    # Create and configure FastAPI app
    app = create_app()

    # Start backend in daemon thread
    backend_thread = threading.Thread(target=run_backend, args=(app,), daemon=True)
    backend_thread.start()

    # Wait for backend to be ready
    if not wait_for_backend():
        print('ERROR: Backend failed to start within timeout', file=sys.stderr)
        sys.exit(1)

    # Determine frontend path
    project_root = get_project_root()
    frontend_path = project_root / 'frontend' / 'dist' / 'index.html'
    if not frontend_path.exists():
        print(f'ERROR: Frontend build not found at {frontend_path}', file=sys.stderr)
        print('Run: npm --prefix frontend run build -- --config vite.config.lite.ts', file=sys.stderr)
        sys.exit(1)

    # Open PyWebView window
    webview.create_window(
        title='Student Management System - Native Lite',
        url=f'file:///{frontend_path.as_posix()}',
        width=1280,
        height=800,
        min_size=(800, 600),
    )
    webview.start(debug=False)


if __name__ == '__main__':
    main()
