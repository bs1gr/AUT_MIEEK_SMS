# RBAC Guide (Roles & Permissions)

Last Updated: 2025-12-28
Version: 1.12.8

This guide explains how roles and fine‑grained permissions work in the Student Management System, how defaults are seeded, and how to manage RBAC via the admin API.

## Overview

- Roles: `admin`, `teacher`, `guest` (and any custom roles you add)
- Permissions: hierarchical strings like `students.read`, `courses.write`, `attendance.write`, plus a wildcard `*` for full access
- Storage: SQL tables `roles`, `permissions`, `role_permissions`, `user_roles` (Alembic migrations apply schema)
- Enforcement: FastAPI dependencies `require_permission`, `optional_require_permission`, `optional_require_role`
- Auth modes:
  - `disabled`: No auth enforcement (non‑auth endpoints return a dummy admin user)
  - `permissive`: Auth is enabled but flexible; admin endpoints still require valid credentials
  - `strict`: Full auth required everywhere

## Defaults

Use the admin endpoint `POST /api/v1/admin/rbac/ensure-defaults` to initialize:

- Roles created: `admin`, `teacher`, `guest`
- Permissions created:
  - `*` (wildcard, admin only)
  - `students.read|write|delete`
  - `courses.read|write|delete`
  - `attendance.read|write`
  - `grades.read|write`
  - `imports.preview|execute`
  - `exports.generate|download`
  - `students.self.read`, `grades.self.read`, `attendance.self.read`
- Grants:
  - `admin` → `*`
  - `teacher` → academic create/read/update + imports/exports (no delete)
  - `guest` → read‑only for students/courses
- Backfill: If legacy `User.role` exists (`admin`, `teacher`, `guest`), a corresponding `UserRole` row is added.

## Admin API Endpoints (RBAC)

Base prefix: `/api/v1/admin/rbac`

- `POST /roles` → create role
- `GET /roles` → list roles
- `PUT /roles/{role_id}` → update role
- `DELETE /roles/{role_id}` → delete role

- `POST /permissions` → create permission
- `GET /permissions` → list permissions
- `PUT /permissions/{permission_id}` → update permission
- `DELETE /permissions/{permission_id}` → delete permission

- `POST /bulk-assign-role` → assign a role to many users
- `POST /bulk-grant-permission` → grant a permission to many roles
- `POST /assign-role` → assign a role to one user (protected: cannot remove last admin via revoke)
- `POST /revoke-role` → revoke a role from a user (protected: cannot remove the last admin)
- `POST /revoke-permission` → revoke a permission from a role (protected: cannot remove admin wildcard `*`)
- `GET /summary` → RBAC snapshot (roles, permissions, role→permission edges, user→role edges)
- `GET /change-history` → paginated audit entries for RBAC changes

All admin RBAC endpoints require appropriate permissions. For example:
- CRUD operations require `rbac.roles.*` or `rbac.permissions.*`
- Bulk/assign/revoke operations require `*` (admin) or suitable fine‑grained permissions

## Permission Helpers

- `require_permission("perm")` → hard requirement; returns 403 if missing
- `optional_require_permission("perm")` → respects `AUTH_ENABLED` and `AUTH_MODE`; in `disabled` mode returns a dummy admin user on non‑auth endpoints
- `optional_require_role("admin")` → role check that honors `AUTH_MODE`; in `disabled` mode blocks `/admin/*` unless authenticated

Permission resolution:
- If RBAC tables exist and user has `UserRole` entries, permissions are read from `RolePermission` via `Permission` names.
- If not, a fallback default mapping based on legacy `User.role` is used.
- Wildcards (`*`) allow everything; hierarchical checks accept `students.*` for `students.read`.

## Migration & Schema

Alembic manages schema:
- Files under `backend/migrations/versions/` include `add_rbac_tables` and related merges.
- Apply migrations via consolidated scripts or programmatic runner (`backend/run_migrations.py`).
- Never call `Base.metadata.create_all()` in production; tests use in‑memory DB and create_all for isolation.

## Security Safeguards

- Cannot revoke the `admin` role when it would leave zero admins ("last admin" protection).
- Cannot revoke the wildcard `*` from `admin`.
- Admin endpoints use `optional_require_role("admin")` or `require_permission("*")` to enforce access.
- All RBAC changes are audit‑logged (action, resource, user, IP, user‑agent, success/error).

## Examples (API)

Assume `Authorization: Bearer <admin-token>` headers for admin calls.

Create a role:
- `POST /api/v1/admin/rbac/roles` JSON: `{ "name": "auditor", "description": "Read-only reports" }`

Create a permission:
- `POST /api/v1/admin/rbac/permissions` JSON: `{ "name": "reports.read", "description": "Read reports" }`

Bulk grant permission:
- `POST /api/v1/admin/rbac/bulk-grant-permission` JSON: `{ "role_names": ["auditor"], "permission_name": "reports.read" }`

Assign role to a user:
- `POST /api/v1/admin/rbac/assign-role` JSON: `{ "user_id": 42, "role_name": "teacher" }`

Revoke role:
- `POST /api/v1/admin/rbac/revoke-role` JSON: `{ "user_id": 42, "role_name": "teacher" }` (blocked if last admin)

Get summary:
- `GET /api/v1/admin/rbac/summary`

## Operational Tips

- Set `AUTH_ENABLED=1` and `AUTH_MODE=permissive` for production unless you require `strict`.
- Run `COMMIT_READY.ps1 -Quick` before committing changes; it formats, lints, and runs smoke tests.
- For migrations across environments (native vs Docker), prefer the consolidated scripts and verify via `/health`.

## Related Docs

- `docs/ROLE_PERMISSIONS_MODEL.md` — underlying RBAC model
- `backend/security/permissions.py` — permission helpers and resolution logic
- `backend/routers/routers_rbac.py` — admin RBAC endpoints
- `backend/run_migrations.py` — programmatic Alembic runner
