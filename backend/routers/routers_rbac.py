from __future__ import annotations

import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.schemas import AssignRoleRequest, GrantPermissionToRoleRequest, RBACSummary
from backend.routers.routers_auth import optional_require_role
from backend.security.permissions import require_permission
import backend.models as models

router = APIRouter(prefix="/admin/rbac", tags=["RBAC"], responses={404: {"description": "Not found"}})

logger = logging.getLogger(__name__)


@router.post("/ensure-defaults", status_code=status.HTTP_200_OK)
async def ensure_defaults(
    request: Request,
    db: Session = Depends(get_db),
    current_admin = Depends(optional_require_role("admin")),
):
    """Create default roles and permissions if they don't exist.

    - Roles: admin, teacher, student
    - Admin gets wildcard '*'
    - Teacher gets permissive academic operations; student gets self-* reads
    - Assign User.role -> UserRole when applicable
    """
    _ = current_admin
    try:
        # Ensure roles
        role_names = {"admin": "System administrator", "teacher": "Teacher", "student": "Student"}
        name_to_role: dict[str, models.Role] = {}
        for name, desc in role_names.items():
            r = db.query(models.Role).filter(models.Role.name == name).first()
            if not r:
                r = models.Role(name=name, description=desc)
                db.add(r)
                db.commit()
                db.refresh(r)
            name_to_role[name] = r

        # Ensure permissions
        perm_names = [
            "*",
            # students
            "students.read", "students.write", "students.delete",
            # courses
            "courses.read", "courses.write", "courses.delete",
            # attendance/grades
            "attendance.read", "attendance.write",
            "grades.read", "grades.write",
            # imports/exports
            "imports.preview", "imports.execute", "exports.generate", "exports.download",
            # self-scoped
            "students.self.read", "grades.self.read", "attendance.self.read",
        ]
        name_to_perm: dict[str, models.Permission] = {}
        for pname in perm_names:
            p = db.query(models.Permission).filter(models.Permission.name == pname).first()
            if not p:
                p = models.Permission(name=pname, description=None)
                db.add(p)
                db.commit()
                db.refresh(p)
            name_to_perm[pname] = p

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

        # Admin wildcard
        grant("admin", "*")

        # Teacher default grants (mirror permissive defaults)
        for pn in [
            "students.read", "students.write",
            "courses.read", "courses.write",
            "attendance.read", "attendance.write",
            "grades.read", "grades.write",
            "imports.preview", "imports.execute", "exports.generate", "exports.download",
        ]:
            grant("teacher", pn)

        # Student default grants
        for pn in ["students.self.read", "grades.self.read", "attendance.self.read"]:
            grant("student", pn)

        # Backfill UserRole from legacy User.role
        users = db.query(models.User).all()
        for u in users:
            legacy = (getattr(u, "role", None) or "").strip().lower()
            if legacy in name_to_role:
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
    current_admin = Depends(optional_require_role("admin")),
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
    current_admin = Depends(require_permission("*")),
):
    _ = current_admin
    try:
        user = db.query(models.User).filter(models.User.id == payload.user_id).first()
        if not user:
            raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)
        role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
        if not role:
            raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role not found", request)
        exists = (
            db.query(models.UserRole)
            .filter(models.UserRole.user_id == user.id, models.UserRole.role_id == role.id)
            .first()
        )
        if not exists:
            db.add(models.UserRole(user_id=user.id, role_id=role.id))
            db.commit()
        return {"status": "assigned"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to assign role", request) from exc


@router.post("/grant-permission", status_code=status.HTTP_200_OK)
async def grant_permission_to_role(
    request: Request,
    payload: GrantPermissionToRoleRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin = Depends(require_permission("*")),
):
    _ = current_admin
    try:
        role = db.query(models.Role).filter(models.Role.name == payload.role_name.strip().lower()).first()
        perm = db.query(models.Permission).filter(models.Permission.name == payload.permission_name.strip().lower()).first()
        if not role or not perm:
            raise http_error(status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Role or permission not found", request)
        exists = (
            db.query(models.RolePermission)
            .filter(models.RolePermission.role_id == role.id, models.RolePermission.permission_id == perm.id)
            .first()
        )
        if not exists:
            db.add(models.RolePermission(role_id=role.id, permission_id=perm.id))
            db.commit()
        return {"status": "granted"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Failed to grant permission", request) from exc
