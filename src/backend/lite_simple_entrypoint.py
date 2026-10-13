"""
SMS Native Lite Simple - Headless HTTP Server (No PyWebView)

Pure FastAPI + embedded React frontend. Listens on port 8000.
With QNAP credentials it runs on QNAP PostgreSQL or does not start (it asks to retry);
without them it is a standalone install on a local SQLite file. See lite_db.py.
"""
import os
import sys
import io
import secrets
import time
import webbrowser
import threading
from pathlib import Path

# With console=False PyInstaller builds stdout/stderr are None.
# Uvicorn's default log formatter calls sys.stdout.isatty() and raises
# AttributeError when the stream is None, preventing the server from starting.
# Redirect to devnull first so logging is silent but the process doesn't crash.
if getattr(sys, 'frozen', False):
    if sys.stdout is None:
        sys.stdout = open(os.devnull, 'w')  # noqa: WPS515
    if sys.stderr is None:
        sys.stderr = open(os.devnull, 'w')  # noqa: WPS515

# Force UTF-8 encoding to avoid Unicode errors in Greek locale
if sys.stdout and not hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except AttributeError:
        pass  # devnull stream has no .buffer; leave as-is
if sys.stderr and not hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except AttributeError:
        pass

# CRITICAL: Set env vars BEFORE any backend import (db engine creation is at import time)
from backend.lite_db import (  # noqa: E402 - stdlib-only module
    api_operation_count,
    app_serves,
    load_initial_admin,
    select_database,
    windows_password_dialog,
    windows_retry_dialog,
)

# QNAP PostgreSQL credentials: AppData when installed, next to the source tree in development.
_lite_appdata: Path | None
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    _lite_appdata = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
    _creds_candidate = _lite_appdata / 'local-secrets' / 'qnap-credentials.json'
    _local_sqlite_url = f'sqlite:///{_lite_appdata / "sms_lite.db"}'
else:
    _lite_appdata = None
    _creds_candidate = Path(__file__).parent.parent / 'local-secrets' / 'qnap-credentials.json'
    _local_sqlite_url = os.environ.get('DATABASE_URL') or 'sqlite:///./data/sms_lite.db'
qnap_creds_file = _creds_candidate if _creds_candidate.exists() else None
print(f"[DEBUG] QNAP credentials: {qnap_creds_file or f'none at {_creds_candidate}'}", file=sys.stderr)


def _ask_retry(message: str) -> bool:
    """While QNAP is unusable: log why, then let the user Retry (frozen app) or stop."""
    print(message, file=sys.stderr)
    # In frozen console=False builds stderr is devnull (see top of file); keep a trace in debug.log.
    if _lite_appdata is not None:
        try:
            _lite_appdata.mkdir(parents=True, exist_ok=True)
            with open(_lite_appdata / 'debug.log', 'a', encoding='utf-8', errors='replace') as _log:
                _log.write(f'{message}\n')
        except Exception:
            pass
        return windows_retry_dialog(message)
    return False  # running from source: no dialog, just stop


def _ask_password(message: str) -> str | None:
    """QNAP refused the saved password: ask for the current one (frozen app), or stop."""
    print(message, file=sys.stderr)
    if _lite_appdata is None:
        return None  # running from source: no dialog
    try:
        _lite_appdata.mkdir(parents=True, exist_ok=True)
        with open(_lite_appdata / 'debug.log', 'a', encoding='utf-8', errors='replace') as _log:
            _log.write('QNAP refused the saved password; asking the user for the current one\n')
    except Exception:
        pass
    return windows_password_dialog(message)


# With credentials, Lite runs on QNAP or not at all - never on a local database (lite_db.py).
_database_url, _sslmode = select_database(
    qnap_creds_file, _local_sqlite_url, _ask_retry, ask_password=_ask_password
)
os.environ['DATABASE_URL'] = _database_url
if _sslmode is not None:
    os.environ['POSTGRES_SSLMODE'] = _sslmode

os.environ.setdefault('SMS_ENV', 'development')

# Lite listens on 0.0.0.0 (LAN / Android clients can reach it), so it must not run with the
# config default AUTH_MODE=permissive: in that mode rbac.require_permission lets any request
# *without* a bearer token straight through, and every student/grade/audit/RBAC endpoint was
# readable and writable from the network with no login. Docker already defaults to strict.
os.environ.setdefault('AUTH_ENABLED', 'true')
os.environ.setdefault('AUTH_MODE', 'strict')

