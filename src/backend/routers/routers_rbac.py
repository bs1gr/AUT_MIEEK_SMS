import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import backend.models as models

# --- CRUD ENDPOINTS FOR ROLES ---
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.rbac import require_permission
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
from backend.services.audit_service import get_audit_logger

router = APIRouter(prefix="/admin/rbac", tags=["RBAC"], responses={404: {"description": "Not found"}})

# The permission that makes an administrator one, held by the role "admin". The requests of
# this module refuse to take it from that role, to rename it and to delete it: after any of
# these no administrator could manage accounts or roles.
ADMIN_WILDCARD = "*:*"

# The two roles the application is built on. An account is tied to them by name: the word in
# its Role column names one of them, and creating an account, changing its role and the step
# at every start look the role up by that name. They can be neither renamed nor deleted.
# Without the role "admin" no administrator holds anything (an account may do what its rows
# say, there is no list in the code to fall back on), "Initialize RBAC Defaults" included;
# renamed, every administrator created afterwards would hold nothing.
STANDARD_ROLES = ("admin", "teacher")


def _refuse_if_standard_role(role: models.Role, change: str, request: Request) -> None:
    if (role.name or "").strip().lower() in STANDARD_ROLES:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            f"The role {role.name} cannot be {change}: the accounts of the application are tied to it by name",
            request,
        )


def _record_catalog_change(request: Request, db: Session, action: AuditAction, details: dict) -> None:
    """Write the creation, change or deletion of a role or a permission to the audit log.

    The pages grant and revoke; they neither create nor delete a role or a permission, so
    these requests are made by a script, and until now they left no line: a role could be
    deleted, with every account's membership of it, and the log said nothing. Called after
    the change is committed. Details without a value are left out; a failure to write the
    entry is logged and never fails the request.
    """
    try:
        get_audit_logger(db).log_from_request(
            request,
            action=action,
            resource=AuditResource.USER,
            resource_id=None,
            details={key: value for key, value in details.items() if value is not None},
        )
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        logging.getLogger(__name__).warning("The audit entry for %s could not be written: %r", details, exc)


