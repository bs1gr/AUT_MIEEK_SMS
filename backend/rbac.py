"""
RBAC (Role-Based Access Control) utilities for Student Management System.

Provides permission checking decorators and helper functions for endpoint protection.
Implements self-access logic for student-scoped permissions.
"""

from functools import wraps
from typing import Any, Callable, Optional, cast

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.models import Permission, RolePermission, User, UserPermission, UserRole
from backend.security.current_user import get_current_user


def _normalize_permission_key(key: str) -> str:
    """Normalize permission keys to a consistent `resource:action` format.

    - Trims whitespace and lowercases
    - Converts the first "." to ":" for backward compatibility (e.g., "imports.preview" -> "imports:preview")
    - Treats "*" and "*:*" as the same wildcard
    """

    cleaned = (key or "").strip().lower()
    if cleaned in {"*", "*:*"}:
        return "*:*"
    if ":" not in cleaned and "." in cleaned:
        left, right = cleaned.split(".", 1)
        cleaned = f"{left}:{right}"
    return cleaned


def _permission_matches(granted: str, required: str) -> bool:
    """Return True if a granted permission satisfies the required permission.

    Supports:
    - Global wildcard (*:*)
    - Resource wildcards (e.g., students:* covers students:view)
    - Backward compatibility for dot or colon separators
    """

    granted_key = _normalize_permission_key(granted)
    required_key = _normalize_permission_key(required)

    if not required_key:
        return True

    if granted_key == "*:*":
        return True

    if required_key == "*:*":
        return granted_key == "*:*"

    # Resource wildcard support (e.g., students:* allows students:view)
    if granted_key.endswith(":*"):
        resource = granted_key.split(":", 1)[0]
        return required_key.startswith(f"{resource}:")

    return granted_key == required_key


def _default_role_permissions(role: Optional[str]) -> set[str]:
    """Permissive defaults for legacy roles and relaxed policy."""

    role_key = (role or "").strip().lower()
    defaults: dict[str, set[str]] = {
        "admin": {"*:*"},
        "teacher": {
            "students:view",
            "students:edit",
            "courses:view",
            "grades:view",
            "grades:edit",
            "attendance:view",
            "attendance:edit",
            "enrollments:view",
            "enrollments:manage",
            "reports:view",
            "analytics:view",
            "system:export",
            "notifications:manage",
        },
        "guest": {"students:view", "courses:view"},
        "viewer": {"students:view", "courses:view", "grades:view", "attendance:view"},
        "student": {
            "students.self:read",
            "grades.self:read",
            "attendance.self:read",
        },
    }

    return defaults.get(role_key, set())


