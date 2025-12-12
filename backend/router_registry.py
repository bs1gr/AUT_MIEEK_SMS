"""
Router registration module for FastAPI application.
Handles dynamic import and registration of all API routers.
"""

import importlib
import importlib.util
import logging
from fastapi import FastAPI

logger = logging.getLogger(__name__)


def register_routers(app: FastAPI) -> None:
    """
    Register all API routers with the application.

    Attempts to import routers from the routers directory.
    If routers don't exist, application runs in standalone mode.

    Args:
        app: FastAPI application instance
    """
    # Try to import admin routes using importlib resolution
    try:
        admin_mod_name = (
            "backend.admin_routes"
            if importlib.util.find_spec("backend.admin_routes")
            else ("admin_routes" if importlib.util.find_spec("admin_routes") else None)
        )
        if admin_mod_name:
            admin_mod = importlib.import_module(admin_mod_name)
            admin_router = getattr(admin_mod, "router")
            app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
            logger.info("Admin router registered successfully")
    except Exception as e:
        logger.debug(f"Admin router not found or failed to register: {e}")

    # Explicitly register Auth router (critical) via importlib resolution
    try:
        auth_mod_name = (
            "backend.routers.routers_auth"
            if importlib.util.find_spec("backend.routers.routers_auth")
            else ("routers.routers_auth" if importlib.util.find_spec("routers.routers_auth") else None)
        )
        if auth_mod_name:
            auth_mod = importlib.import_module(auth_mod_name)
            auth_router = getattr(auth_mod, "router")
            app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
            logger.info("Auth router registered successfully")
    except Exception as e:
        logger.warning(f"Auth router failed to load: {e}")

    # Try to import modular routers using actual filenames under backend/routers/.
    # Import each router independently so one failure doesn't block others.
    registered = []
    errors = []

    def _try_add(import_path: str, tag: str):
        nonlocal registered, errors
        try:
            # Prefer backend-prefixed module when available
            backend_path = import_path
            plain_path = import_path.replace("backend.", "")
            chosen = None
            if importlib.util.find_spec(backend_path) is not None:
                chosen = backend_path
            elif importlib.util.find_spec(plain_path) is not None:
                chosen = plain_path
            else:
                chosen = None

            if chosen is None:
                raise ModuleNotFoundError(f"Module not found: {import_path}")

            module = importlib.import_module(chosen)
            app.include_router(getattr(module, "router"), prefix="/api/v1", tags=[tag])
            registered.append(tag)
        except Exception as ex:
            errors.append((import_path, str(ex)))
            logger.debug(f"Failed to register router '{import_path}': {ex}")

    _try_add("backend.routers.routers_students", "Students")
    _try_add("backend.routers.routers_courses", "Courses")
    _try_add("backend.routers.routers_grades", "Grades")
    _try_add("backend.routers.routers_attendance", "Attendance")
    _try_add("backend.routers.routers_analytics", "Analytics")
    _try_add("backend.routers.routers_performance", "DailyPerformance")
    _try_add("backend.routers.routers_exports", "Export")
    _try_add("backend.routers.routers_enrollments", "Enrollments")
    _try_add("backend.routers.routers_imports", "Imports")
    _try_add("backend.routers.routers_highlights", "Highlights")
    _try_add("backend.routers.routers_adminops", "AdminOps")
    _try_add("backend.routers.routers_sessions", "Sessions")
    _try_add("backend.routers.routers_diagnostics", "Diagnostics")
    _try_add("backend.routers.routers_reports", "Reports")
    _try_add("backend.routers.routers_jobs", "Jobs")
    _try_add("backend.routers.routers_audit", "Audit")

    # Control router is mounted without the global /api/v1 prefix to keep
    # canonical paths at /control/api/* (unify prefixes and avoid double
    # nesting /api/v1/control/api). Include separately so other routers still
    # live under /api/v1.
    try:
        control_mod = importlib.import_module("backend.routers.routers_control")
        app.include_router(getattr(control_mod, "router"), tags=["Control"])  # no extra prefix
        registered.append("Control")
    except Exception as e:
        errors.append(("backend.routers.routers_control", str(e)))

    if registered:
        logger.info(f"Registered routers: {', '.join(registered)}")
    if errors:
        # Elevate visibility so operators can see exactly which routers failed
        logger.warning("Some routers failed to load. Details:")
        for mod, err in errors:
            logger.warning(f" - {mod}: {err}")