@router.post("/roles", response_model=RoleResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def create_role(
    request: Request,
    name: str = Body(..., embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    name = name.strip().lower()
    if db.query(models.Role).filter(models.Role.name == name).first():
        raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role already exists", request)
    role = models.Role(name=name, description=description)
    db.add(role)
    db.flush()
    # Nobody holds a role that was only just created. A database may hold what a role deleted
    # by an earlier version left behind in user_roles (see delete_role), under the number this
    # role was just given.
    db.query(models.UserRole).filter(models.UserRole.role_id == role.id).delete(synchronize_session=False)
    db.commit()
    db.refresh(role)
    answer = RoleResponse.model_validate(role)
    _record_catalog_change(
        request, db, AuditAction.ROLE_CHANGE, {"operation": "create_role", "role": name, "description": description}
    )
    return answer


@router.get("/roles", response_model=list[RoleResponse])
@require_permission("permissions:view")
async def list_roles(
    request: Request,
    db: Session = Depends(get_db),
):
    roles = db.query(models.Role).all()
    return [RoleResponse.model_validate(r) for r in roles]


@router.put("/roles/{role_id}", response_model=RoleResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def update_role(
    request: Request,
    role_id: int,
    name: str = Body(None, embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Role not found", None)
    was_name = role.name
    was_description = role.description
    if name and name.strip().lower() != (role.name or "").strip().lower():
        _refuse_if_standard_role(role, "renamed", request)
        new_name = name.strip().lower()
        # The name is unique: without this the database refused it and the answer was a 500.
        if db.query(models.Role).filter(models.Role.name == new_name).first():
            raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role already exists", request)
        role.name = new_name
    if description is not None:
        role.description = description
    db.commit()
    db.refresh(role)
    answer = RoleResponse.model_validate(role)
    described = answer.description if answer.description != was_description else None
    if answer.name != was_name:
        _record_catalog_change(
            request,
            db,
            AuditAction.ROLE_CHANGE,
            {"operation": "rename_role", "from": was_name, "role": answer.name, "description": described},
        )
    elif answer.description != was_description:
        _record_catalog_change(
            request,
            db,
            AuditAction.ROLE_CHANGE,
            {"operation": "update_role", "role": answer.name, "description": answer.description or ""},
        )
    return answer


@router.delete("/roles/{role_id}")
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def delete_role(
    request: Request,
    role_id: int,
    db: Session = Depends(get_db),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Role not found", None)
    _refuse_if_standard_role(role, "deleted", request)
    was_name = role.name
    # The accounts that held it lose it with the role: their rows are removed here, and the
    # entry says how many there were. PostgreSQL removes them through the foreign key. SQLite
    # does not (the application runs it without foreign-key enforcement) and hands the next
    # role the number of the last one deleted: those accounts then held a role nobody gave them.
    held_by = db.query(models.UserRole).filter(models.UserRole.role_id == role.id).delete(synchronize_session=False)
    db.delete(role)
    db.commit()
    _record_catalog_change(
        request, db, AuditAction.ROLE_CHANGE, {"operation": "delete_role", "role": was_name, "accounts": held_by}
    )
    return {"status": "deleted"}


# --- CRUD ENDPOINTS FOR PERMISSIONS ---
@router.post("/permissions", response_model=PermissionResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def create_permission(
    request: Request,
    key: str = Body(..., embed=True),
    resource: str = Body(..., embed=True),
    action: str = Body(..., embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
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
    answer = PermissionResponse.model_validate(perm)
    _record_catalog_change(
        request,
        db,
        AuditAction.PERMISSION_GRANT,
        {"operation": "create_permission", "permission": key, "description": description},
    )
    return answer


@router.get("/permissions", response_model=list[PermissionResponse])
@require_permission("permissions:view")
async def list_permissions(
    request: Request,
    db: Session = Depends(get_db),
):
    perms = db.query(models.Permission).all()
    return [PermissionResponse.model_validate(p) for p in perms]


@router.put("/permissions/{permission_id}", response_model=PermissionResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def update_permission(
    request: Request,
    permission_id: int,
    key: str = Body(None, embed=True),
    resource: str = Body(None, embed=True),
    action: str = Body(None, embed=True),
    description: str = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    perm = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
    if not perm:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Permission not found", None)
    # Under another key the wildcard would open nothing, for administrators either.
    if key and perm.key == ADMIN_WILDCARD and key.strip().lower() != ADMIN_WILDCARD:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            "The wildcard permission cannot be renamed",
            request,
        )
    was = {"key": perm.key, "resource": perm.resource, "action": perm.action, "description": perm.description}
    if key and key.strip().lower() != perm.key:
        # The key is unique: without this the database refused it and the answer was a 500.
        if db.query(models.Permission).filter(models.Permission.key == key.strip().lower()).first():
            raise http_error(
                status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Permission already exists", request
            )
        perm.key = key.strip().lower()
    if resource:
        perm.resource = resource.strip().lower()
    if action:
        perm.action = action.strip().lower()
    if description is not None:
        perm.description = description
    db.commit()
    db.refresh(perm)
    answer = PermissionResponse.model_validate(perm)
    now = {"key": perm.key, "resource": perm.resource, "action": perm.action, "description": perm.description}
    changed = {name: (value if value is not None else "") for name, value in now.items() if value != was[name]}
    if changed:
        details = {"operation": "update_permission", "permission": now["key"]}
        if "key" in changed:
            details["key_was"] = was["key"]
        details.update({name: value for name, value in changed.items() if name != "key"})
        _record_catalog_change(request, db, AuditAction.UPDATE, details)
    return answer


@router.delete("/permissions/{permission_id}")
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def delete_permission(
    request: Request,
    permission_id: int,
    db: Session = Depends(get_db),
):
    perm = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
    if not perm:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.VALIDATION_FAILED, "Permission not found", None)
    if perm.key == ADMIN_WILDCARD:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.VALIDATION_FAILED,
            "The wildcard permission cannot be deleted",
            request,
        )
    details = _what_goes_with_a_permission(db, perm)
    db.delete(perm)
    db.commit()
    _record_catalog_change(request, db, AuditAction.PERMISSION_REVOKE, details)
    return {"status": "deleted"}


def _what_goes_with_a_permission(db: Session, perm: models.Permission) -> dict:
    """The audit details of a permission about to be deleted: its key, and how many roles and
    how many single accounts lose it with it."""
    return {
        "operation": "delete_permission",
        "permission": perm.key,
        "roles": db.query(models.RolePermission).filter(models.RolePermission.permission_id == perm.id).count(),
        "accounts": db.query(models.UserPermission).filter(models.UserPermission.permission_id == perm.id).count(),
    }


# --- RBAC CHANGE HISTORY ENDPOINT ---
@router.get("/change-history", response_model=AuditLogListResponse)
@require_permission("audit:view")
async def get_rbac_change_history(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 50,
    action: str = None,
    user_id: int = None,
):
    """Get paginated RBAC change history (role/permission changes only)."""
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
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def bulk_assign_role(
    request: Request,
    payload: BulkAssignRolesRequest,
    db: Session = Depends(get_db),
):
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
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def bulk_grant_permission(
    request: Request,
    payload: BulkGrantPermissionsRequest,
    db: Session = Depends(get_db),
):
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


# The roles of the application, highest first. The word in an account's Role column is the
# highest one it holds, or NO_ROLE.
LEGACY_ROLE_PRIORITY = ("admin", "teacher")

# The word in the Role column of an account that holds no role: its roles were all revoked,
# or it was a Student, Viewer or Guest account before those went (November 2026). It is not
# a role: no row of `roles` has this name, so the account passes no permission check and no
# role check. It can still sign in. Assigning a role under Assign Role to User, or choosing
# one in User Accounts > Edit, ends the state.
NO_ROLE = "none"

# A role brings the ones below it: an administrator is also given the teacher role.
ROLE_HIERARCHY = {
    "admin": ["teacher"],
    "teacher": [],
}

ROLE_DESCRIPTIONS = {
    "admin": "System administrator",
    "teacher": "Teacher",
}

# Every permission the application knows: the wildcard, and each key an endpoint asks for
# (tests/test_permission_documents.py holds the two lists together). key, resource, action,
# description.
PERMISSION_DEFS: tuple[tuple[str, str, str, str], ...] = (
    (ADMIN_WILDCARD, "*", "*", "All permissions (admin wildcard)"),
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
    ("reports:view", "reports", "view", "View and generate reports"),
    ("reports:generate", "reports", "generate", "Generate reports and analytics views"),
    ("reports:export", "reports", "export", "Export reports and analytics"),
    ("reports:create", "reports", "create", "Create analytics reports"),
    ("analytics:export", "analytics", "export", "Export analytics"),
    ("users:view", "users", "view", "View user list"),
    ("users:manage", "users", "manage", "Create/update/delete users and roles"),
    ("permissions:view", "permissions", "view", "View permissions and roles"),
    ("permissions:manage", "permissions", "manage", "Assign or revoke permissions"),
    ("audit:view", "audit", "view", "View audit logs"),
    ("notifications:manage", "notifications", "manage", "Send broadcast notifications"),
    ("adminops:backup", "adminops", "backup", "Create backups"),
    ("adminops:restore", "adminops", "restore", "Restore database"),
    ("adminops:clear", "adminops", "clear", "Clear database content"),
    ("imports:preview", "imports", "preview", "Preview data import"),
    ("imports:execute", "imports", "execute", "Execute data import"),
    ("imports:create", "imports", "create", "Upload a file to import"),
    ("imports:view", "imports", "view", "View import jobs"),
    ("exports:generate", "exports", "generate", "Generate data export"),
    ("exports:download", "exports", "download", "Download exported data"),
    ("exports:view", "exports", "view", "View export jobs"),
    ("sessions:manage", "sessions", "manage", "Export and import a semester's session"),
    ("jobs:create", "jobs", "create", "Start background jobs"),
    ("jobs:view", "jobs", "view", "View background jobs"),
    ("jobs:manage", "jobs", "manage", "Cancel background jobs"),
    ("jobs:delete", "jobs", "delete", "Delete background jobs"),
    ("diagnostics:view", "diagnostics", "view", "View query diagnostics"),
    ("diagnostics:manage", "diagnostics", "manage", "Reset query diagnostics"),
    ("admin:manage", "admin", "manage", "Clear the analytics cache"),
)

# What the role teacher holds. The administrator holds the wildcard, and these as well.
TEACHER_PERMISSIONS: tuple[str, ...] = (
    "students:view",
    "students:create",
    "students:edit",
    "students:delete",
    "courses:view",
    "courses:create",
    "courses:edit",
    "courses:delete",
    "grades:view",
    "grades:edit",
    "grades:delete",
    "attendance:view",
    "attendance:edit",
    "attendance:delete",
    "reports:view",
    # Every /analytics, /reports and /metrics endpoint asks for reports:generate (the
    # Dashboard overview included).
    "reports:generate",
    "reports:export",
    "notifications:manage",
    "exports:generate",
    "exports:download",
    # Importing students and courses from a file (the owner, 18 November 2026: "both teachers
    # and admins").
    "imports:preview",
    "imports:execute",
    "imports:create",
    "imports:view",
    # The Imports tab follows an import it started through GET /jobs/{id}.
    "jobs:view",
    # A semester's session file: export, import, the backups made before an import and the
    # return to one. With the administrator alone until 19 November 2026, when the owner asked
    # for teachers to have it too (migration 9c41f7e2a6d3 grants it in an existing database).
    "sessions:manage",
)


def _resolve_legacy_role_for_user(db: Session, user: models.User) -> str | None:
    if not user:
        return None
    assigned = (
        db.query(models.Role.name)
        .join(models.UserRole, models.UserRole.role_id == models.Role.id)
        .filter(models.UserRole.user_id == user.id)
        .all()
    )
    assigned_names = {name for (name,) in assigned}
    for role_name in LEGACY_ROLE_PRIORITY:
        if role_name in assigned_names:
            return role_name
    return None


def _seed_defaults(db: Session, request: Request | None = None) -> None:
    """Add whatever of the standard roles, permissions and grants is missing. Removes nothing."""
    audit_logger = get_audit_logger(db)

    def _log(**kwargs):
        if request:
            audit_logger.log_from_request(request, **kwargs)

    name_to_role: dict[str, models.Role] = {}
    for name, desc in ROLE_DESCRIPTIONS.items():
        r = db.query(models.Role).filter(models.Role.name == name).first()
        if not r:
            r = models.Role(name=name, description=desc)
            db.add(r)
            db.commit()
            db.refresh(r)
            _log(
                action=AuditAction.ROLE_CHANGE,
                resource=AuditResource.USER,
                resource_id=None,
                details={"role": name, "description": desc, "operation": "create_role"},
            )
        name_to_role[name] = r

    name_to_perm: dict[str, models.Permission] = {}
    for pkey, presource, paction, pdesc in PERMISSION_DEFS:
        p = db.query(models.Permission).filter(models.Permission.key == pkey).first()
        if not p:
            p = models.Permission(key=pkey, resource=presource, action=paction, description=pdesc)
            db.add(p)
            db.commit()
            db.refresh(p)
            _log(
                action=AuditAction.PERMISSION_GRANT,
                resource=AuditResource.USER,
                resource_id=None,
                details={"permission": pkey, "operation": "create_permission", "description": pdesc},
            )
        elif not p.description:
            p.description = pdesc
            db.commit()
        if pkey == ADMIN_WILDCARD and p.is_active is False:
            # Switched off, it opens nothing, and no administrator can switch it on again.
            p.is_active = True
            db.commit()
        name_to_perm[pkey] = p

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
            _log(
                action=AuditAction.PERMISSION_GRANT,
                resource=AuditResource.USER,
                resource_id=None,
                details={"role": role_name, "permission": perm_name, "operation": "grant_permission"},
            )

    # The wildcard covers everything; the teacher's grants are given to admin as well, so
    # that the list of what an administrator holds reads complete.
    grant("admin", ADMIN_WILDCARD)
    for pn in TEACHER_PERMISSIONS:
        grant("teacher", pn)
        grant("admin", pn)

    backfill_role_rows(db)


def backfill_role_rows(db: Session) -> int:
    """Give every account the role row its Role column names, if it lacks it. Returns how many.

    An account is what its rows say (backend.rbac has no other source), so an administrator
    or teacher account without its row could do nothing. Such accounts exist: the first
    administrator of an installation is created after the roles are seeded, and a database
    from before the role tables has none. Called at every start, after the administrator
    bootstrap, and by "Initialize RBAC Defaults".

    It never gives a role back that was taken away: revoking an account's last role sets its
    Role column to NO_ROLE, which names no role.
    """
    added = 0
    roles = {role.name: role for role in db.query(models.Role).filter(models.Role.name.in_(LEGACY_ROLE_PRIORITY)).all()}
    if not roles:
        return 0
    for user in db.query(models.User).all():
        word = (getattr(user, "role", None) or "").strip().lower()
        role = roles.get(word)
        if role is None:
            continue
        held = (
            db.query(models.UserRole)
            .filter(models.UserRole.user_id == user.id, models.UserRole.role_id == role.id)
            .first()
        )
        if not held:
            db.add(models.UserRole(user_id=user.id, role_id=role.id))
            added += 1
    if added:
        db.commit()
    return added


def backfill_role_rows_startup(session_factory) -> int:
    """`backfill_role_rows` in a session of its own; a failure is logged and never raised."""
    session = session_factory()
    try:
        added = backfill_role_rows(session)
        if added:
            logger.info("Role rows added for %s account(s) that had none for their role", added)
        return added
    except Exception as exc:
        logger.warning("Role rows could not be checked at start: %s", exc, exc_info=True)
        return 0
    finally:
        session.close()


def ensure_defaults_startup(session_factory) -> bool:
    session = session_factory()
    try:
        role_count = session.query(models.Role).count()
        perm_count = session.query(models.Permission).count()
        role_perm_count = session.query(models.RolePermission).count()
        needs_seed = role_count == 0 or perm_count == 0 or role_perm_count == 0

        if not needs_seed:
            # A database an earlier version let lose one of the two standard roles (it could
            # be renamed or deleted then): the seed puts it back, and removes nothing.
            standard = session.query(models.Role).filter(models.Role.name.in_(STANDARD_ROLES)).count()
            needs_seed = standard < len(STANDARD_ROLES)

        if not needs_seed:
            try:
                admin_role = session.query(models.Role).filter(models.Role.name == "admin").first()
                if admin_role:
                    wildcard = (
                        session.query(models.RolePermission)
                        .join(models.Permission, models.RolePermission.permission_id == models.Permission.id)
                        .filter(
                            models.RolePermission.role_id == admin_role.id,
                            models.Permission.key == ADMIN_WILDCARD,
                            # A wildcard that is switched off counts as missing: the seed
                            # switches it on again.
                            models.Permission.is_active.is_(True),
                        )
                        .first()
                    )
                    if not wildcard:
                        needs_seed = True
            except Exception:
                needs_seed = True

        if needs_seed:
            _seed_defaults(session, None)
            return True
        # Nothing to seed: the accounts' role rows are still made sure of (see the function).
        backfill_role_rows(session)
        return False
    except Exception as exc:
        logger.warning("⚠️  RBAC defaults seeding skipped: %s", exc, exc_info=True)
        return False
    finally:
        session.close()


@router.post("/ensure-defaults", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def ensure_defaults(
    request: Request,
    db: Session = Depends(get_db),
):
    """Add the standard roles, permissions and grants that are missing. Removes nothing.

    - Roles: admin, teacher
    - admin holds the wildcard `*:*`; teacher holds TEACHER_PERMISSIONS
    - Every account whose Role column names one of the two roles gets that role's row
    """
    try:
        _seed_defaults(db, request)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to ensure defaults", request) from exc


@router.get("/summary", response_model=RBACSummary)
@require_permission("permissions:view")
async def get_rbac_summary(
    request: Request,
    db: Session = Depends(get_db),
):
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
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def assign_role(
    request: Request,
    payload: AssignRoleRequest,
    db: Session = Depends(get_db),
):
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

        # Role hierarchy: an administrator is given the role teacher as well
        inherited_roles = ROLE_HIERARCHY.get(role.name, [])
        for inherited_role_name in inherited_roles:
            inherited_role = db.query(models.Role).filter(models.Role.name == inherited_role_name).first()
            if inherited_role:
                inherited_exists = (
                    db.query(models.UserRole)
                    .filter(
                        models.UserRole.user_id == user.id,
                        models.UserRole.role_id == inherited_role.id,
                    )
                    .first()
                )
                if not inherited_exists:
                    db.add(models.UserRole(user_id=user.id, role_id=inherited_role.id))
                    db.commit()
                    audit_logger.log_from_request(
                        request,
                        action=AuditAction.ROLE_CHANGE,
                        resource=AuditResource.USER,
                        resource_id=str(user.id),
                        details={
                            "role": inherited_role.name,
                            "operation": "auto_assign_inherited",
                            "parent_role": role.name,
                            "success": True,
                        },
                    )

        # Keep the word in the account's Role column in step (admin, teacher or none)
        legacy_role = _resolve_legacy_role_for_user(db, user)
        if legacy_role and user.role != legacy_role:
            user.role = legacy_role
            db.add(user)
            db.commit()

        return {"status": "assigned"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to assign role", request) from exc

    # --- PROTECTION: Prevent removing last admin or last wildcard permission ---


@router.post("/revoke-role", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def revoke_role(
    request: Request,
    payload: AssignRoleRequest,
    db: Session = Depends(get_db),
):
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

            # The word in the account's Role column follows the roles the account still
            # holds: the higher of the two standard ones, or NO_ROLE when both are gone. It
            # used to stay as it was (and to become "teacher" for an administrator left
            # without roles). The role checks read that word (optional_require_role), and the
            # start-up step gives every account the row of the role its word names: with the
            # word left in place, the next start gave the revoked role back.
            if role.name in LEGACY_ROLE_PRIORITY and (user.role or "").strip().lower() in LEGACY_ROLE_PRIORITY:
                remaining = _resolve_legacy_role_for_user(db, user) or NO_ROLE
                if user.role != remaining:
                    user.role = remaining
                    db.add(user)
                    db.commit()
            return {"status": "revoked", "role": user.role}
        return {"status": "not_assigned"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to revoke role", request) from exc


@router.post("/revoke-permission", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("permissions:manage")
async def revoke_permission_from_role(
    request: Request,
    payload: GrantPermissionToRoleRequest,
    db: Session = Depends(get_db),
):
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
