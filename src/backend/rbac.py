"""
RBAC (Role-Based Access Control) utilities for Student Management System.

Provides permission checking decorators and helper functions for endpoint protection.
Implements self-access logic for student-scoped permissions.
"""

import asyncio
import inspect
from functools import wraps
from typing import Any, Callable, Optional, Sequence, Union, cast, get_type_hints

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from backend import permission_cache
from backend.db import get_session as get_db
from backend.models import Permission, RolePermission, Student, User, UserPermission, UserRole
from backend.security.current_user import get_current_user, resolve_current_user

# The dependency as imported. A test may replace ``backend.rbac.get_current_user``; the
# decorators below use the blocking core in a worker thread only while it is still this one.
_get_current_user = get_current_user


# ---------------------------------------------------------------------------
# Keeping the event loop free
# ---------------------------------------------------------------------------
# Every edition runs one uvicorn process, and the decorators in this module wrap an endpoint
# in a coroutine. Whatever that coroutine does without awaiting holds the event loop, and with
# it every other request (and /health). The user lookup, the permission checks and a plain
# ``def`` endpoint are all blocking database work, so each of them runs in a worker thread.
# An ``async def`` endpoint is awaited as before; what it blocks on is its own affair.


async def _resolve_user(request: Request, db: Any) -> Any:
    """The account behind the request's bearer token; the database read runs off the loop."""
    if get_current_user is _get_current_user:
        return await run_in_threadpool(resolve_current_user, request, None, db)
    # Replaced (a test's stand-in): call it the way it was always called.
    return await get_current_user(request=request, db=db)


async def _call_endpoint(func: Callable, args: tuple, call_kwargs: dict) -> Any:
    """Run the decorated endpoint: a coroutine function on the loop, a plain function off it."""
    if inspect.iscoroutinefunction(func):
        return await func(*args, **call_kwargs)
    result = await run_in_threadpool(func, *args, **call_kwargs)
    if inspect.isawaitable(result):
        # A plain function that hands back a coroutine (a decorator around an async endpoint).
        result = await result
    return result


def _holds_any_permission(
    user: Any,
    permission_keys: Sequence[str],
    db: Session,
    allow_self_access: bool,
    request: Optional[Request],
    student_id: Any,
) -> bool:
    """Blocking. True when ``user`` holds one of the permissions, or may reach its own data."""
    if any(has_permission(user, key, db) for key in permission_keys):
        return True
    if allow_self_access and request:
        return any(_is_self_access(user, key, request, student_id, db) for key in permission_keys)
    return False


def _first_missing_permission(user: Any, permission_keys: Sequence[str], db: Session) -> Optional[str]:
    """Blocking. The first of ``permission_keys`` that ``user`` does not hold, or None."""
    for key in permission_keys:
        if not has_permission(user, key, db):
            return key
    return None


def _finish_session(db_gen: Any) -> None:
    """Blocking. Advance a ``get_db()`` generator opened by a decorator, which closes its session."""
    try:
        next(db_gen)
    except StopIteration:
        pass


async def _close_opened_session(db_gen: Any) -> None:
    """Close a session a decorator opened for itself, off the loop (it can mean a round trip).

    Shielded: this runs in a ``finally``, also when the request was cancelled (the client went
    away), and the session has to be closed all the same.
    """
    await asyncio.shield(run_in_threadpool(_finish_session, db_gen))


def _safe_rollback(db: Session) -> None:
    """Best-effort rollback to clear failed transaction state."""
    try:
        db.rollback()
    except Exception:
        pass


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


def _normalize_required_permission_keys(permission_key: str | Sequence[str]) -> tuple[str, ...]:
    """Normalize one or more required permissions for decorator checks."""

    if isinstance(permission_key, str):
        return (_normalize_permission_key(permission_key),)
    normalized = tuple(_normalize_permission_key(key) for key in permission_key if key)
    return normalized or ("",)


def _format_permission_requirement(permission_keys: Sequence[str]) -> str:
    if len(permission_keys) == 1:
        return f"'{permission_keys[0]}'"
    joined = "', '".join(permission_keys)
    return f"one of '{joined}'"


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