# First administrator. Bootstrap creates it only in a database with no users yet, so the
# shared QNAP database never gets one: QNAP users sign in with their existing accounts.
# - A local-SQLite install: the account the installer asked the user for
#   (local-secrets/initial-admin.json; deleted once bootstrap has run, see main()).
# - Otherwise (silent install, older installer): the fallback below. Its password is public
#   (it is in this repo), so the server only lets it be used to set a new password
#   (security/default_passwords.py + current_user.password_change_blocks).
_initial_admin_file = _creds_candidate.parent / 'initial-admin.json'
_initial_admin = None if qnap_creds_file else load_initial_admin(_initial_admin_file)
if _initial_admin_file.exists() and _initial_admin is None:
    print(f"[DEBUG] Ignoring {_initial_admin_file} (QNAP install, or not a valid email/password)", file=sys.stderr)
if _initial_admin:
    os.environ['DEFAULT_ADMIN_EMAIL'] = _initial_admin['email']
    os.environ['DEFAULT_ADMIN_PASSWORD'] = _initial_admin['password']
    os.environ['DEFAULT_ADMIN_FULL_NAME'] = _initial_admin['full_name']
    os.environ['DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED'] = 'false'  # the user chose it in the installer
else:
    os.environ.setdefault('DEFAULT_ADMIN_EMAIL', 'admin@sms-lite.app')
    os.environ.setdefault('DEFAULT_ADMIN_PASSWORD', 'AdminPassword123!')
    os.environ.setdefault('DEFAULT_ADMIN_FULL_NAME', 'System Administrator')

# Self-registration only files a request for an administrator to approve. On a local SQLite
# install the only administrators are on this PC, and nobody at the school sees the request,
# so the login page offers no registration there: the PC's administrator creates accounts in
# User Management. On QNAP the shared database's administrators approve requests as usual.
if not qnap_creds_file:
    os.environ.setdefault('SELF_REGISTRATION_MODE', 'disabled')

# Generate (once) and persist a real SECRET_KEY for this installation. There is no
# bundled backend/.env in the frozen exe, so backend.config.Settings would otherwise
# fall back to its placeholder default, which its security validator now rejects
# outright (see check_secret_key in backend/config.py). Persisting it — rather than
# generating fresh on every launch — keeps existing JWTs/sessions valid across restarts.
if 'SECRET_KEY' not in os.environ:
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        secret_key_file = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple' / 'local-secrets' / 'secret_key.txt'
        try:
            if secret_key_file.exists():
                os.environ['SECRET_KEY'] = secret_key_file.read_text(encoding='utf-8').strip()
            else:
                secret_key_file.parent.mkdir(parents=True, exist_ok=True)
                generated_key = secrets.token_urlsafe(48)
                secret_key_file.write_text(generated_key, encoding='utf-8')
                os.environ['SECRET_KEY'] = generated_key
        except Exception as e:
            print(f"WARNING: Failed to persist SECRET_KEY ({e}); generating an in-memory one for this run only", file=sys.stderr)
            os.environ['SECRET_KEY'] = secrets.token_urlsafe(48)


# ---------------------------------------------------------------------------
# Lite-mode auto-shutdown state
# ---------------------------------------------------------------------------
_shutdown_lock = threading.Lock()
_shutdown_after: float | None = None   # epoch time when to terminate; None = no timer
_last_api_request: float = time.time()  # updated by middleware on every /api/* hit

# Owner's rule (2026-10-13): Lite exits 30 s after Logout, or once no SMS page is open. Every
# open page - the login page too - sends /api/v1/lite/heartbeat every 10 s, so 90 s without any
# API request means no page is open. 90, not 30: browsers slow timers in background tabs to
# about one a minute, and a tab left in the background must not lose its server.
INACTIVITY_TIMEOUT_SECS = 90

_LOOPBACK_HOSTS = {'127.0.0.1', '::1', 'localhost'}


def _redact_url(url: str) -> str:
    """Hide the password in a DB URL before it goes to debug.log (the QNAP one has a real one)."""
    import re as _re
    return _re.sub(r'(://[^:/@]+:)[^@]*@', r'\1***@', url)


