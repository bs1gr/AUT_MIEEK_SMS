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
# Handle PyInstaller bundled execution (use AppData for database)
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Running as PyInstaller bundle
    appdata = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite'
    os.environ['DATABASE_URL'] = f'sqlite:///{appdata / "sms_lite.db"}'
else:
    # Running from source
    os.environ.setdefault('DATABASE_URL', 'sqlite:///./data/sms_lite.db')

os.environ.setdefault('SMS_ENV', 'development')
# Note: DISABLE_STARTUP_TASKS is NOT set — migrations run automatically on startup via lifespan

import requests
import uvicorn
import webview
from backend.app_factory import create_app
from backend.lite_api_bridge import LiteApiBridge


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
    if getattr(sys, 'frozen', False):
        data_dir = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite'
    else:
        data_dir = Path('./data')

    data_dir.mkdir(parents=True, exist_ok=True)

    # Create and configure FastAPI app
    print('[lite_entrypoint] Creating app...', file=_sys_debug.stderr, flush=True)
    app = create_app()
    print('[lite_entrypoint] App created', file=_sys_debug.stderr, flush=True)

    # Start backend in daemon thread
    print('[lite_entrypoint] Starting backend thread...', file=_sys_debug.stderr, flush=True)
    backend_thread = threading.Thread(target=run_backend, args=(app,), daemon=True)
    backend_thread.start()
    print('[lite_entrypoint] Backend thread started, waiting for health...', file=_sys_debug.stderr, flush=True)

    # Wait longer for backend to be ready (migrations can take time)
    if not wait_for_backend(timeout=60):
        print('ERROR: Backend failed to start within 60 seconds', file=sys.stderr)
        sys.exit(1)

    print('[lite_entrypoint] Backend ready!', file=_sys_debug.stderr, flush=True)

    # Determine frontend path
    project_root = get_project_root()
    frontend_path = project_root / 'frontend' / 'dist' / 'index.html'
    if not frontend_path.exists():
        print(f'ERROR: Frontend build not found at {frontend_path}', file=sys.stderr)
        print('Run: npm --prefix frontend run build -- --config vite.config.lite.ts', file=sys.stderr)
        sys.exit(1)

    # Create API bridge instance
    api_bridge = LiteApiBridge()

    # Check if running in a non-interactive environment (server/CI/testing)
    import os as _os_check
    is_interactive = (
        _os_check.environ.get('TERM') and
        not _os_check.environ.get('CI') and
        not _os_check.environ.get('HEADLESS')
    )

    if is_interactive and _os_check.name != 'nt':
        # Open PyWebView window with API bridge (interactive Linux mode)
        webview.create_window(
            title='Student Management System - Native Lite',
            url=f'file:///{frontend_path.as_posix()}',
            js_api=api_bridge,
            width=1280,
            height=800,
            min_size=(800, 600),
        )
        webview.start(debug=False)
    else:
        # Headless/Windows mode: keep backend running, don't try to open window
        print(f'SMS Native Lite running on http://127.0.0.1:8765')
        try:
            while True:
                import time as _time_wait
                _time_wait.sleep(1)
        except KeyboardInterrupt:
            print('Shutting down...')


if __name__ == '__main__':
    main()
