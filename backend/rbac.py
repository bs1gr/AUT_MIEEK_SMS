"""
RBAC (Role-Based Access Control) utilities for Student Management System.

Provides permission checking decorators and helper functions for endpoint protection.
Implements self-access logic for student-scoped permissions.
"""

from functools import wraps
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.models import Permission, RolePermission, User, UserPermission, UserRole
from backend.security.current_user import get_current_user


def has_permission(user: User, permission_key: str, db: Session) -> bool:
    """
    Check if user has a specific permission (via role or direct assignment).

    When AUTH_MODE is 'disabled', always returns True (auth bypass).

    Args:
        user: User instance to check
        permission_key: Permission key in format "resource:action" (e.g., "students:view")
        db: Database session

    Returns:
        True if user has the permission, False otherwise
    """
    if not user:
        return False

    # Bypass permission checks if auth is disabled (test mode)
    try:
        from backend.config import settings

        auth_mode = getattr(settings, "AUTH_MODE", "disabled")
        if auth_mode == "disabled":
            return True
    except Exception:
        # If settings not available, continue with normal permission check
        pass

    # Check direct user permissions first
    user_perm = (
        db.query(UserPermission)
        .join(Permission)
        .filter(
            UserPermission.user_id == user.id,
            Permission.key == permission_key,
            Permission.is_active.is_(True),
        )
        .first()
    )

    if user_perm:
        # Check expiration if set
        if user_perm.expires_at:
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            # Ensure both datetimes are timezone-aware for comparison
            expires_at = user_perm.expires_at
            if expires_at.tzinfo is None:
                # Make naive datetime timezone-aware (assume UTC)
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                return False
        return True

    # Check role-based permissions (using raw SQL to avoid schema mismatch)
    permission = (
        db.query(Permission)
        .filter(
            Permission.key == permission_key,
            Permission.is_active.is_(True),
        )
        .first()
    )

    if not permission:
        return False

    role_perm = (
        db.query(RolePermission)
        .join(UserRole, RolePermission.role_id == UserRole.role_id)
        .filter(
            UserRole.user_id == user.id,
            RolePermission.permission_id == permission.id,
        )
        .first()
    )

    return role_perm is not None


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
        @wraps(func)
        async def wrapper(
            *args,
            request: Request,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user),
            **kwargs,
        ):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            if has_permission(current_user, permission_key, db):
                return await func(*args, request=request, db=db, current_user=current_user, **kwargs)

            if allow_self_access and request:
                student_id = kwargs.get("student_id")
                if _is_self_access(current_user, permission_key, request, student_id):
                    return await func(*args, request=request, db=db, current_user=current_user, **kwargs)

            raise HTTPException(status_code=403, detail=f"Permission denied: requires '{permission_key}'")

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
        db.query(Permission.key)
        .join(UserPermission)
        .filter(
            UserPermission.user_id == user.id,
            Permission.is_active,
        )
        .all()
    )
    permission_keys.update(p.key for p in direct_perms)

    # Get role-based permissions (using raw SQL to avoid schema mismatch)
    result = db.execute(
        text("""
            SELECT DISTINCT p.key
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = :user_id
              AND p.is_active = 1
        """),
        {"user_id": user.id},
    )

    for row in result:
        permission_keys.add(row[0])

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
        @wraps(func)
        async def wrapper(
            *args,
            request: Request,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user),
            **kwargs,
        ):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            for perm_key in permission_keys:
                if has_permission(current_user, perm_key, db):
                    return await func(*args, request=request, db=db, current_user=current_user, **kwargs)

                if allow_self_access and request:
                    student_id = kwargs.get("student_id")
                    if _is_self_access(current_user, perm_key, request, student_id):
                        return await func(*args, request=request, db=db, current_user=current_user, **kwargs)

            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: requires one of {permission_keys}",
            )

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
        @wraps(func)
        async def wrapper(
            *args,
            request: Request,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user),
            **kwargs,
        ):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")

            for perm_key in permission_keys:
                if not has_permission(current_user, perm_key, db):
                    raise HTTPException(
                        status_code=403,
                        detail=f"Permission denied: requires '{perm_key}'",
                    )

            return await func(*args, request=request, db=db, current_user=current_user, **kwargs)

        return wrapper

    return decorator
