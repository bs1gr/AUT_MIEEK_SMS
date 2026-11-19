"""
Enhanced RBAC Permission Management API endpoints.

Provides endpoints for managing the new permission structure with key/resource/action.
Complements the existing routers_rbac.py with enhanced functionality.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.db import get_session as get_db
from backend.models import Permission, Role, RolePermission, User, UserPermission
from backend.rbac import get_user_permissions, has_permission, require_permission
from backend.schemas.permissions import (
    PermissionCreate,
    PermissionDetail,
    PermissionListItem,
    PermissionsByResourceResponse,
    PermissionStatsResponse,
    PermissionUpdate,
    RolePermissionGrant,
    RolePermissionRevoke,
    UserPermissionGrant,
    UserPermissionRevoke,
    UserPermissionsResponse,
)
from backend.schemas.audit import AuditAction, AuditResource
from backend.security.current_user import get_current_user

router = APIRouter(prefix="/permissions", tags=["Permissions Management"])
logger = logging.getLogger(__name__)


def _record(request: Request, db: Session, action: AuditAction, details: dict[str, Any], account_id: Any = None) -> None:
    """Write a grant or a revoke to the audit log, with who made it.

    The four requests of the Permissions Catalog changed what a role or an account may do
    without a line in the audit log (the older requests under /admin/rbac wrote one). Called
    after the change is committed; a failure to write the entry is logged and never fails
    the request.
    """
    try:
        from backend.services.audit_service import get_audit_logger

        get_audit_logger(db).log_from_request(
            request,
            action=action,
            resource=AuditResource.USER,
            resource_id=str(account_id) if account_id is not None else None,
            details=details,
        )
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        logger.warning("The audit entry for %s could not be written: %r", details, exc)

# The permission that makes an administrator one. The role "admin" holds it, and the requests
# below refuse to take it from that role, to switch it off or to delete it.
ADMIN_WILDCARD = "*:*"


@router.get("/", response_model=list[PermissionListItem])
@require_permission("permissions:view")
def list_permissions(
    request: Request,
    resource: Optional[str] = Query(None, description="Filter by resource"),
    action: Optional[str] = Query(None, description="Filter by action"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in key or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all permissions with optional filtering.
    Requires 'permissions:view' permission.
    """

    query = db.query(Permission)

    if resource:
        query = query.filter(Permission.resource == resource)
    if action:
        query = query.filter(Permission.action == action)
    if is_active is not None:
        query = query.filter(Permission.is_active == is_active)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter((Permission.key.ilike(search_pattern)) | (Permission.description.ilike(search_pattern)))

    query = query.order_by(Permission.resource, Permission.action)
    permissions = query.offset(skip).limit(limit).all()

    return [PermissionListItem.model_validate(p) for p in permissions]


