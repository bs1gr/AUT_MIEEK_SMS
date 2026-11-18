"""Fine-grained RBAC permission checks and FastAPI dependencies.

Provides helpers similar to routers_auth.require_role/optional_require_role but
for arbitrary permissions, decided by the grants in the database alone (backend.rbac).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error
from backend.rbac import get_user_permissions, has_permission
from backend.security.current_user import get_current_user

logger = logging.getLogger(__name__)


def user_permissions_from_db(db: Session, user: Any) -> set[str]:
    """Compatibility wrapper returning a set of permission keys."""

    try:
        return set(get_user_permissions(user, db))
    except Exception:
        return set()


def require_permission(permission: str):
    def _dep(
        request: Request,
        user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Any:
        if not has_permission(user, permission, db):
            raise http_error(
                403,
                ErrorCode.FORBIDDEN,
                f"Missing permission: {permission}",
                request,
                context={
                    "required_permission": permission,
                    "user_email": getattr(user, "email", None),
                },
            )
        return user

    return _dep


def optional_require_permission(permission: str):
    """Permission checker that respects AUTH_ENABLED and AUTH_MODE.

    - When AUTH is disabled: returns a dummy admin-like user for tests
    - When AUTH is enabled: verifies permission via the grants in the database
    """

    def _dep(
        request: Request,
        user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Any:
        auth_enabled = getattr(settings, "AUTH_ENABLED", False)
        auth_mode = getattr(settings, "AUTH_MODE", "disabled")
        if not auth_enabled or auth_mode == "disabled":
            from types import SimpleNamespace

            return SimpleNamespace(
                id=1,
                email="admin@example.com",
                role="admin",
                is_active=True,
                full_name="Admin User",
            )

        if not has_permission(user, permission, db):
            raise http_error(
                403,
                ErrorCode.FORBIDDEN,
                f"Missing permission: {permission}",
                request,
                context={
                    "required_permission": permission,
                    "current_role": getattr(user, "role", None),
                },
            )
        return user

    return _dep
