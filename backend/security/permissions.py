"""Fine-grained RBAC permission checks and FastAPI dependencies.

Provides helpers similar to routers_auth.require_role/optional_require_role but
for arbitrary permissions, backed by DB tables when available and falling back
to default role->permission mappings when not configured.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Iterable

from fastapi import Depends, Request
from sqlalchemy.orm import Session

try:
    from backend.config import settings
    from backend.db import get_session as get_db
    from backend.errors import ErrorCode, http_error
    import backend.models as models
except Exception:  # pragma: no cover - fallback when running directly
    from config import settings  # type: ignore
    from db import get_session as get_db  # type: ignore
    from errors import ErrorCode, http_error  # type: ignore
    import models  # type: ignore

# Reuse existing auth dependency for current user resolution
try:
    from backend.routers.routers_auth import get_current_user
except Exception:  # pragma: no cover
    from routers.routers_auth import get_current_user  # type: ignore

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _default_role_permissions() -> dict[str, set[str]]:
    """Built-in default permission mapping used when DB grants are absent.

    These defaults are intentionally permissive to mirror the existing role-based
    behavior where 'teacher' can perform most academic operations.
    """
    return {
        "admin": {"*"},  # superuser
        "teacher": {
            # Students
            "students.read",
            "students.create",
            "students.update",
            # Courses
            "courses.read",
            "courses.create",
            "courses.update",
            # Attendance & grades
            "attendance.read",
            "attendance.write",
            "grades.read",
            "grades.write",
            # Imports/exports
            "imports.preview",
            "imports.execute",
            "exports.generate",
        },
        "student": {
            # Conservative defaults for student role
            "students.self.read",
            "grades.self.read",
            "attendance.self.read",
        },
    }


def _has_wildcard(perms: Iterable[str]) -> bool:
    return any(p == "*" for p in perms)


def _normalize_perm(name: str) -> str:
    return (name or "").strip().lower()


def user_permissions_from_db(db: Session, user: Any) -> set[str]:
    """Collect permissions for a user from RBAC tables if present.

    Falls back to default mapping using `user.role` when tables are empty or
    no explicit roles are assigned.
    """
    perms: set[str] = set()
    try:
        # Check if RBAC tables exist in metadata (tests may create schema on the fly)
        tables = set(models.Base.metadata.tables.keys())
        if not {"roles", "permissions", "role_permissions", "user_roles"}.issubset(tables):
            raise RuntimeError("RBAC tables not present")

        # Collect roles for user
        roles = (
            db.query(models.Role)
            .join(models.UserRole, models.UserRole.role_id == models.Role.id)
            .filter(models.UserRole.user_id == getattr(user, "id", None))
            .all()
        )
        if not roles:
            # Fall back to legacy single string role
            role_name = getattr(user, "role", None)
            if role_name:
                default = _default_role_permissions().get(str(role_name).lower(), set())
                return set(default)
            return set()
        role_ids = [r.id for r in roles]
        # Collect permission names
        rows = (
            db.query(models.Permission.name)
            .join(models.RolePermission, models.RolePermission.permission_id == models.Permission.id)
            .filter(models.RolePermission.role_id.in_(role_ids))
            .all()
        )
        perms = {str(name) for (name,) in rows}
        if not perms:
            # If roles exist but have no grants, fall back to defaults for compatibility
            # using the role names assigned.
            inherited = set()
            for r in roles:
                inherited.update(_default_role_permissions().get(str(r.name).lower(), set()))
            perms = inherited
    except Exception:
        # Any DB errors -> default mapping
        role_name = getattr(user, "role", None)
        if role_name:
            return set(_default_role_permissions().get(str(role_name).lower(), set()))
        return set()

    return perms


def _check_permission(perms: set[str], required: str) -> bool:
    req = _normalize_perm(required)
    if not req:
        return True
    if _has_wildcard(perms):
        return True
    if req in perms:
        return True
    # Support hierarchical wildcard, e.g. students.* covers students.read
    if "." in req:
        prefix = req.split(".", 1)[0] + ".*"
        if prefix in perms:
            return True
    return False


# Dependency factories

def require_permission(permission: str):
    def _dep(request: Request, user: Any = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
        perms = user_permissions_from_db(db, user)
        if not _check_permission(perms, permission):
            raise http_error(
                403,
                ErrorCode.FORBIDDEN,
                f"Missing permission: {permission}",
                request,
                context={"required_permission": permission, "user_email": getattr(user, "email", None)},
            )
        return user

    return _dep


def optional_require_permission(permission: str):
    """Permission checker that respects AUTH_ENABLED.

    - When AUTH is disabled: returns a dummy admin-like user for tests
    - When AUTH is enabled: verifies permission via DB or defaults
    """
    if not getattr(settings, "AUTH_ENABLED", False):
        def _disabled():  # no-arg dependency for tests
            from types import SimpleNamespace
            return SimpleNamespace(id=1, email="admin@example.com", role="admin", is_active=True, full_name="Admin User")
        return _disabled

    def _dep(request: Request, user: Any = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
        perms = user_permissions_from_db(db, user)
        if not _check_permission(perms, permission):
            raise http_error(
                403,
                ErrorCode.FORBIDDEN,
                f"Missing permission: {permission}",
                request,
                context={"required_permission": permission, "current_role": getattr(user, "role", None)},
            )
        return user

    return _dep