@router.get("/by-resource", response_model=list[PermissionsByResourceResponse])
@require_permission("permissions:view")
def list_permissions_by_resource(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all permissions grouped by resource.
    Requires 'permissions:view' permission.
    """

    # Get all active permissions
    permissions = (
        db.query(Permission).filter(Permission.is_active).order_by(Permission.resource, Permission.action).all()
    )

    # Group by resource
    grouped: dict[Any, list[PermissionListItem]] = {}
    for perm in permissions:
        if perm.resource not in grouped:
            grouped[perm.resource] = []
        grouped[perm.resource].append(PermissionListItem.model_validate(perm))

    return [
        PermissionsByResourceResponse(resource=resource, permissions=perms)
        for resource, perms in sorted(grouped.items())
    ]


@router.get("/stats", response_model=PermissionStatsResponse)
@require_permission("permissions:view")
def get_permission_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get statistics about permissions.
    Requires 'permissions:view' permission.
    """

    total = db.query(Permission).count()
    active = db.query(Permission).filter(Permission.is_active).count()
    inactive = total - active

    # Permissions by resource
    by_resource = (
        db.query(Permission.resource, func.count(Permission.id).label("count"))
        .filter(Permission.is_active)
        .group_by(Permission.resource)
        .all()
    )

    permissions_by_resource = {resource: count for resource, count in by_resource}

    # Most common actions
    actions = (
        db.query(Permission.action, func.count(Permission.id).label("count"))
        .filter(Permission.is_active)
        .group_by(Permission.action)
        .order_by(func.count(Permission.id).desc())
        .limit(10)
        .all()
    )

    most_common_actions = [(action, count) for action, count in actions]

    return PermissionStatsResponse(
        total_permissions=total,
        active_permissions=active,
        inactive_permissions=inactive,
        permissions_by_resource=permissions_by_resource,
        most_common_actions=most_common_actions,
    )


@router.get("/{permission_id}", response_model=PermissionDetail)
@require_permission("permissions:view")
def get_permission(
    request: Request,
    permission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific permission.
    Requires 'permissions:view' permission.
    """

    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    return PermissionDetail.model_validate(permission)


@router.post("/", response_model=PermissionDetail, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def create_permission(
    request: Request,
    permission_data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new permission.
    Requires 'permissions:manage' permission.
    """

    # Check if permission with this key already exists
    existing = db.query(Permission).filter(Permission.key == permission_data.key).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Permission with key '{permission_data.key}' already exists")

    # Try to create using raw SQL first (for backward compatibility with 'name' column)
    # If that fails, use model (test DB doesn't have 'name' column)
    now = datetime.now(timezone.utc)
    try:
        db.execute(
            text("""
                INSERT INTO permissions (key, name, resource, action, description, is_active, created_at, updated_at)
                VALUES (:key, :name, :resource, :action, :description, :is_active, :created_at, :updated_at)
            """),
            {
                "key": permission_data.key,
                "name": permission_data.key,  # Use key as name for backward compatibility
                "resource": permission_data.resource,
                "action": permission_data.action,
                "description": permission_data.description,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        db.commit()
    except Exception:
        # Fall back to using the model (test DB without 'name' column)
        db.rollback()
        permission = Permission(
            key=permission_data.key,
            resource=permission_data.resource,
            action=permission_data.action,
            description=permission_data.description,
            is_active=True,
        )
        db.add(permission)
        db.commit()
        db.refresh(permission)

    # Fetch the created permission
    permission = db.query(Permission).filter(Permission.key == permission_data.key).first()
    answer = PermissionDetail.model_validate(permission)
    details = {"operation": "create_permission", "permission": permission_data.key}
    if permission_data.description:
        details["description"] = permission_data.description
    _record(request, db, AuditAction.PERMISSION_GRANT, details)
    return answer


@router.patch("/{permission_id}", response_model=PermissionDetail)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def update_permission(
    request: Request,
    permission_id: int,
    permission_update: PermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a permission's description or active status.
    Requires 'permissions:manage' permission.
    """

    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    # Switched off, the wildcard opens nothing: no administrator could manage accounts, roles
    # or permissions any more, this request included, so nobody could switch it on again.
    if permission.key == ADMIN_WILDCARD and permission_update.is_active is False:
        raise HTTPException(status_code=400, detail="The wildcard permission cannot be deactivated")

    was_description = permission.description
    was_active = bool(permission.is_active)

    # Update fields
    if permission_update.description is not None:
        permission.description = permission_update.description
    if permission_update.is_active is not None:
        permission.is_active = permission_update.is_active

    permission.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(permission)

    answer = PermissionDetail.model_validate(permission)
    # Switched off, a permission opens nothing for anybody who holds it: that is recorded as a
    # revoke, and switching it on again as a grant. A save that changed nothing writes nothing.
    details: dict[str, Any] = {"permission": answer.key}
    if answer.description != was_description:
        details["description"] = answer.description or ""
    if bool(answer.is_active) != was_active:
        details["operation"] = "activate_permission" if answer.is_active else "deactivate_permission"
        _record(
            request, db, AuditAction.PERMISSION_GRANT if answer.is_active else AuditAction.PERMISSION_REVOKE, details
        )
    elif "description" in details:
        details["operation"] = "update_permission"
        _record(request, db, AuditAction.UPDATE, details)
    return answer


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def delete_permission(
    request: Request,
    permission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a permission (hard delete).
    Requires 'permissions:manage' permission.
    Warning: This will cascade delete all role and user assignments!
    """

    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    if permission.key == ADMIN_WILDCARD:
        raise HTTPException(status_code=400, detail="The wildcard permission cannot be deleted")

    # The roles and the single accounts that held it lose it with it: said in the entry.
    details = {
        "operation": "delete_permission",
        "permission": permission.key,
        "roles": db.query(RolePermission).filter(RolePermission.permission_id == permission.id).count(),
        "accounts": db.query(UserPermission).filter(UserPermission.permission_id == permission.id).count(),
    }
    db.delete(permission)
    db.commit()
    _record(request, db, AuditAction.PERMISSION_REVOKE, details)

    return None


@router.post("/users/grant", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def grant_user_permission(
    request: Request,
    grant: UserPermissionGrant,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Grant a permission directly to a user (with optional expiration).
    Requires 'permissions:manage' permission.
    """

    # Validate user exists
    user = db.query(User).filter(User.id == grant.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate permission exists
    permission = db.query(Permission).filter(Permission.key == grant.permission_key, Permission.is_active).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found or inactive")

    # Check if already granted
    existing = (
        db.query(UserPermission)
        .filter(UserPermission.user_id == grant.user_id, UserPermission.permission_id == permission.id)
        .first()
    )

    if existing:
        # Update expiration if provided
        if grant.expires_at:
            existing.expires_at = grant.expires_at
            db.commit()
        return {"status": "already_granted", "updated_expiration": grant.expires_at is not None}

    # Create new user permission
    user_perm = UserPermission(
        user_id=grant.user_id,
        permission_id=permission.id,
        granted_by=current_user.id,
        granted_at=datetime.now(timezone.utc),
        expires_at=grant.expires_at,
    )
    db.add(user_perm)
    db.commit()
    _record(
        request,
        db,
        AuditAction.PERMISSION_GRANT,
        {"operation": "grant_to_account", "permission": grant.permission_key, "email": str(user.email)},
        account_id=grant.user_id,
    )

    return {"status": "granted", "user_id": grant.user_id, "permission_key": grant.permission_key}


@router.post("/users/revoke", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def revoke_user_permission(
    request: Request,
    revoke: UserPermissionRevoke,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke a direct user permission.
    Requires 'permissions:manage' permission.
    """

    # Find permission
    permission = db.query(Permission).filter(Permission.key == revoke.permission_key).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    # Find and delete user permission
    user_perm = (
        db.query(UserPermission)
        .filter(UserPermission.user_id == revoke.user_id, UserPermission.permission_id == permission.id)
        .first()
    )

    if not user_perm:
        raise HTTPException(status_code=404, detail="User permission assignment not found")

    db.delete(user_perm)
    db.commit()
    _record(
        request,
        db,
        AuditAction.PERMISSION_REVOKE,
        {"operation": "revoke_from_account", "permission": revoke.permission_key},
        account_id=revoke.user_id,
    )

    return {"status": "revoked", "user_id": revoke.user_id, "permission_key": revoke.permission_key}


@router.post("/roles/grant", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def grant_role_permission(
    request: Request,
    grant: RolePermissionGrant,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Grant a permission to a role.
    Requires 'permissions:manage' permission.
    """

    # Validate role exists
    role = db.query(Role).filter(Role.name == grant.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Validate permission exists
    permission = db.query(Permission).filter(Permission.key == grant.permission_key, Permission.is_active).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found or inactive")

    # Check if already granted (using raw SQL to avoid schema mismatch)
    existing = db.execute(
        text("SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
        {"role_id": role.id, "perm_id": permission.id},
    ).fetchone()

    if existing:
        return {"status": "already_granted"}

    # Grant permission (using raw SQL for created_at compatibility)
    now = datetime.now(timezone.utc)
    db.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (:role_id, :perm_id, :created_at)"
        ),
        {"role_id": role.id, "perm_id": permission.id, "created_at": now},
    )
    db.commit()
    _record(
        request,
        db,
        AuditAction.PERMISSION_GRANT,
        {"operation": "grant_permission", "role": grant.role_name, "permission": grant.permission_key},
    )

    return {"status": "granted", "role_name": grant.role_name, "permission_key": grant.permission_key}


@router.post("/roles/revoke", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
def revoke_role_permission(
    request: Request,
    revoke: RolePermissionRevoke,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke a permission from a role.
    Requires 'permissions:manage' permission.
    """

    # Find role
    role = db.query(Role).filter(Role.name == revoke.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Find permission
    permission = db.query(Permission).filter(Permission.key == revoke.permission_key).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    # The admin role keeps its wildcard, as POST /admin/rbac/revoke-permission has always
    # insisted. Without it no administrator passes a permission check any more, the checks of
    # this router and of the account panel included, until a restart seeds the grant again.
    if role.name == "admin" and permission.key == ADMIN_WILDCARD:
        raise HTTPException(status_code=400, detail="Cannot remove wildcard permission from admin role")

    # Delete role permission (using raw SQL)
    result = db.execute(
        text("DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
        {"role_id": role.id, "perm_id": permission.id},
    )

    if result.rowcount == 0:  # type: ignore[attr-defined]
        raise HTTPException(status_code=404, detail="Role permission assignment not found")

    db.commit()
    _record(
        request,
        db,
        AuditAction.PERMISSION_REVOKE,
        {"operation": "revoke_permission", "role": revoke.role_name, "permission": revoke.permission_key},
    )

    return {"status": "revoked", "role_name": revoke.role_name, "permission_key": revoke.permission_key}


@router.get("/users/{user_id}", response_model=UserPermissionsResponse)
def get_user_permissions_detail(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all permissions for a specific user (direct + via roles).
    Requires 'users:view' permission, or user can view their own.
    """
    # Allow users to view their own permissions
    if user_id != current_user.id:
        if not has_permission(current_user, "users:view", db):
            raise HTTPException(status_code=403, detail="Permission denied")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all permission keys
    all_permissions = get_user_permissions(user, db)

    # Get direct user permissions
    direct_perms = db.query(UserPermission, Permission).join(Permission).filter(UserPermission.user_id == user_id).all()

    direct_permissions = [
        {
            "permission_key": p.key,
            "granted_at": up.granted_at.isoformat() if up.granted_at else None,
            "expires_at": up.expires_at.isoformat() if up.expires_at else None,
        }
        for up, p in direct_perms
    ]

    # Get role-based permissions (using raw SQL)
    role_perms_result = db.execute(
        text("""
            SELECT DISTINCT p.key, r.name as role_name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = :user_id AND p.is_active IS TRUE
        """),
        {"user_id": user_id},
    )

    role_permissions = [{"permission_key": row[0], "role_name": row[1]} for row in role_perms_result]

    return UserPermissionsResponse(
        user_id=user.id,
        email=user.email,
        role=user.role,
        permissions=all_permissions,
        direct_permissions=direct_permissions,
        role_permissions=role_permissions,
    )
