"""
SMS Native Lite - Entry Point for SMS_Native_Lite.exe

Simple HTTP server + PyWebView with optional direct bridge.
"""
import os
import sys
import io
import threading
import time

# Force UTF-8 encoding to avoid Unicode errors in Greek locale
if sys.stdout and not hasattr(sys.stdout, 'reconfigure'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and not hasattr(sys.stderr, 'reconfigure'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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

import webview
from backend.lite_api_bridge import LiteApiBridge
from backend.lite_http_server import run_server_in_thread


def _debug_log(msg: str) -> None:
    """Write debug log to file instead of stderr (which may not exist in GUI mode)."""
    if getattr(sys, 'frozen', False):
        log_path = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite' / 'debug.log'
        try:
            with open(log_path, 'a') as f:
                f.write(f'{msg}\n')
                f.flush()
        except Exception:
            pass


def main() -> None:
    """Main entry point for SMS Native Lite."""

    # Ensure data directory exists and database path is correct
    if getattr(sys, 'frozen', False):
        data_dir = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite'
    else:
        data_dir = Path('./data')

    data_dir.mkdir(parents=True, exist_ok=True)
    _debug_log(f'[lite_entrypoint] Data dir: {data_dir}')
    _debug_log(f'[lite_entrypoint] Data dir exists: {data_dir.exists()}')

    # Run migrations explicitly before PyWebView startup
    _debug_log('[lite_entrypoint] Running migrations...')
    _debug_log(f'[lite_entrypoint] DATABASE_URL={os.environ.get("DATABASE_URL", "NOT SET")}')
    try:
        from backend.scripts.migrate.runner import run_migrations
        import traceback as _tb
        result = run_migrations(verbose=True)  # Enable verbose to get more details
        _debug_log(f'[lite_entrypoint] Migrations result: {result}')
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_entrypoint] Migration error: {type(e).__name__}: {str(e)[:500]}')
        _debug_log(f'[lite_entrypoint] Traceback: {_tb.format_exc()[:1000]}')

    # Determine frontend path (bundled mode uses _MEIPASS)
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        # Running from PyInstaller bundle
        bundle_root = Path(sys._MEIPASS)
        frontend_path = bundle_root / 'frontend' / 'dist' / 'index.html'
    else:
        # Running from source
        project_root = Path(__file__).parent.parent
        frontend_path = project_root / 'frontend' / 'dist_lite' / 'index.html'
        if not frontend_path.exists():
            frontend_path = project_root / 'frontend' / 'dist' / 'index.html'

    if not frontend_path.exists():
        _debug_log(f'ERROR: Frontend build not found at {frontend_path}')
        _debug_log('Run: npm --prefix frontend run build -- --config vite.config.lite.ts')
        sys.exit(1)

    _debug_log(f'[lite_entrypoint] Frontend path: {frontend_path}')

    # Create API bridge instance
    api_bridge = LiteApiBridge()
    _debug_log('[lite_entrypoint] API bridge created')

    # Check if running in CI/headless mode
    if os.environ.get('CI') or os.environ.get('HEADLESS'):
        # Non-interactive mode: just keep backend alive
        _debug_log('[lite_entrypoint] Running in headless mode (CI/HEADLESS set)')
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            _debug_log('[lite_entrypoint] Headless shutdown')
    else:
        # Interactive mode: start FastAPI server + open PyWebView window
        _debug_log('[lite_entrypoint] Starting API server...')
        try:
            from backend.app_factory import create_app
            from fastapi.staticfiles import StaticFiles
            from fastapi.responses import FileResponse
            import uvicorn

            try:
                _debug_log('[lite_entrypoint] Creating FastAPI app...')
                app = create_app()
                _debug_log(f'[lite_entrypoint] App created. Routes: {len(app.routes)}')
            except Exception as e:
                import traceback as _tb
                _debug_log(f'[lite_entrypoint] ERROR creating app: {type(e).__name__}: {str(e)[:300]}')
                _debug_log(_tb.format_exc()[:1000])
                raise

            # NOTE: Frontend serving is handled by register_root_endpoints() in create_app()
            # Don't override root here - it might interfere with FastAPI routing
            # Just ensure assets are accessible if needed
            frontend_dist = frontend_path.parent
            _debug_log(f'[lite_entrypoint] Frontend path: {frontend_dist}')

            # Start FastAPI in a daemon thread with detailed logging
            def run_fastapi():
                import socket
                try:
                    _debug_log('[lite_entrypoint] FastAPI uvicorn.run() starting...')

                    # Check if port is already in use
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('127.0.0.1', 8765))
                    sock.close()
                    if result == 0:
                        _debug_log('[lite_entrypoint] Port 8765 already in use')
                    else:
                        _debug_log('[lite_entrypoint] Port 8765 is free, starting uvicorn...')

                    uvicorn.run(
                        app,
                        host='127.0.0.1',
                        port=8765,
                        log_level='critical',
                        access_log=False,
                        lifespan='off',
                    )
                    _debug_log('[lite_entrypoint] uvicorn.run() returned (shouldn\'t happen)')
                except Exception as e:
                    import traceback as _tb
                    _debug_log(f'[lite_entrypoint] FastAPI error: {type(e).__name__}: {str(e)[:300]}')
                    _debug_log(_tb.format_exc()[:500])

            api_thread = threading.Thread(target=run_fastapi, daemon=False)  # Non-daemon
            api_thread.start()
            _debug_log('[lite_entrypoint] API server thread started (non-daemon)')

            # Wait longer and check multiple times for port to bind
            _debug_log('[lite_entrypoint] Waiting for port 8765 to bind...')
            import socket
            port_open = False
            for attempt in range(15):  # Try for up to 7.5 seconds
                time.sleep(0.5)
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = sock.connect_ex(('127.0.0.1', 8765))
                sock.close()
                if result == 0:
                    _debug_log(f'[lite_entrypoint] ✓ Port 8765 OPEN after {attempt * 0.5:.1f}s')
                    port_open = True
                    break
                elif attempt % 3 == 0:
                    _debug_log(f'[lite_entrypoint] Waiting... attempt {attempt + 1}/15')

            if not port_open:
                _debug_log('[lite_entrypoint] ✗ Port 8765 did NOT bind after 7.5 seconds')

            # Open PyWebView window
            _debug_log('[lite_entrypoint] Opening PyWebView window...')
            webview.create_window(
                title='Student Management System - Native Lite',
                url='http://127.0.0.1:8765',
                js_api=api_bridge,
                width=1280,
                height=800,
                min_size=(800, 600),
            )
            _debug_log('[lite_entrypoint] Window created, starting event loop...')
            webview.start(debug=False)
            _debug_log('[lite_entrypoint] Window closed, shutting down')
        except Exception as e:
            import traceback as _tb
            _debug_log(f'[lite_entrypoint] Error: {type(e).__name__}: {str(e)[:300]}')
            _debug_log(_tb.format_exc()[:500])
            sys.exit(1)


if __name__ == '__main__':
    main()