# What an account may do is what its rows say: the permissions granted to the account itself
# (user_permissions) and the ones of the roles it holds (user_roles -> role_permissions).
# There is no other source. Until November 2026 an account without a matching role row got a
# built-in list for the word in its Role column, so a leftover word could grant access that no
# row stood for. The rows of every administrator and teacher account are made sure of at each
# start (backend.routers.routers_rbac.backfill_role_rows).


def has_permission(user: User, permission_key: str, db: Session) -> bool:
    """Check if a user has a specific permission (through a role, or granted to the account).

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

    # Opt-in (PERMISSION_CACHE_TTL_SECONDS): reuse a recent answer instead of asking the
    # database again. Off by default; see backend.permission_cache for what it trades away.
    cached = permission_cache.get(user, required_key)
    if cached is not None:
        return cached
    allowed = _compute_permission(user, required_key, db)
    permission_cache.put(user, required_key, allowed)
    return allowed


def _compute_permission(user: User, required_key: str, db: Session) -> bool:
    """The uncached permission decision: grants to the account, then grants to its roles."""

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
        # If anything goes wrong with direct permissions, the role grants still decide
        _safe_rollback(db)
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
        # A database error here grants nothing
        _safe_rollback(db)
        pass

    # Evaluate matches
    if any(_permission_matches(g, required_key) for g in granted):
        return True

    return False


def _is_self_access(
    user: User,
    permission_key: str,
    request: Request,
    student_id: Optional[int] = None,
    db: Optional[Session] = None,
) -> bool:
    """
    Check if the request is for self-access (student accessing their own record).

    A student's `User.id` (login account) and `Student.id` (student record) are
    different ID spaces — a student is only granted access to a `students` row
    whose `Student.user_id` points back to their own account, resolved via `db`.

    Args:
        user: Current user
        permission_key: Permission being checked
        request: FastAPI request object
        student_id: Optional `students.id` of the resource being accessed, if
            already known to the caller (e.g. extracted from the route kwargs)
        db: Database session used to resolve the student_id -> owning user_id

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

    resolved_student_id: Union[int, str, None] = student_id

    # Check path parameters for student_id
    if resolved_student_id is None and hasattr(request, "path_params"):
        resolved_student_id = request.path_params.get("student_id")

    # Check query parameters for user_id or student_id
    if resolved_student_id is None and hasattr(request, "query_params"):
        resolved_student_id = request.query_params.get("user_id") or request.query_params.get("student_id")

    # If no specific resource identified, allow (for listing own data) — the
    # endpoint itself is responsible for scoping results to the caller.
    if resolved_student_id is None:
        return True

    try:
        resolved_student_id = int(resolved_student_id)
    except (ValueError, TypeError):
        return False

    if db is None:
        return False

    student = db.query(Student).filter(Student.id == resolved_student_id).first()
    return bool(student is not None and student.user_id == user.id)


def require_permission(
    permission_key: str | Sequence[str],
    allow_self_access: bool = False,
) -> Callable:
    """
    Decorator to require one or more permissions for an endpoint.

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
        permission_key: Permission key in format "resource:action", or a
            sequence where any listed permission grants access.
        allow_self_access: If True, allows students to access their own data

    Returns:
        Decorator function
    """

    permission_keys = _normalize_required_permission_keys(permission_key)

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

            # Everything below is wrapped in try/finally so a db_gen opened
            # above is always advanced (closing its session) exactly once on
            # every exit path, including the HTTPException raises for 401/
            # 403/500 - those used to skip the close entirely, leaking a
            # session per rejected request.
            try:
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
                    return await _call_endpoint(func, args, call_kwargs)

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
                    current_user = await _resolve_user(request, db)

                # In permissive mode without token, allow access without checks
                if auth_mode == "permissive" and not current_user:
                    call_kwargs = {**kwargs, "request": request}
                    if accepts_db:
                        call_kwargs["db"] = db
                    return await _call_endpoint(func, args, call_kwargs)

                # Enforce permission for authenticated users (permissive or strict)
                if not current_user:
                    raise HTTPException(status_code=401, detail="Authentication required")

                if not db:
                    raise HTTPException(status_code=500, detail="Database session not available")

                allowed = await run_in_threadpool(
                    _holds_any_permission,
                    current_user,
                    permission_keys,
                    db,
                    allow_self_access,
                    request,
                    kwargs.get("student_id"),
                )
                if not allowed:
                    requirement = _format_permission_requirement(permission_keys)
                    raise HTTPException(status_code=403, detail=f"Permission denied: requires {requirement}")

                # Call the wrapped function, conditionally passing db if the function accepts it
                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if accepts_db and "db" not in call_kwargs:
                    call_kwargs["db"] = db

                return await _call_endpoint(func, args, call_kwargs)
            finally:
                if db_gen is not None:
                    await _close_opened_session(db_gen)

        try:
            wrapper.__annotations__ = get_type_hints(func, globalns=func.__globals__, localns=None)
        except Exception:
            # Fall back to original annotations if resolution fails
            wrapper.__annotations__ = getattr(func, "__annotations__", {})

        cast(Any, wrapper).__signature__ = sig
        return wrapper

    return decorator


