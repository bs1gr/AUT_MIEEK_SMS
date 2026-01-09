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
            if getattr(settings, "DEFAULT_ADMIN_EMAIL", None) and getattr(settings, "DEFAULT_ADMIN_PASSWORD", None):
                session = SessionLocal()
                try:
                    ensure_default_admin_account(
                        settings=settings, session_factory=SessionLocal, logger=logging.getLogger(__name__)
                    )
                finally:
                    session.close()
        yield
        if STARTUP_DEBUG:
            logging.info("[LIFESPAN DEBUG] Minimal shutdown path executing")

    return lifespan
