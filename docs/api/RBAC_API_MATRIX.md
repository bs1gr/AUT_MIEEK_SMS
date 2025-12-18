# RBAC API and Permission Matrix

## Overview
This document describes the available RBAC (Role-Based Access Control) API endpoints and the permission matrix for the Student Management System.

---

## RBAC CRUD Endpoints

### Roles
- `POST   /admin/rbac/roles`           — Create a new role (permission: `rbac.roles.create`)
- `GET    /admin/rbac/roles`            — List all roles (permission: `rbac.roles.read`)
- `PUT    /admin/rbac/roles/{role_id}`  — Update a role (permission: `rbac.roles.update`)
- `DELETE /admin/rbac/roles/{role_id}`  — Delete a role (permission: `rbac.roles.delete`)

### Permissions
- `POST   /admin/rbac/permissions`                — Create a new permission (permission: `rbac.permissions.create`)
- `GET    /admin/rbac/permissions`                — List all permissions (permission: `rbac.permissions.read`)
- `PUT    /admin/rbac/permissions/{permission_id}`— Update a permission (permission: `rbac.permissions.update`)
- `DELETE /admin/rbac/permissions/{permission_id}`— Delete a permission (permission: `rbac.permissions.delete`)

### Role/Permission Assignment
- `POST   /admin/rbac/assign-role`                — Assign a role to a user (permission: `*`)
- `POST   /admin/rbac/revoke-role`                — Revoke a role from a user (permission: `*`)
- `POST   /admin/rbac/bulk-assign-role`           — Bulk assign a role to users (permission: `*`)
- `POST   /admin/rbac/bulk-grant-permission`      — Bulk grant a permission to roles (permission: `*`)
- `POST   /admin/rbac/revoke-permission`          — Revoke a permission from a role (permission: `*`)

### RBAC Utilities
- `POST   /admin/rbac/ensure-defaults`            — Ensure default roles/permissions (permission: `admin` only)
- `GET    /admin/rbac/summary`                    — Get RBAC summary (permission: `admin` only)
- `GET    /admin/rbac/change-history`             — Get RBAC change history (permission: `admin` only)

---

## Permission Matrix (Core)

| Endpoint                        | Permission Required           |
|----------------------------------|------------------------------|
| /admin/rbac/roles (POST)         | rbac.roles.create            |
| /admin/rbac/roles (GET)          | rbac.roles.read              |
| /admin/rbac/roles/{id} (PUT)     | rbac.roles.update            |
| /admin/rbac/roles/{id} (DELETE)  | rbac.roles.delete            |
| /admin/rbac/permissions (POST)   | rbac.permissions.create      |
| /admin/rbac/permissions (GET)    | rbac.permissions.read        |
| /admin/rbac/permissions/{id} (PUT)| rbac.permissions.update     |
| /admin/rbac/permissions/{id} (DELETE)| rbac.permissions.delete   |
| /admin/rbac/assign-role (POST)   | *                            |
| /admin/rbac/revoke-role (POST)   | *                            |
| /admin/rbac/bulk-assign-role (POST)| *                          |
| /admin/rbac/bulk-grant-permission (POST)| *                     |
| /admin/rbac/revoke-permission (POST)| *                         |
| /admin/rbac/ensure-defaults (POST)| admin only                  |
| /admin/rbac/summary (GET)        | admin only                   |
| /admin/rbac/change-history (GET) | admin only                   |

---

## Notes
- `*` (wildcard) permission is required for most assignment/grant/revoke endpoints (typically only admins have this).
- "admin only" endpoints require the user to have the `admin` role (legacy compatibility).
- All endpoints are protected by rate limiting and audit logging.

---

_Last updated: 2025-12-18_
