import logging
import os
import time as _time
from contextlib import asynccontextmanager

from backend.config import settings
from backend.db import SessionLocal, engine
from backend.db.query_profiler import profiler
from backend.environment import startup_tasks_enabled
from backend.scripts.admin.bootstrap import ensure_default_admin_account
from backend.routers.routers_rbac import backfill_role_rows_startup, ensure_defaults_startup
from backend.scripts.migrate.runner import run_migrations

STARTUP_DEBUG = os.environ.get("STARTUP_DEBUG", "0").strip().lower() in {"1", "true", "yes", "debug"}


def get_lifespan():
    @asynccontextmanager
    async def lifespan(app):
        if STARTUP_DEBUG:
            logging.info("[LIFESPAN DEBUG] *** LIFESPAN STARTUP STARTING ***")
        app.state.start_time = _time.time()

        # Register query profiler for performance monitoring
        profiler.register(engine)
        logging.getLogger(__name__).info("✅ Query profiler registered")

        migrations_ok = True
        # Skipped in a test run and with DISABLE_STARTUP_TASKS; not merely because pytest is
        # installed next to the server (see backend.environment.running_under_pytest).
        if startup_tasks_enabled():
            migrations_ok = run_migrations(False)

            if migrations_ok:
                try:
                    seeded = ensure_defaults_startup(SessionLocal)
                    if seeded:
                        logging.getLogger(__name__).info("✅ RBAC defaults seeded on startup")
                except Exception as e:
                    logging.getLogger(__name__).warning(f"⚠️  RBAC defaults seeding skipped: {e}")

                # Refresh tokens that can never be used again (revoked or expired). Also done
                # by the daily maintenance job, for a server that stays up for weeks. It logs
                # what it removed and never raises.
                from backend.services.refresh_token_cleanup import purge_dead_refresh_tokens_in_own_session

                purge_dead_refresh_tokens_in_own_session(SessionLocal)
            else:
                logging.getLogger(__name__).warning(
                    "⚠️  Migrations failed during startup; continuing with reduced startup tasks"
                )
                # An administrator has to be able to sign in and see what went wrong. An
                # account from before this version may lack the row of its role (it never
                # needed one), and without it nothing opens. Logs and never raises.
                backfill_role_rows_startup(SessionLocal)

            # Always run admin bootstrap if credentials are configured, but only
            # after migrations have run successfully (required for users table).
            if getattr(settings, "DEFAULT_ADMIN_EMAIL", None) and getattr(settings, "DEFAULT_ADMIN_PASSWORD", None):
                bootstrap_logger = logging.getLogger("admin.bootstrap")
                if migrations_ok:
                    bootstrap_logger.info("🔧 Running admin bootstrap with credentials from environment...")
                    try:
                        ensure_default_admin_account(
                            settings=settings,
                            session_factory=SessionLocal,
                            logger=bootstrap_logger,
                            close_session=False,
                        )
                        bootstrap_logger.info("✅ Admin bootstrap completed successfully")
                    except Exception as e:
                        bootstrap_logger.error(f"❌ Admin bootstrap failed: {e}", exc_info=True)
                    # The account the bootstrap just created (or restored) has the word "admin"
                    # in its Role column and no role row yet: the roles were seeded before it
                    # existed. Without the row it could do nothing.
                    backfill_role_rows_startup(SessionLocal)
                else:
                    bootstrap_logger.warning(
                        "⚠️  Skipping admin bootstrap because migrations did not complete successfully"
                    )
            else:
                # Check if database is empty and warn
                try:
                    from backend.models import User

                    session = SessionLocal()
                    try:
                        user_count = session.query(User).count()
                        if user_count == 0:
                            logging.getLogger(__name__).warning(
                                "⚠️  Database has no users! Please set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD "
                                "environment variables and restart, or create your first user via API."
                            )
                    finally:
                        session.close()
                except Exception:
                    logging.getLogger(__name__).debug("Could not check user count at startup", exc_info=True)

        # Warn about insecure defaults when auth is active
        _log = logging.getLogger(__name__)
        _KNOWN_WEAK_PASSWORDS = {
            "adminpassword123!", "yoursecurepassword123!", "changeme123!",
            "password", "admin", "123456", "password123", "password123!",
            "admin123!", "changeme", "test", "testpassword", "secret",
            # template placeholder + a value that was published in the (public) repo
            "change-me-generated-on-first-run", "qw9e4rt7yu2io5pa1sd8fg6hj3kl0zx_",
        }
        _admin_pw = str(getattr(settings, "DEFAULT_ADMIN_PASSWORD", "") or "").lower()
        if _admin_pw and _admin_pw in _KNOWN_WEAK_PASSWORDS:
            _log.warning(
                "⚠️  Security: DEFAULT_ADMIN_PASSWORD is a well-known weak value. "
                "Change it immediately after first login!"
            )
        _auth_mode = str(getattr(settings, "AUTH_MODE", "strict")).lower()
        if getattr(settings, "AUTH_ENABLED", False) and _auth_mode != "strict":
            _log.warning(
                "⚠️  Security: AUTH_MODE=%s — requests WITHOUT a login skip permission checks, so anyone "
                "who can reach this server can read and change data. Use AUTH_MODE=strict for anything "
                "but automated tests.",
                _auth_mode,
            )
        if getattr(settings, "AUTH_ENABLED", False):
            if not getattr(settings, "COOKIE_SECURE", True):
                _log.warning(
                    "⚠️  Security: COOKIE_SECURE=False while AUTH_ENABLED=True. "
                    "Refresh token cookies are sent over HTTP. Set COOKIE_SECURE=True when using HTTPS."
                )
            if not getattr(settings, "CSRF_ENABLED", False):
                _log.warning(
                    "⚠️  Security: CSRF_ENABLED=False while AUTH_ENABLED=True. "
                    "Browser-based CSRF attacks are not mitigated. "
                    "Enable CSRF_ENABLED=True in production if using browser clients."
                )
        if str(getattr(settings, "POSTGRES_SSLMODE", "prefer")).lower() == "disable":
            _log.warning(
                "⚠️  Security: POSTGRES_SSLMODE=disable — database connections are unencrypted. "
                "Use 'require' or 'verify-full' in production."
            )

        # The rest of the startup belongs to a real server as well, not to a test run (nor to a
        # start with DISABLE_STARTUP_TASKS): both steps reach for this machine's own setup.
        # The saved SMTP settings are the operator's real mail relay. The schedulers open
        # sessions of their own on the configured database, not on the one a test hands to
        # the app, so on a developer's PC every test that started the app read the scheduled
        # reports of the real database and queued its report, cleanup and purge jobs in the
        # test process.
        if startup_tasks_enabled():
            # Apply persisted SMTP override so email works without env-var restart
            try:
                from backend.services.smtp_override import load_and_apply as _apply_smtp
                _apply_smtp()
            except Exception as e:
                logging.getLogger(__name__).warning(f"⚠️  SMTP override load skipped: {e}")

            # Initialize export/report schedulers and maintenance tasks
            try:
                from backend.services.maintenance_scheduler import get_maintenance_scheduler

                scheduler = get_maintenance_scheduler()
                scheduler.start_export_scheduler()
                scheduler.start_report_scheduler()
                scheduler.start_course_activation_scheduler()
                scheduler.schedule_cleanup_task(frequency="daily")
                # The daily backup of the database. Like the rest of this block it belongs to a
                # real server: a test run must never dump the database its .env points at.
                scheduler.schedule_automatic_backup()
                # The "alive and well" signal to a monitoring service outside, when one is set.
                scheduler.schedule_monitor_heartbeat()
                logging.getLogger(__name__).info(
                    "✅ Export/report/course-activation schedulers and maintenance tasks started"
                )
            except Exception as e:
                logging.getLogger(__name__).warning(f"⚠️  Scheduler startup not available: {e}")

        yield
        if STARTUP_DEBUG:
            logging.info("[LIFESPAN DEBUG] Minimal shutdown path executing")

        # Stop schedulers on shutdown
        try:
            from backend.services.maintenance_scheduler import get_maintenance_scheduler

            scheduler = get_maintenance_scheduler()
            scheduler.stop_export_scheduler()
            scheduler.stop_report_scheduler()
            scheduler.stop_course_activation_scheduler()
            logging.getLogger(__name__).info("✅ Export/report/course-activation schedulers stopped")
        except Exception as e:
            logging.getLogger(__name__).warning(f"⚠️  Error stopping schedulers: {e}")

    return lifespan