def _is_local_request(request) -> bool:
    """True when the TCP peer is this machine. Proxy headers are ignored on purpose:
    Lite has no reverse proxy, so an X-Forwarded-For value would be attacker-supplied."""
    client = getattr(request, 'client', None)
    host = getattr(client, 'host', None) or ''
    return host in _LOOPBACK_HOSTS or host.startswith('::ffff:127.')


def _is_onefile_bundle() -> bool:
    """True only when _MEIPASS is a per-launch temp extraction dir (onefile build).

    In a onedir build (what ships since the onedir switch) _MEIPASS is the installed
    `_internal` folder next to SMS_Lite.exe. Deleting it there wipes the app's own
    runtime: every shutdown used to leave an install that could never start again.
    """
    if not (getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')):
        return False
    import tempfile as _tempfile
    mei = Path(sys._MEIPASS).resolve()
    tmp = Path(_tempfile.gettempdir()).resolve()
    return mei.name.startswith('_MEI') and mei.parent == tmp


def _cleanup_and_exit() -> None:
    """Delete the current PyInstaller _MEIPASS bundle (onefile only) then hard-exit.
    Prevents the ~120 MB temp dir from being left behind on clean shutdowns."""
    if _is_onefile_bundle():
        import shutil as _shutil
        try:
            _shutil.rmtree(getattr(sys, '_MEIPASS'), ignore_errors=True)
            _debug_log('[lite_simple_entrypoint] Cleaned current _MEIPASS on exit.')
        except Exception:
            pass
    os._exit(0)


def _monitor_shutdown() -> None:
    """Background thread: exits the process when the shutdown deadline passes
    OR when the app has been completely idle for INACTIVITY_TIMEOUT_SECS."""
    while True:
        time.sleep(2)
        now = time.time()
        with _shutdown_lock:
            deadline = _shutdown_after
            idle = now - _last_api_request
        if deadline is not None and now >= deadline:
            _debug_log('[lite_simple_entrypoint] Auto-shutdown: logout grace period expired.')
            _cleanup_and_exit()
        if idle >= INACTIVITY_TIMEOUT_SECS:
            _debug_log(f'[lite_simple_entrypoint] Auto-shutdown: no SMS page open for {INACTIVITY_TIMEOUT_SECS} s.')
            _cleanup_and_exit()


def _debug_log(msg: str) -> None:
    """Write debug log to file instead of stderr (which may not exist in GUI mode)."""
    if getattr(sys, 'frozen', False):
        log_path = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple' / 'debug.log'
        try:
            from datetime import datetime as _dt
            ts = _dt.now().strftime('%H:%M:%S.%f')[:-3]
            with open(log_path, 'a', encoding='utf-8', errors='replace') as f:
                f.write(f'[{ts}] {msg}\n')
                f.flush()
        except Exception:
            pass


def _admin_account_exists(email: str) -> bool:
    try:
        from backend.db import SessionLocal
        from backend.models import User

        session = SessionLocal()
        try:
            return session.query(User).filter(User.email == email.lower()).first() is not None
        finally:
            session.close()
    except Exception:
        return False


def _open_browser_async() -> None:
    """Open browser after server startup (runs in background thread)."""
    try:
        time.sleep(3)
        _debug_log('[lite_simple_entrypoint] Opening browser to http://127.0.0.1:8000')
        webbrowser.open('http://127.0.0.1:8000')
    except Exception as e:
        _debug_log(f'[lite_simple_entrypoint] Browser open failed (non-critical): {e}')


def main() -> None:
    """Main entry point for SMS Native Lite Simple (headless)."""

    # Ensure data directory exists
    if getattr(sys, 'frozen', False):
        data_dir = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
    else:
        data_dir = Path('./data')

    data_dir.mkdir(parents=True, exist_ok=True)

    # Clean up stale PyInstaller temp dirs from previous runs that were killed
    # without a clean exit. Skip the current bundle dir (_MEIPASS). Onefile only: a
    # onedir build never extracts to temp, so any _MEI* there belongs to another app.
    if _is_onefile_bundle():
        import tempfile as _tempfile
        import shutil as _shutil
        _current_mei = Path(getattr(sys, '_MEIPASS'))
        _tmp = Path(_tempfile.gettempdir())
        for _mei in _tmp.glob('_MEI*'):
            if _mei != _current_mei and _mei.is_dir():
                try:
                    _shutil.rmtree(_mei, ignore_errors=True)
                    _debug_log(f'[lite_simple_entrypoint] Cleaned stale temp: {_mei.name}')
                except Exception:
                    pass

    _debug_log(f'[lite_simple_entrypoint] Data dir: {data_dir}')
    _debug_log(f'[lite_simple_entrypoint] Data dir exists: {data_dir.exists()}')

    # Run migrations explicitly before server startup
    _debug_log('[lite_simple_entrypoint] Running migrations...')
    _debug_log(f'[lite_simple_entrypoint] DATABASE_URL={_redact_url(os.environ.get("DATABASE_URL", "NOT SET"))}')
    migrations_ok = False
    try:
        from backend.scripts.migrate.runner import run_migrations
        import traceback as _tb
        result = run_migrations(verbose=True)
        _debug_log(f'[lite_simple_entrypoint] Migrations result: {result}')
        if not result:
            _debug_log('[lite_simple_entrypoint] WARNING: Migrations returned False - attempting fallback schema creation')
            # Try to read the migrations log for more details
            try:
                migrations_log = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple' / 'logs' / 'migrations.log'
                if migrations_log.exists():
                    with open(migrations_log, 'r') as f:
                        log_content = f.read()[-2000:]  # Last 2000 chars
                        _debug_log(f'[lite_simple_entrypoint] Migrations log tail:\n{log_content}')
            except Exception as log_err:
                _debug_log(f'[lite_simple_entrypoint] Could not read migrations log: {log_err}')
        else:
            migrations_ok = True
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] Migration error: {type(e).__name__}: {str(e)[:500]}')
        _debug_log(f'[lite_simple_entrypoint] Traceback: {_tb.format_exc()[-1500:]}')

    # Fallback: if Alembic migrations failed in the frozen EXE context (e.g. alembic.ini
    # path resolution fails inside _MEIPASS), create the schema directly so the app can
    # still start. This intentionally bypasses the Alembic-only rule because the
    # alternative is a hard crash with no recovery path for the end user.
    if not migrations_ok:
        _debug_log('[lite_simple_entrypoint] Attempting fallback: direct schema creation with SQLAlchemy...')
        try:
            from backend.db import engine
            from backend.models import Base
            Base.metadata.create_all(engine)  # noqa: SMS-lite-frozen-exe-fallback
            _debug_log('[lite_simple_entrypoint] ✅ Schema created via SQLAlchemy fallback')
            migrations_ok = True
        except Exception as fallback_err:
            import traceback as _tb
            _debug_log(f'[lite_simple_entrypoint] Fallback also failed: {type(fallback_err).__name__}: {str(fallback_err)[:500]}')
            _debug_log(f'[lite_simple_entrypoint] Traceback: {_tb.format_exc()[-1500:]}')
            _debug_log('[lite_simple_entrypoint] ⚠️  WARNING: Schema initialization failed - app may not work')

    # Ensure default admin account exists (even if migrations were skipped)
    if migrations_ok:
        _debug_log('[lite_simple_entrypoint] Creating/ensuring default admin account...')
        bootstrap_ok = False
        try:
            from backend.scripts.admin.bootstrap import ensure_default_admin_account
            from backend.config import settings
            from backend.db import SessionLocal
            import logging
            bootstrap_logger = logging.getLogger('lite_admin_bootstrap')
            ensure_default_admin_account(
                settings=settings,
                session_factory=SessionLocal,
                logger=bootstrap_logger,
                close_session=False,
            )
            bootstrap_ok = True
            _debug_log('[lite_simple_entrypoint] ✅ Admin account created/verified')
        except Exception as admin_err:
            import traceback as _tb
            _debug_log(f'[lite_simple_entrypoint] Admin bootstrap warning: {type(admin_err).__name__}: {str(admin_err)[:500]}')
            _debug_log(f'[lite_simple_entrypoint] Traceback: {_tb.format_exc()[:500]}')
        # The installer's admin file holds a plaintext password and is single-use. Remove it once
        # bootstrap has run, once the account exists even if something else in bootstrap failed,
        # or when it was ignored (QNAP install, invalid contents); keep it only while the account
        # still has to be created.
        if _initial_admin_file.exists() and (
            _initial_admin is None or bootstrap_ok or _admin_account_exists(_initial_admin['email'])
        ):
            try:
                _initial_admin_file.unlink()
                _debug_log('[lite_simple_entrypoint] Removed the installer admin file')
            except OSError as rm_err:
                _debug_log(f'[lite_simple_entrypoint] Could not remove the installer admin file: {rm_err}')

    # Create FastAPI app
    _debug_log('[lite_simple_entrypoint] Creating FastAPI app...')
    try:
        from backend.app_factory import create_app
        app = create_app()
        # len(app.routes) counts only top-level entries since FastAPI 0.143 (an included router is
        # one entry), so it fell from ~343 to 53 although every endpoint was there: log the API's
        # operations instead.
        _debug_log(f'[lite_simple_entrypoint] App created. API operations: {api_operation_count(app)}')
        # Verify control router is registered; if not, attempt explicit registration
        # and log the actual error so it appears in debug.log (not just uvicorn's logger).
        if not app_serves(app, '/control/api/status'):
            _debug_log('[lite_simple_entrypoint] Control router NOT in app — attempting explicit registration...')
            try:
                import importlib as _il
                import traceback as _tb2
                _ctrl = _il.import_module('backend.routers.routers_control')
                app.include_router(getattr(_ctrl, 'router'), tags=['Control'])
                _debug_log('[lite_simple_entrypoint] Control router explicitly registered OK.')
            except Exception as _ce:
                import traceback as _tb2
                _debug_log(f'[lite_simple_entrypoint] Control router FAILED: {type(_ce).__name__}: {str(_ce)[:500]}')
                _debug_log(_tb2.format_exc()[:3000])
        else:
            _debug_log('[lite_simple_entrypoint] Control router already registered via app_factory.')
    except Exception as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] ERROR creating app: {type(e).__name__}: {str(e)[:300]}')
        _debug_log(_tb.format_exc()[-1500:])
        sys.exit(1)

    # -----------------------------------------------------------------------
    # Lite-mode: auto-shutdown endpoints + activity middleware
    # -----------------------------------------------------------------------
    global _shutdown_after, _last_api_request

    from fastapi import Request as _Request
    from fastapi.responses import JSONResponse as _JSONResponse

    # These two are unauthenticated (logout calls schedule-shutdown after the token is gone),
    # so only the Lite machine itself may use them - otherwise anyone on the LAN could stop it.
    _forbidden = _JSONResponse({'detail': 'Local requests only'}, status_code=403)

    @app.post('/api/v1/lite/schedule-shutdown', include_in_schema=False)
    async def _lite_schedule_shutdown(request: _Request):
        global _shutdown_after
        if not _is_local_request(request):
            return _forbidden
        with _shutdown_lock:
            _shutdown_after = time.time() + 30
        _debug_log('[lite_simple_entrypoint] Shutdown scheduled in 30 s (logout).')
        return _JSONResponse({'scheduled_in': 30})

    @app.post('/api/v1/lite/cancel-shutdown', include_in_schema=False)
    async def _lite_cancel_shutdown(request: _Request):
        global _shutdown_after, _last_api_request
        if not _is_local_request(request):
            return _forbidden
        with _shutdown_lock:
            _shutdown_after = None
            _last_api_request = time.time()
        _debug_log('[lite_simple_entrypoint] Shutdown cancelled (new login).')
        return _JSONResponse({'cancelled': True})

    # Sent every 10 s by every open SMS page (also from phones and PCs on the LAN), logged in or
    # not. The activity middleware below records it. It only keeps Lite alive, so it needs no
    # login and is not restricted to this machine. It does not cancel a Logout shutdown.
    @app.get('/api/v1/lite/heartbeat', include_in_schema=False)
    async def _lite_heartbeat():
        return _JSONResponse({'alive': True})

    @app.middleware('http')
    async def _track_activity(request: _Request, call_next):
        global _last_api_request
        if request.url.path.startswith('/api/'):
            with _shutdown_lock:
                _last_api_request = time.time()
        return await call_next(request)

    # Start background shutdown monitor. The inactivity clock starts now, not at import: startup
    # can wait minutes (QNAP retry or password window), and the browser opens only after that.
    with _shutdown_lock:
        _last_api_request = time.time()
    _mon = threading.Thread(target=_monitor_shutdown, daemon=True, name='lite-shutdown-monitor')
    _mon.start()
    _debug_log('[lite_simple_entrypoint] Shutdown monitor started.')

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
        if path.startswith("api/") or path.startswith("control/"):
            # API and control routes are handled by routers — return 404 so the
            # actual route handler (or the error handler) produces the real response
            # instead of silently serving index.html (which breaks JSON callers).
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not found"}, status_code=404)

        # Real files in the bundled dist must win over the SPA fallback. This used to
        # return index.html for every non-API path, so any root-level asset without its
        # own explicit route in app_factory (logo.png and favicon have one; the Credits
        # image does not) was answered with HTML and a 200 — the browser asked for a JPEG
        # and got a page, leaving a broken image with no error anywhere to explain it.
        if path:
            dist_root = os.path.realpath(frontend_dist)
            # Only serve inside dist: `path` comes straight from the URL, so "../" must
            # not be able to walk out of the bundle.
            candidate = os.path.realpath(os.path.join(dist_root, path))
            if candidate.startswith(dist_root + os.sep) and os.path.isfile(candidate):
                import mimetypes

                media_type, _ = mimetypes.guess_type(candidate)
                return FileResponse(candidate, media_type=media_type or "application/octet-stream")

        # Serve index.html for SPA
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return JSONResponse({"detail": "Frontend not found"}, status_code=404)

    # -----------------------------------------------------------------------
    # Self-healing port check: if port 8000 is already occupied (stale
    # instance), try to stop it gracefully then wait for the port to clear.
    # -----------------------------------------------------------------------
    import socket as _socket
    import urllib.request as _urllib_req

    def _port_in_use(port: int) -> bool:
        with _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0

    if _port_in_use(8000):
        _debug_log('[lite_simple_entrypoint] Port 8000 already in use — signalling old instance to stop...')
        try:
            req = _urllib_req.Request(
                'http://127.0.0.1:8000/api/v1/lite/schedule-shutdown',
                data=b'',
                method='POST',
            )
            _urllib_req.urlopen(req, timeout=2)
            _debug_log('[lite_simple_entrypoint] Sent schedule-shutdown to old instance.')
        except Exception as _pe:
            _debug_log(f'[lite_simple_entrypoint] Could not signal old instance: {_pe}')
            # Fallback: try to kill via psutil if available
            try:
                import psutil as _psutil
                for _proc in _psutil.process_iter(['pid', 'name', 'connections']):
                    _process_info = getattr(_proc, 'info', {})
                    for _conn in _process_info.get('connections') or []:
                        if getattr(_conn, 'laddr', None) and _conn.laddr.port == 8000:
                            _debug_log(f'[lite_simple_entrypoint] Killing PID {_proc.pid} ({_process_info.get("name")})')
                            _proc.kill()
                            break
            except Exception:
                pass

        # Wait up to 8 seconds for the port to free
        for _i in range(16):
            time.sleep(0.5)
            if not _port_in_use(8000):
                _debug_log('[lite_simple_entrypoint] Port 8000 now free.')
                break
        else:
            _debug_log('[lite_simple_entrypoint] WARNING: port 8000 still occupied after 8 s — launching anyway.')

    # Start FastAPI server
    _debug_log('[lite_simple_entrypoint] Starting FastAPI server on port 8000...')

    # Print startup message
    try:
        print("\n" + "="*60)
        print("✅ SMS Student Management System is READY")
        print("="*60)
        print("\n📱 Open your browser and go to:")
        print("   👉 http://127.0.0.1:8000")
        if qnap_creds_file:
            print("\n🔐 Sign in with your account on the shared QNAP database.")
        elif _initial_admin:
            print(f"\n🔐 Sign in as {_initial_admin['email']} with the password chosen in the installer.")
        else:
            print("\n🔐 First login (only on a new database, until you set your own password):")
            print("   Email:    admin@sms-lite.app")
            print("   Password: AdminPassword123!")
            print("   This default is public: you must choose a new password before using the app.")
        print("\n" + "="*60 + "\n")
    except Exception:
        pass

    # Launch browser in background thread (non-blocking)
    try:
        browser_thread = threading.Thread(target=_open_browser_async, daemon=True)
        browser_thread.start()
        _debug_log('[lite_simple_entrypoint] Browser launch thread started')
    except Exception as e:
        _debug_log(f'[lite_simple_entrypoint] Failed to start browser thread: {e}')

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
    except BaseException as e:
        import traceback as _tb
        _debug_log(f'[lite_simple_entrypoint] Server error: {type(e).__name__}: {str(e)[:500]}')
        _debug_log(_tb.format_exc()[-1500:])
        sys.exit(1)


if __name__ == '__main__':
    main()