def has_permission(user: User, permission_key: str, db: Session) -> bool:
    """Check if a user has a specific permission (role, direct, or fallback).

    The check is intentionally permissive when AUTH_MODE is disabled and
    supports dot/colon separators plus wildcards.
    """

    if not user:
        return False

    required_key = _normalize_permission_key(permission_key)

    # Bypass permission checks if auth is disabled (test mode)
    try:
        from backend.config import settings

        auth_mode = getattr(settings, "AUTH_MODE", "disabled")
        if auth_mode == "disabled":
            return True
    except Exception:
        auth_mode = "disabled"

    # Collect granted permissions
    granted: set[str] = set()

    # Direct user permissions (respect expiration)
    try:
        user_perms = (
            db.query(UserPermission, Permission)
            .join(Permission, UserPermission.permission_id == Permission.id)
            .filter(
                UserPermission.user_id == user.id,
                Permission.is_active.is_(True),
            )
            .all()
        )
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        for up, perm in user_perms:
            if up.expires_at:
                expires_at = up.expires_at
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if now > expires_at:
                    continue
            granted.add(_normalize_permission_key(perm.key))
    except Exception:
        # If anything goes wrong with direct permissions, fall back to role mapping
        pass

    # Role-based permissions
    try:
        role_perm_rows = (
            db.query(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(UserRole, UserRole.role_id == RolePermission.role_id)
            .filter(UserRole.user_id == user.id, Permission.is_active.is_(True))
            .all()
        )
        granted.update(_normalize_permission_key(k) for (k,) in role_perm_rows)
    except Exception:
        # Ignore DB issues here; fallback defaults will still apply
        pass

    # Evaluate matches
    if any(_permission_matches(g, required_key) for g in granted):
        return True

    # Check if user has ANY role assignments in the RBAC system
    try:
        count = db.execute(
            text("SELECT COUNT(*) FROM user_roles WHERE user_id = :user_id"),
            {"user_id": user.id},
        ).scalar()
        # Ensure a concrete int for type checking/comparison
        has_role_assignments = int(cast(int, count or 0)) > 0
    except Exception:
        has_role_assignments = False

    # Only use default role permissions if:
    # 1. No explicit permissions were found, AND
    # 2. User has no role assignments in the RBAC system (legacy user)
    # This preserves backward compatibility while respecting explicit RBAC setup
    if not granted and not has_role_assignments:
        default_perms = _default_role_permissions(getattr(user, "role", None))
        if any(_permission_matches(g, required_key) for g in default_perms):
            return True

    return False


def _is_self_access(
    user: User,
    permission_key: str,
    request: Request,
    resource_user_id: Optional[int] = None,
) -> bool:
    """
    Check if the request is for self-access (student accessing own data).

    Args:
        user: Current user
        permission_key: Permission being checked
        request: FastAPI request object
        resource_user_id: Optional user_id of the resource being accessed

    Returns:
        True if this is valid self-access, False otherwise
    """
    # Only applies to student role
    if not user or user.role != "student":
        return False

    # Check if permission allows self-access (based on permission key)
    # Self-access permissions: students:view, grades:view, attendance:view, performance:view
    self_access_permissions = [
        "students:view",
        "grades:view",
        "attendance:view",
        "performance:view",
        "highlights:view",
    ]

    if permission_key not in self_access_permissions:
        return False

    # If resource_user_id provided, check it matches current user
    if resource_user_id is not None:
        return resource_user_id == user.id

    # Check path parameters for student_id
    if hasattr(request, "path_params"):
        student_id = request.path_params.get("student_id")
        if student_id:
            try:
                return int(student_id) == user.id
            except (ValueError, TypeError):
                return False

    # Check query parameters for user_id or student_id
    if hasattr(request, "query_params"):
        user_id_param = request.query_params.get("user_id") or request.query_params.get("student_id")
        if user_id_param:
            try:
                return int(user_id_param) == user.id
            except (ValueError, TypeError):
                return False

    # If no specific resource identified, allow (for listing own data)
    return True


def require_permission(
    permission_key: str,
    allow_self_access: bool = False,
) -> Callable:
    """
    Decorator to require a specific permission for an endpoint.

    Usage:
        @router.get("/students/{student_id}")
        @require_permission("students:view", allow_self_access=True)
        async def get_student(
            student_id: int,
            request: Request,
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db),
        ):
            ...

    Args:
        permission_key: Permission key in format "resource:action"
        allow_self_access: If True, allows students to access their own data

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        import inspect

        # Inspect function signature to determine if it accepts 'db' parameter
        sig = inspect.signature(func)
        accepts_db = "db" in sig.parameters

        # Always create async wrapper for FastAPI endpoints
        # This handles cases where func might be wrapped by other decorators (e.g., @cached)
        @wraps(func)
        async def wrapper(*args, **kwargs):
            bound = sig.bind_partial(*args, **kwargs)
            request = bound.arguments.get("request")

            db: Session | None = None
            db_gen = None
            if "db" in bound.arguments:
                db = bound.arguments.get("db")
            else:
                db_gen = get_db()
                try:
                    db = next(db_gen)
                except StopIteration:
                    db = None
            # Determine auth mode up-front
            try:
                from backend.config import settings

                auth_mode = getattr(settings, "AUTH_MODE", "disabled")
            except Exception:
                auth_mode = "disabled"

            # When authentication is disabled (tests/emergency), skip all checks
            if auth_mode == "disabled":
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if accepts_db and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    result = await result
                if db_gen is not None:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
                return result

            # In permissive/strict modes, check for bearer token
            if request is None:
                raise HTTPException(status_code=500, detail="Request not available")

            auth_header = request.headers.get("Authorization") or ""
            has_bearer = auth_header.lower().startswith("bearer ")

            # Strict mode requires a token
            if auth_mode == "strict" and not has_bearer:
                raise HTTPException(status_code=401, detail="Authentication required")

            current_user = None
            if has_bearer:
                # Resolve current user only if a token is present
                current_user = await get_current_user(request=request, db=db)

            # In permissive mode without token, allow access without checks
            if auth_mode == "permissive" and not current_user:
                call_kwargs = {**kwargs, "request": request}
                if accepts_db:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    return await result
                return result

            # Enforce permission for authenticated users (permissive or strict)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            has_perm = has_permission(current_user, permission_key, db)
            has_self = False

            if allow_self_access and request:
                student_id = kwargs.get("student_id")
                has_self = _is_self_access(current_user, permission_key, request, student_id)

            if not has_perm and not has_self:
                raise HTTPException(status_code=403, detail=f"Permission denied: requires '{permission_key}'")

            # Call the wrapped function, conditionally passing db if the function accepts it
            call_kwargs = {**kwargs}
            if request is not None:
                call_kwargs["request"] = request
            if accepts_db and "db" not in call_kwargs:
                call_kwargs["db"] = db

            result = func(*args, **call_kwargs)

            import asyncio as _asyncio

            if _asyncio.iscoroutine(result):
                result = await result
            if db_gen is not None:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
            return result

        cast(Any, wrapper).__signature__ = sig
        return wrapper

    return decorator


def check_permission(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Callable[[str], bool]:
    """
    Dependency that returns a function to check permissions for the current user.

    Usage:
        @router.get("/students/")
        async def list_students(
            check_perm: Callable[[str], bool] = Depends(check_permission),
        ):
            if not check_perm("students:view_all"):
                raise HTTPException(403, "Permission denied")
            ...

    Returns:
        Function that checks if user has a permission
    """

    def check(permission_key: str) -> bool:
        return has_permission(current_user, permission_key, db)

    return check


def get_user_permissions(user: User, db: Session) -> list[str]:
    """
    Get all permission keys for a user (from roles and direct assignments).

    Args:
        user: User instance
        db: Database session

    Returns:
        List of permission keys (e.g., ["students:view", "grades:edit"])
    """
    if not user:
        return []

    permission_keys: set[str] = set()

    # Get direct permissions
    direct_perms = (
        db.query(Permission)
        .join(UserPermission)
        .filter(
            UserPermission.user_id == user.id,
            Permission.is_active,
        )
        .all()
    )
    # Cast p.key to str to satisfy mypy (p.key is Column[str] at static analysis but str at runtime)
    permission_keys.update(_normalize_permission_key(str(p.key)) for p in direct_perms)

    # Get role-based permissions (using raw SQL to avoid schema mismatch)
    result = db.execute(
        text(
            """
            SELECT DISTINCT p.key
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = :user_id
              AND p.is_active = 1
        """
        ),
        {"user_id": user.id},
    )

    for row in result:
        permission_keys.add(_normalize_permission_key(row[0]))

    # Check if user has ANY role assignments in the RBAC system
    count = db.execute(
        text("SELECT COUNT(*) FROM user_roles WHERE user_id = :user_id"),
        {"user_id": user.id},
    ).scalar()
    has_role_assignments = int(cast(int, count or 0)) > 0

    # Only include default role permissions if:
    # 1. User has no explicit RBAC permissions, AND
    # 2. User has no role assignments in the RBAC system (legacy user)
    # This preserves backward compatibility while respecting explicit RBAC setup
    if not permission_keys and not has_role_assignments:
        permission_keys.update(_default_role_permissions(getattr(user, "role", None)))

    return sorted(list(permission_keys))


def require_any_permission(*permission_keys: str, allow_self_access: bool = False) -> Callable:
    """
    Decorator to require ANY of the specified permissions (OR logic).

    Args:
        *permission_keys: Variable number of permission keys
        allow_self_access: If True, allows students to access their own data

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        import inspect

        sig = inspect.signature(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            bound = sig.bind_partial(*args, **kwargs)
            request = bound.arguments.get("request")

            db: Session | None = None
            db_gen = None
            if "db" in bound.arguments:
                db = bound.arguments.get("db")
            else:
                db_gen = get_db()
                try:
                    db = next(db_gen)
                except StopIteration:
                    db = None
            # Determine auth mode
            try:
                from backend.config import settings

                auth_mode = getattr(settings, "AUTH_MODE", "disabled")
            except Exception:
                auth_mode = "disabled"

            # Disabled: skip checks
            if auth_mode == "disabled":
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    result = await result
                if db_gen is not None:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
                return result

            # Check for bearer token
            if request is None:
                raise HTTPException(status_code=500, detail="Request not available")

            auth_header = request.headers.get("Authorization") or ""
            has_bearer = auth_header.lower().startswith("bearer ")

            # Strict requires token
            if auth_mode == "strict" and not has_bearer:
                raise HTTPException(status_code=401, detail="Authentication required")

            current_user = None
            if has_bearer:
                current_user = await get_current_user(request=request, db=db)

            # Permissive without token: allow
            if auth_mode == "permissive" and not current_user:
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    result = await result
                if db_gen is not None:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
                return result

            # Enforce any-of permissions for authenticated users
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            for perm_key in permission_keys:
                if has_permission(current_user, perm_key, db):
                    call_kwargs = {**kwargs}
                    if request is not None:
                        call_kwargs["request"] = request
                    if "db" in sig.parameters and "db" not in call_kwargs:
                        call_kwargs["db"] = db
                    result = func(*args, **call_kwargs)
                    import asyncio as _asyncio

                    if _asyncio.iscoroutine(result):
                        result = await result
                    if db_gen is not None:
                        try:
                            next(db_gen)
                        except StopIteration:
                            pass
                    return result

                if allow_self_access and request:
                    student_id = kwargs.get("student_id")
                    if _is_self_access(current_user, perm_key, request, student_id):
                        call_kwargs = {**kwargs}
                        if request is not None:
                            call_kwargs["request"] = request
                        if "db" in sig.parameters and "db" not in call_kwargs:
                            call_kwargs["db"] = db
                        result = func(*args, **call_kwargs)
                        import asyncio as _asyncio

                        if _asyncio.iscoroutine(result):
                            result = await result
                        if db_gen is not None:
                            try:
                                next(db_gen)
                            except StopIteration:
                                pass
                        return result

            if db_gen is not None:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
            raise HTTPException(status_code=403, detail=f"Permission denied: requires one of {permission_keys}")

        cast(Any, wrapper).__signature__ = sig
        return wrapper

    return decorator


def require_all_permissions(*permission_keys: str) -> Callable:
    """
    Decorator to require ALL of the specified permissions (AND logic).

    Args:
        *permission_keys: Variable number of permission keys

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        import inspect

        sig = inspect.signature(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            bound = sig.bind_partial(*args, **kwargs)
            request = bound.arguments.get("request")

            db: Session | None = None
            db_gen = None
            if "db" in bound.arguments:
                db = bound.arguments.get("db")
            else:
                db_gen = get_db()
                try:
                    db = next(db_gen)
                except StopIteration:
                    db = None
            # Determine auth mode
            try:
                from backend.config import settings

                auth_mode = getattr(settings, "AUTH_MODE", "disabled")
            except Exception:
                auth_mode = "disabled"

            # Disabled: skip checks
            if auth_mode == "disabled":
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    result = await result
                if db_gen is not None:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
                return result

            # Check for bearer token
            if request is None:
                raise HTTPException(status_code=500, detail="Request not available")

            auth_header = request.headers.get("Authorization") or ""
            has_bearer = auth_header.lower().startswith("bearer ")

            # Strict requires token
            if auth_mode == "strict" and not has_bearer:
                raise HTTPException(status_code=401, detail="Authentication required")

            current_user = None
            if has_bearer:
                current_user = await get_current_user(request=request, db=db)

            # Permissive without token: allow
            if auth_mode == "permissive" and not current_user:
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                result = func(*args, **call_kwargs)
                import asyncio as _asyncio

                if _asyncio.iscoroutine(result):
                    result = await result
                if db_gen is not None:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
                return result

            # Enforce all-of permissions for authenticated users
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            for perm_key in permission_keys:
                if not has_permission(current_user, perm_key, db):
                    raise HTTPException(status_code=403, detail=f"Permission denied: requires '{perm_key}'")

            call_kwargs = {**kwargs}
            if request is not None:
                call_kwargs["request"] = request
            if "db" in sig.parameters and "db" not in call_kwargs:
                call_kwargs["db"] = db
            result = func(*args, **call_kwargs)
            import asyncio as _asyncio

            if _asyncio.iscoroutine(result):
                result = await result
            if db_gen is not None:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
            return result

        cast(Any, wrapper).__signature__ = sig
        return wrapper

    return decorator