def check_permission(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
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
    try:
        direct_perms = (
            db.query(Permission)
            .join(UserPermission)
            .filter(
                UserPermission.user_id == user.id,
                Permission.is_active.is_(True),
            )
            .all()
        )
        # Cast p.key to str to satisfy mypy (p.key is Column[str] at static analysis but str at runtime)
        permission_keys.update(_normalize_permission_key(str(p.key)) for p in direct_perms)
    except Exception:
        _safe_rollback(db)

    # Get role-based permissions (using raw SQL to avoid schema mismatch)
    try:
        result = db.execute(
            text(
                """
                SELECT DISTINCT p.key
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = :user_id
                  AND p.is_active IS TRUE
            """
            ),
            {"user_id": user.id},
        )

        for row in result:
            permission_keys.add(_normalize_permission_key(row[0]))
    except Exception:
        _safe_rollback(db)

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

            # Wrapped in try/finally so db_gen is always advanced (closing
            # its session) exactly once on every exit path, including the
            # HTTPException raises below.
            try:
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
                    return await _call_endpoint(func, args, call_kwargs)

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
                    current_user = await _resolve_user(request, db)

                # Permissive without token: allow
                if auth_mode == "permissive" and not current_user:
                    call_kwargs = {**kwargs}
                    if request is not None:
                        call_kwargs["request"] = request
                    if "db" in sig.parameters and "db" not in call_kwargs:
                        call_kwargs["db"] = db
                    return await _call_endpoint(func, args, call_kwargs)

                # Enforce any-of permissions for authenticated users
                if not current_user:
                    raise HTTPException(status_code=401, detail="Authentication required")
                if not db:
                    raise HTTPException(status_code=500, detail="Database session not available")

                allowed = await run_in_threadpool(
                    _holds_any_permission,
                    current_user,
                    permission_keys,
                    db,
                    allow_self_access,
                    request,
                    kwargs.get("student_id"),
                )
                if not allowed:
                    raise HTTPException(status_code=403, detail=f"Permission denied: requires one of {permission_keys}")

                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                return await _call_endpoint(func, args, call_kwargs)
            finally:
                if db_gen is not None:
                    await _close_opened_session(db_gen)

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

            # Wrapped in try/finally so db_gen is always advanced (closing
            # its session) exactly once on every exit path, including the
            # HTTPException raises below.
            try:
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
                    return await _call_endpoint(func, args, call_kwargs)

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
                    current_user = await _resolve_user(request, db)

                # Permissive without token: allow
                if auth_mode == "permissive" and not current_user:
                    call_kwargs = {**kwargs}
                    if request is not None:
                        call_kwargs["request"] = request
                    if "db" in sig.parameters and "db" not in call_kwargs:
                        call_kwargs["db"] = db
                    return await _call_endpoint(func, args, call_kwargs)

                # Enforce all-of permissions for authenticated users
                if not current_user:
                    raise HTTPException(status_code=401, detail="Authentication required")
                if not db:
                    raise HTTPException(status_code=500, detail="Database session not available")

                missing = await run_in_threadpool(_first_missing_permission, current_user, permission_keys, db)
                if missing is not None:
                    raise HTTPException(status_code=403, detail=f"Permission denied: requires '{missing}'")

                call_kwargs = {**kwargs}
                if request is not None:
                    call_kwargs["request"] = request
                if "db" in sig.parameters and "db" not in call_kwargs:
                    call_kwargs["db"] = db
                return await _call_endpoint(func, args, call_kwargs)
            finally:
                if db_gen is not None:
                    await _close_opened_session(db_gen)

        cast(Any, wrapper).__signature__ = sig
        return wrapper

    return decorator
