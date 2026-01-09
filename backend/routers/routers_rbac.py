from __future__ import annotations

import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import backend.models as models

# --- CRUD ENDPOINTS FOR ROLES ---
from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.routers.routers_auth import optional_require_role
from backend.schemas.audit import AuditAction, AuditLogListResponse, AuditLogResponse, AuditResource
from backend.schemas.rbac import (
    AssignRoleRequest,
    BulkAssignRolesRequest,
    BulkGrantPermissionsRequest,
    GrantPermissionToRoleRequest,
    PermissionResponse,
    RBACSummary,
    RoleResponse,
)
from backend.security.permissions import require_permission
from backend.services.audit_service import get_audit_logger

router = APIRouter(prefix="/admin/rbac", tags=["RBAC"], responses={404: {"description": "Not found"}})


@router.post("/roles", response_model=RoleResponse)
async def create_role(
    request: Request,
    name: str = Body(..., embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    name = name.strip().lower()
    if db.query(models.Role).filter(models.Role.name == name).first():
        raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role already exists", request)
    role = models.Role(name=name, description=description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return RoleResponse.model_validate(role)


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:view")),
):
    roles = db.query(models.Role).all()
    return [RoleResponse.model_validate(r) for r in roles]


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    name: str = Body(None, embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Role not found", None)
    if name:
        role.name = name.strip().lower()
    if description is not None:
        role.description = description
    db.commit()
    db.refresh(role)
    return RoleResponse.model_validate(role)


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Role not found", None)
    db.delete(role)
    db.commit()
    return {"status": "deleted"}


# --- CRUD ENDPOINTS FOR PERMISSIONS ---
@router.post("/permissions", response_model=PermissionResponse)
async def create_permission(
    request: Request,
    key: str = Body(..., embed=True),
    resource: str = Body(..., embed=True),
    action: str = Body(..., embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    key = key.strip().lower()
    resource = resource.strip().lower()
    action = action.strip().lower()
    if db.query(models.Permission).filter(models.Permission.key == key).first():
        raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Permission already exists", request)
    perm = models.Permission(key=key, resource=resource, action=action, description=description)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return PermissionResponse.model_validate(perm)


@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:view")),
):
    perms = db.query(models.Permission).all()
    return [PermissionResponse.model_validate(p) for p in perms]


@router.put("/permissions/{permission_id}", response_model=PermissionResponse)
async def update_permission(
    permission_id: int,
    key: str = Body(None, embed=True),
    resource: str = Body(None, embed=True),
    action: str = Body(None, embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    perm = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
    if not perm:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Permission not found", None)
    if key:
        perm.key = key.strip().lower()
    if resource:
        perm.resource = resource.strip().lower()
    if action:
        perm.action = action.strip().lower()
    if description is not None:
        perm.description = description
    db.commit()
    db.refresh(perm)
    return PermissionResponse.model_validate(perm)


@router.delete("/permissions/{permission_id}")
async def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    perm = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
    if not perm:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Permission not found", None)
    db.delete(perm)
    db.commit()
    return {"status": "deleted"}


# --- RBAC CHANGE HISTORY ENDPOINT ---
@router.get("/change-history", response_model=AuditLogListResponse)
async def get_rbac_change_history(
    request: Request,
    db: Session = Depends(get_db),
    current_admin=Depends(optional_require_role("admin")),
    page: int = 1,
    page_size: int = 50,
    action: str = None,
    user_id: int = None,
):
    """Get paginated RBAC change history (role/permission changes only)."""
    _ = current_admin
    q = db.query(models.AuditLog).filter(
        models.AuditLog.action.in_(
            [AuditAction.ROLE_CHANGE.value, AuditAction.PERMISSION_GRANT.value, AuditAction.PERMISSION_REVOKE.value]
        )
    )
    if action:
        q = q.filter(models.AuditLog.action == action)
    if user_id:
        q = q.filter(models.AuditLog.user_id == user_id)
    total = q.count()
    q = q.order_by(models.AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = q.all()
    log_responses = [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            resource=log.resource,
            resource_id=log.resource_id,
            user_id=log.user_id,
            user_email=log.user_email,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            details=log.details,
            success=log.success,
            error_message=log.error_message,
            timestamp=log.timestamp,
        )
        for log in logs
    ]
    return AuditLogListResponse(
        logs=log_responses, total=total, page=page, page_size=page_size, has_next=(page * page_size < total)
    )


# --- BULK ADMIN ENDPOINTS ---
@router.post("/bulk-assign-role", status_code=status.HTTP_200_OK)
async def bulk_assign_role(
    request: Request,
    payload: BulkAssignRolesRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    _ = current_admin
    audit_logger = get_audit_logger(db)
    results = []
    role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
    if not role:
        for uid in payload.user_ids:
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(uid),
                details={
                    "role": payload.role_name,
                    "operation": "bulk_assign_role",
                    "success": False,
                    "reason": "Role not found",
                },
                success=False,
                error_message="Role not found",
            )
        raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role not found", request)
    for uid in payload.user_ids:
        user = db.query(models.User).filter(models.User.id == uid).first()
        if not user:
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(uid),
                details={
                    "role": role.name,
                    "operation": "bulk_assign_role",
                    "success": False,
                    "reason": "User not found",
                },
                success=False,
                error_message="User not found",
            )
            results.append({"user_id": uid, "status": "user_not_found"})
            continue
        exists = (
            db.query(models.UserRole)
            .filter(models.UserRole.user_id == user.id, models.UserRole.role_id == role.id)
            .first()
        )
        if not exists:
            db.add(models.UserRole(user_id=user.id, role_id=role.id))
            db.commit()
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(user.id),
                details={"role": role.name, "operation": "bulk_assign_role", "success": True},
            )
            results.append({"user_id": user.id, "status": "assigned"})
        else:
            results.append({"user_id": user.id, "status": "already_assigned"})
    return {"results": results}


@router.post("/bulk-grant-permission", status_code=status.HTTP_200_OK)
async def bulk_grant_permission(
    request: Request,
    payload: BulkGrantPermissionsRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    _ = current_admin
    audit_logger = get_audit_logger(db)
    results = []
    perm = db.query(models.Permission).filter(models.Permission.key == payload.permission_name.strip().lower()).first()
    if not perm:
        for rname in payload.role_names:
            audit_logger.log_from_request(
                request,
                action=AuditAction.PERMISSION_GRANT,
                resource=AuditResource.USER,
                resource_id=None,
                details={
                    "role": rname,
                    "permission": payload.permission_name,
                    "operation": "bulk_grant_permission",
                    "success": False,
                    "reason": "Permission not found",
                },
                success=False,
                error_message="Permission not found",
            )
        raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Permission not found", request)
    for rname in payload.role_names:
        role = db.query(models.Role).filter(models.Role.name == rname.strip().lower()).first()
        if not role:
            audit_logger.log_from_request(
                request,
                action=AuditAction.PERMISSION_GRANT,
                resource=AuditResource.USER,
                resource_id=None,
                details={
                    "role": rname,
                    "permission": perm.key,
                    "operation": "bulk_grant_permission",
                    "success": False,
                    "reason": "Role not found",
                },
                success=False,
                error_message="Role not found",
            )
            results.append({"role_name": rname, "status": "role_not_found"})
            continue
        exists = (
            db.query(models.RolePermission)
            .filter(models.RolePermission.role_id == role.id, models.RolePermission.permission_id == perm.id)
            .first()
        )
        if not exists:
            db.add(models.RolePermission(role_id=role.id, permission_id=perm.id))
            db.commit()
            audit_logger.log_from_request(
                request,
                action=AuditAction.PERMISSION_GRANT,
                resource=AuditResource.USER,
                resource_id=None,
                details={
                    "role": role.name,
                    "permission": perm.key,
                    "operation": "bulk_grant_permission",
                    "success": True,
                },
            )
            results.append({"role_name": role.name, "status": "granted"})
        else:
            results.append({"role_name": role.name, "status": "already_granted"})
    return {"results": results}


# NOTE: Avoid re-defining the router. The initial router instance above is
# used for all endpoints in this module. Re-defining would drop endpoints
# declared earlier in the file.

logger = logging.getLogger(__name__)


@router.post("/ensure-defaults", status_code=status.HTTP_200_OK)
async def ensure_defaults(
    request: Request,
    db: Session = Depends(get_db),
    current_admin=Depends(optional_require_role("admin")),
):
    """Create default roles and permissions if they don't exist.

    - Roles: admin, teacher, student
    - Admin gets wildcard '*'
    - Teacher gets permissive academic operations; student gets self-* reads
    - Assign User.role -> UserRole when applicable
    """
    _ = current_admin
    audit_logger = get_audit_logger(db)
    try:
        # Ensure roles
        role_names = {
            "admin": "System administrator",
            "teacher": "Teacher",
            "guest": "Guest (read-only)",
            "viewer": "Viewer (read-only)",
        }
        name_to_role: dict[str, models.Role] = {}
        for name, desc in role_names.items():
            r = db.query(models.Role).filter(models.Role.name == name).first()
            if not r:
                r = models.Role(name=name, description=desc)
                db.add(r)
                db.commit()
                db.refresh(r)
                audit_logger.log_from_request(
                    request,
                    action=AuditAction.ROLE_CHANGE,
                    resource=AuditResource.USER,
                    resource_id=None,
                    details={"role": name, "description": desc, "operation": "create_role"},
                )
            name_to_role[name] = r

        # Ensure permissions (using new Permission schema: key, resource, action)
        perm_defs = [
            ("*:*", "*", "*", "All permissions (admin wildcard)"),
            ("students:view", "students", "view", "View all student records"),
            ("students:create", "students", "create", "Create student records"),
            ("students:edit", "students", "edit", "Update student records"),
            ("students:delete", "students", "delete", "Delete student records"),
            ("courses:view", "courses", "view", "View all courses"),
            ("courses:create", "courses", "create", "Create courses"),
            ("courses:edit", "courses", "edit", "Update courses"),
            ("courses:delete", "courses", "delete", "Delete courses"),
            ("grades:view", "grades", "view", "View grades for all students"),
            ("grades:edit", "grades", "edit", "Assign or update grades"),
            ("grades:delete", "grades", "delete", "Delete grade records"),
            ("attendance:view", "attendance", "view", "View attendance records"),
            ("attendance:edit", "attendance", "edit", "Record or update attendance"),
            ("attendance:delete", "attendance", "delete", "Delete attendance records"),
            ("enrollments:view", "enrollments", "view", "View enrollments"),
            ("enrollments:manage", "enrollments", "manage", "Create/update/delete enrollments"),
            ("reports:view", "reports", "view", "View and generate reports"),
            ("analytics:view", "analytics", "view", "View analytics dashboards"),
            ("users:view", "users", "view", "View user list"),
            ("users:manage", "users", "manage", "Create/update/delete users and roles"),
            ("permissions:view", "permissions", "view", "View permissions and roles"),
            ("permissions:manage", "permissions", "manage", "Assign or revoke permissions"),
            ("audit:view", "audit", "view", "View audit logs"),
            ("system:import", "system", "import", "Import data"),
            ("system:export", "system", "export", "Export data"),
            ("notifications:manage", "notifications", "manage", "Send broadcast notifications"),
            ("adminops:backup", "adminops", "backup", "Create backups"),
            ("adminops:restore", "adminops", "restore", "Restore database"),
            ("adminops:clear", "adminops", "clear", "Clear database content"),
            ("imports:preview", "imports", "preview", "Preview data import"),
            ("imports:execute", "imports", "execute", "Execute data import"),
            ("exports:generate", "exports", "generate", "Generate data export"),
            ("exports:download", "exports", "download", "Download exported data"),
            ("students.self:read", "students.self", "read", "Student: view own profile"),
            ("grades.self:read", "grades.self", "read", "Student: view own grades"),
            ("attendance.self:read", "attendance.self", "read", "Student: view own attendance"),
        ]
        name_to_perm: dict[str, models.Permission] = {}
        for pkey, presource, paction, pdesc in perm_defs:
            p = db.query(models.Permission).filter(models.Permission.key == pkey).first()
            if not p:
                p = models.Permission(key=pkey, resource=presource, action=paction, description=pdesc)
                db.add(p)
                db.commit()
                db.refresh(p)
                audit_logger.log_from_request(
                    request,
                    action=AuditAction.PERMISSION_GRANT,
                    resource=AuditResource.USER,
                    resource_id=None,
                    details={"permission": pkey, "operation": "create_permission", "description": pdesc},
                )
            elif not p.description:
                p.description = pdesc
                db.commit()
            name_to_perm[pkey] = p

        # Grants
        def grant(role_name: str, perm_name: str):
            role = name_to_role[role_name]
            perm = name_to_perm[perm_name]
            existing = (
                db.query(models.RolePermission)
                .filter(models.RolePermission.role_id == role.id, models.RolePermission.permission_id == perm.id)
                .first()
            )
            if not existing:
                db.add(models.RolePermission(role_id=role.id, permission_id=perm.id))
                db.commit()
                audit_logger.log_from_request(
                    request,
                    action=AuditAction.PERMISSION_GRANT,
                    resource=AuditResource.USER,
                    resource_id=None,
                    details={"role": role_name, "permission": perm_name, "operation": "grant_permission"},
                )

        # Admin wildcard
        grant("admin", "*:*")

        teacher_perms = [
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
        ]
        for pn in teacher_perms:
            grant("teacher", pn)

        viewer_perms = [
            "students:view",
            "courses:view",
            "grades:view",
            "attendance:view",
            "reports:view",
            "analytics:view",
        ]
        for pn in viewer_perms:
            grant("guest", pn)
            grant("viewer", pn)

        # Backfill UserRole from legacy User.role (admin/teacher/guest only)
        users = db.query(models.User).all()
        for u in users:
            legacy = (getattr(u, "role", None) or "").strip().lower()
            if legacy in name_to_role and legacy != "student":
                role_obj = name_to_role[legacy]
                exists = (
                    db.query(models.UserRole)
                    .filter(models.UserRole.user_id == u.id, models.UserRole.role_id == role_obj.id)
                    .first()
                )
                if not exists:
                    db.add(models.UserRole(user_id=u.id, role_id=role_obj.id))
                    db.commit()

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to ensure defaults", request) from exc


@router.get("/summary", response_model=RBACSummary)
async def get_rbac_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_admin=Depends(optional_require_role("admin")),
):
    _ = current_admin
    roles = db.query(models.Role).all()
    perms = db.query(models.Permission).all()
    role_perms = db.query(models.RolePermission).all()
    user_roles = db.query(models.UserRole).all()
    return RBACSummary(
        roles=roles,
        permissions=perms,
        role_permissions=[{"role_id": rp.role_id, "permission_id": rp.permission_id} for rp in role_perms],
        user_roles=[{"user_id": ur.user_id, "role_id": ur.role_id} for ur in user_roles],
    )


@router.post("/assign-role", status_code=status.HTTP_200_OK)
async def assign_role(
    request: Request,
    payload: AssignRoleRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    _ = current_admin
    audit_logger = get_audit_logger(db)
    try:
        user = db.query(models.User).filter(models.User.id == payload.user_id).first()
        if not user:
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(payload.user_id),
                details={
                    "role": payload.role_name,
                    "operation": "assign_role",
                    "success": False,
                    "reason": "User not found",
                },
                success=False,
                error_message="User not found",
            )
            raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)
        role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
        if not role:
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(payload.user_id),
                details={
                    "role": payload.role_name,
                    "operation": "assign_role",
                    "success": False,
                    "reason": "Role not found",
                },
                success=False,
                error_message="Role not found",
            )
            raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role not found", request)
        exists = (
            db.query(models.UserRole)
            .filter(models.UserRole.user_id == user.id, models.UserRole.role_id == role.id)
            .first()
        )
        if not exists:
            # Prevent removing last admin (handled in revoke endpoint)
            db.add(models.UserRole(user_id=user.id, role_id=role.id))
            db.commit()
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(user.id),
                details={"role": role.name, "operation": "assign_role", "success": True},
            )

        return {"status": "assigned"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to assign role", request) from exc

    # --- PROTECTION: Prevent removing last admin or last wildcard permission ---


@router.post("/revoke-role", status_code=status.HTTP_200_OK)
async def revoke_role(
    request: Request,
    payload: AssignRoleRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    _ = current_admin
    audit_logger = get_audit_logger(db)
    try:
        user = db.query(models.User).filter(models.User.id == payload.user_id).first()
        role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
        if not user or not role:
            raise http_error(
                status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "User or role not found", request
            )
        # Prevent removing last admin
        if role.name == "admin":
            admin_role = role
            admin_user_roles = db.query(models.UserRole).filter(models.UserRole.role_id == admin_role.id).all()
            if len(admin_user_roles) <= 1:
                raise http_error(
                    status.HTTP_400_BAD_REQUEST,
                    ErrorCode.VALIDATION_FAILED,
                    "Cannot remove the last admin user",
                    request,
                )
        user_role = (
            db.query(models.UserRole)
            .filter(models.UserRole.user_id == user.id, models.UserRole.role_id == role.id)
            .first()
        )
        if user_role:
            db.delete(user_role)
            db.commit()
            audit_logger.log_from_request(
                request,
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=str(user.id),
                details={"role": role.name, "operation": "revoke_role", "success": True},
            )
            return {"status": "revoked"}
        return {"status": "not_assigned"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to revoke role", request) from exc


@router.post("/revoke-permission", status_code=status.HTTP_200_OK)
async def revoke_permission_from_role(
    request: Request,
    payload: GrantPermissionToRoleRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_permission("permissions:manage")),
):
    _ = current_admin
    audit_logger = get_audit_logger(db)
    try:
        role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
        perm = (
            db.query(models.Permission).filter(models.Permission.key == payload.permission_name.strip().lower()).first()
        )
        if not role or not perm:
            raise http_error(
                status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role or permission not found", request
            )
        # Prevent removing last wildcard from admin
        if role.name == "admin" and perm.key == "*:*":  # Updated from "*" to "*:*"
            admin_role = role
            wildcard_perm = perm
            admin_wildcard = (
                db.query(models.RolePermission)
                .filter(
                    models.RolePermission.role_id == admin_role.id,
                    models.RolePermission.permission_id == wildcard_perm.id,
                )
                .first()
            )
            if admin_wildcard:
                # Check if this is the last admin wildcard (should always be one, but future-proof)
                raise http_error(
                    status.HTTP_400_BAD_REQUEST,
                    ErrorCode.VALIDATION_FAILED,
                    "Cannot remove wildcard permission from admin role",
                    request,
                )
        role_perm = (
            db.query(models.RolePermission)
            .filter(models.RolePermission.role_id == role.id, models.RolePermission.permission_id == perm.id)
            .first()
        )
        if role_perm:
            db.delete(role_perm)
            db.commit()
            audit_logger.log_from_request(
                request,
                action=AuditAction.PERMISSION_REVOKE,
                resource=AuditResource.USER,
                resource_id=None,
                details={"role": role.name, "permission": perm.key, "operation": "revoke_permission", "success": True},
            )
            return {"status": "revoked"}
        return {"status": "not_granted"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to revoke permission", request) from exc
