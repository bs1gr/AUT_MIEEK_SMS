"""
SMS Native Lite Simple - Headless HTTP Server (No PyWebView)

Pure FastAPI + embedded React frontend. Listens on port 8000.
Auto-connects to QNAP PostgreSQL if credentials available, otherwise uses SQLite.
"""
import os
import sys
import io
from pathlib import Path

# Force UTF-8 encoding to avoid Unicode errors in Greek locale
if sys.stdout and not hasattr(sys.stdout, 'reconfigure'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and not hasattr(sys.stderr, 'reconfigure'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# CRITICAL: Set env vars BEFORE any backend import (db engine creation is at import time)
# Check if QNAP PostgreSQL credentials exist
qnap_creds_file = Path(__file__).parent.parent / 'local-secrets' / 'qnap-credentials.json'
if qnap_creds_file.exists():
    # Use QNAP PostgreSQL database
    try:
        import json
        with open(qnap_creds_file) as f:
            creds = json.load(f)
        os.environ['DATABASE_URL'] = (
            f'postgresql+psycopg://{creds["user"]}:{creds["password"]}'
            f'@{creds["host"]}:{creds["port"]}/{creds["dbname"]}'
        )
        os.environ['POSTGRES_SSLMODE'] = creds.get('sslmode', 'disable')
    except Exception as e:
        print(f"WARNING: Failed to load QNAP credentials: {e}, falling back to SQLite")
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            appdata = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
            os.environ['DATABASE_URL'] = f'sqlite:///{appdata / "sms_lite.db"}'
        else:
            os.environ.setdefault('DATABASE_URL', 'sqlite:///./data/sms_lite.db')
elif getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Running as PyInstaller bundle without QNAP - use local SQLite
    appdata = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
    os.environ['DATABASE_URL'] = f'sqlite:///{appdata / "sms_lite.db"}'
else:
    # Running from source without QNAP - use local SQLite
    os.environ.setdefault('DATABASE_URL', 'sqlite:///./data/sms_lite.db')

os.environ.setdefault('SMS_ENV', 'development')

# Set default admin credentials for Native Lite (auto-create on first run)
os.environ.setdefault('DEFAULT_ADMIN_EMAIL', 'admin@sms-lite.app')
os.environ.setdefault('DEFAULT_ADMIN_PASSWORD', 'AdminPassword123!')
os.environ.setdefault('DEFAULT_ADMIN_FULL_NAME', 'System Administrator')


def _debug_log(msg: str) -> None:
    """Write debug log to file instead of stderr (which may not exist in GUI mode)."""
    if getattr(sys, 'frozen', False):
        log_path = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple' / 'debug.log'
        try:
            with open(log_path, 'a') as f:
                f.write(f'{msg}\n')
                f.flush()
        except Exception:
            pass


def main() -> None:
    """Main entry point for SMS Native Lite Simple (headless)."""

    # Ensure data directory exists
    if getattr(sys, 'frozen', False):
        data_dir = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
    else:
        data_dir = Path('./data')

    data_dir.mkdir(parents=True, exist_ok=True)
    _debug_log(f'[lite_simple_entrypoint] Data dir: {data_dir}')
    _debug_log(f'[lite_simple_entrypoint] Data dir exists: {data_dir.exists()}')

    # Run migrations explicitly before server startup
    _debug_log('[lite_simple_entrypoint] Running migrations...')
    _debug_log(f'[lite_simple_entrypoint] DATABASE_URL={os.environ.get("DATABASE_URL", "NOT SET")}')
    try:
        from backend.scripts.migrate.runner import run_migrations
        import traceback as _tb
        result = run_migrations(verbose=True)
        _debug_log(f'[lite_simple_entrypoint] Migrations result: {result}')
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] Migration error: {type(e).__name__}: {str(e)[:500]}')
        _debug_log(f'[lite_simple_entrypoint] Traceback: {_tb.format_exc()[:1000]}')

    # Create FastAPI app
    _debug_log('[lite_simple_entrypoint] Creating FastAPI app...')
    try:
        from backend.app_factory import create_app
        app = create_app()
        _debug_log(f'[lite_simple_entrypoint] App created. Routes: {len(app.routes)}')
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] ERROR creating app: {type(e).__name__}: {str(e)[:300]}')
        _debug_log(_tb.format_exc()[:1000])
        sys.exit(1)

    # Determine frontend path (bundled mode uses _MEIPASS)
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        # Running from PyInstaller bundle
        bundle_root = Path(sys._MEIPASS)
        frontend_dist = bundle_root / 'frontend' / 'dist'
    else:
        # Running from source
        project_root = Path(__file__).parent.parent
        frontend_dist = project_root / 'frontend' / 'dist_lite'
        if not frontend_dist.exists():
            frontend_dist = project_root / 'frontend' / 'dist'

    if not frontend_dist.exists():
        _debug_log(f'ERROR: Frontend dist not found at {frontend_dist}')
        _debug_log('Run: npm --prefix frontend run build -- --config vite.config.lite.ts')
        sys.exit(1)

    _debug_log(f'[lite_simple_entrypoint] Frontend dist: {frontend_dist}')

    # Register static file serving for frontend
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # Serve static files (JS, CSS, images, etc.)
    app.mount("/static", StaticFiles(directory=str(frontend_dist / "assets")), name="static")

    # Serve index.html for all non-API routes (SPA routing)
    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        if path.startswith("api/"):
            # API routes already handled by routers, return 404
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not found"}, status_code=404)
        # Serve index.html for SPA
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return JSONResponse({"detail": "Frontend not found"}, status_code=404)

    # Start FastAPI server
    _debug_log('[lite_simple_entrypoint] Starting FastAPI server on port 8000...')
    try:
        import uvicorn
        _debug_log('[lite_simple_entrypoint] About to call uvicorn.run()...')
        uvicorn.run(
            app,
            host='0.0.0.0',
            port=8000,
            log_level='warning',
            access_log=False,
        )
        _debug_log('[lite_simple_entrypoint] uvicorn.run() returned (should not happen)')
    except KeyboardInterrupt:
        _debug_log('[lite_simple_entrypoint] Keyboard interrupt - shutting down')
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] Server error: {type(e).__name__}: {str(e)[:500]}')
        _debug_log(_tb.format_exc()[:1000])
        sys.exit(1)


if __name__ == '__main__':
    main()
