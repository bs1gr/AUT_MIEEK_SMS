import logging
import os
import threading
import time as _time
from contextlib import asynccontextmanager

from backend.config import settings
from backend.db import SessionLocal, engine
from backend.db.query_profiler import profiler
from backend.scripts.admin.bootstrap import ensure_default_admin_account
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

        disable_startup = os.environ.get("DISABLE_STARTUP_TASKS", "0").strip().lower() in {"1", "true", "yes"}
        if not disable_startup:

            def _migrate_bg():
                run_migrations(False)

            threading.Thread(target=_migrate_bg, daemon=True, name="migrations-bg").start()

            # Always run admin bootstrap if credentials are configured
            if getattr(settings, "DEFAULT_ADMIN_EMAIL", None) and getattr(settings, "DEFAULT_ADMIN_PASSWORD", None):
                bootstrap_logger = logging.getLogger("admin.bootstrap")
                bootstrap_logger.info("🔧 Running admin bootstrap with credentials from environment...")
                try:
                    ensure_default_admin_account(
                        settings=settings, session_factory=SessionLocal, logger=bootstrap_logger, close_session=False
                    )
                    bootstrap_logger.info("✅ Admin bootstrap completed successfully")
                except Exception as e:
                    bootstrap_logger.error(f"❌ Admin bootstrap failed: {e}", exc_info=True)
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
                    pass
        yield
        if STARTUP_DEBUG:
            logging.info("[LIFESPAN DEBUG] Minimal shutdown path executing")

    return lifespan
