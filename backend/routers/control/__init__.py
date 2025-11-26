from __future__ import annotations

from fastapi import APIRouter

from . import (
    base,
    frontend_dev,
    housekeeping,
    logs,
    maintenance,
    monitoring,
    operations,
)

router = APIRouter(prefix="/control/api", tags=["Control Panel"])

# Mount subrouters (no extra prefix to keep paths identical)
router.include_router(base.router)
router.include_router(operations.router)
router.include_router(monitoring.router)
router.include_router(logs.router)
router.include_router(housekeeping.router)
router.include_router(frontend_dev.router)
router.include_router(maintenance.router)
