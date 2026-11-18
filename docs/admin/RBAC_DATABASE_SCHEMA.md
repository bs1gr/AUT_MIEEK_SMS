# RBAC database schema

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (how a request is decided, and
what the roles hold), [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the pages) and
[PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what).

This file described the tables well, and then went on with a seeding plan for three roles and
25 permissions, a fallback to the Role column, a migration plan in three phases and a list of
open questions. The tables below are those of the old text, checked against `backend/models.py`
and completed; everything after them was corrected, and the plans and questions were removed.
The earlier text is in the repository's history.

## The tables

```
 users --- user_roles --- roles --- role_permissions --- permissions
   |                                                          |
   +------------------- user_permissions --------------------+
   |
   +--- audit_logs  (who did it, kept when the account goes)
```

An account may do what these rows say: the grants of its roles (`user_roles` to
`role_permissions`) and the grants made to it alone (`user_permissions`).

### permissions (`Permission`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `key` | string(100) | unique, not null, indexed: `resource:action`, for example `students:view` |
| `resource` | string(50) | not null, indexed |
| `action` | string(50) | not null |
| `description` | text | |
| `is_active` | boolean | default true, indexed. A permission that is off counts for nobody |
| `created_at`, `updated_at` | datetime with time zone | not null |

Indexes: `idx_permissions_key` (unique), `idx_permissions_resource`, `idx_permissions_is_active`.

### roles (`Role`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `name` | string(100) | unique, not null, indexed |
| `description` | string(255) | |

Index: `idx_roles_name` (unique). A role has no `is_active` and no time stamps.

### role_permissions (`RolePermission`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `role_id` | integer | not null, indexed, foreign key to `roles.id`, ON DELETE CASCADE |
| `permission_id` | integer | not null, indexed, foreign key to `permissions.id`, ON DELETE CASCADE |
| `created_at` | datetime with time zone | not null |

Index: `idx_role_permission_unique` on (`role_id`, `permission_id`), unique.

### user_roles (`UserRole`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `user_id` | integer | not null, indexed, foreign key to `users.id`, ON DELETE CASCADE |
| `role_id` | integer | not null, indexed, foreign key to `roles.id`, ON DELETE CASCADE |

Index: `idx_user_role_unique` on (`user_id`, `role_id`), unique. An account may hold several
roles.

### user_permissions (`UserPermission`)

Permissions granted to one account, past its roles.

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `user_id` | integer | not null, indexed, foreign key to `users.id`, ON DELETE CASCADE |
| `permission_id` | integer | not null, indexed, foreign key to `permissions.id`, ON DELETE CASCADE |
| `granted_by` | integer | foreign key to `users.id`, ON DELETE SET NULL; the account that sent the grant; not indexed |
| `granted_at` | datetime with time zone | not null |
| `expires_at` | datetime with time zone | optional end date, indexed. After it the grant counts for nothing |

Indexes: `idx_user_permission_unique` on (`user_id`, `permission_id`), unique;
`idx_user_permission_user_id`; `idx_user_permission_expires_at`.

### users (`User`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `email` | string(255) | unique, not null, indexed |
| `hashed_password` | string(255) | not null |
| `full_name` | string(200) | |
| `role` | string(50) | not null, indexed, default `teacher`. Holds `admin`, `teacher` or `none` ("No role") |
| `is_active` | boolean | default true, indexed |
| `password_change_required` | boolean | not null, default false, indexed |
| `registration_pending` | boolean | not null, default false: a registration waiting for approval |
| `failed_login_attempts` | integer | not null, default 0 |
| `last_failed_login_at`, `lockout_until` | datetime with time zone | indexed |
| `created_at`, `updated_at` | datetime with time zone | not null, indexed |

Index: `idx_users_email_role` on (`email`, `role`). In the model, the account has relations to
its `user_permissions` and its dashboards only; `user_roles` is reached through its own table.

The Role column does not grant anything. Role checks read it (see "Checks that are not
permissions" in [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md)); permission checks do not.

### audit_logs (`AuditLog`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key |
| `action` | string(50) | not null, indexed: `role_change`, `permission_grant`, `permission_revoke`, `create`, `update`, `delete`, `password_change`, and others |
| `resource` | string(50) | not null, indexed: `user` for accounts, roles and permissions |
| `resource_id` | string(100) | indexed: the number of the account the entry is about, when it is about one |
| `user_id` | integer | foreign key to `users.id`, indexed: the account that made the change; empty when it is not known or when that account was deleted |
| `user_email` | string(255) | the same account's address, kept when the account is deleted |
| `ip_address`, `user_agent` | string(45), string(512) | from the request |
| `details` | JSON | what was done, for example `{"operation": "assign_role", "role": "teacher"}` |
| `success` | boolean | not null, default true |
| `error_message` | text | |
| `timestamp` | datetime with time zone | not null, indexed |
| `old_values`, `new_values`, `change_reason` | JSON, JSON, string(500) | |
| `request_id` | string(64) | indexed |

Indexes: `idx_audit_user_action` (`user_id`, `action`), `idx_audit_resource_action`
(`resource`, `action`), `idx_audit_timestamp_action` (`timestamp`, `action`),
`idx_audit_request_id`.

## How a permission is resolved

`has_permission` in `backend/rbac.py`:

1. With `AUTH_MODE` set to `disabled` the answer is yes without a look at the tables.
2. Otherwise it collects the permissions that count: the account's rows in `user_permissions`
   whose permission is active and whose `expires_at` is empty or still to come, and the active
   permissions of every role the account holds (`user_roles` to `role_permissions`).
3. A collected permission satisfies the one asked for when it is the same, when it is `*:*`, or
   when it is an area followed by `:*` (none is in use).
4. The answer is yes when any does. There is no other source: the Role column adds nothing.

Keys are compared in lower case, a key written with a dot and no colon is read with a colon,
and `*` is read as `*:*`. A database
error while reading one of the two sources counts that source as granting nothing. With
`PERMISSION_CACHE_TTL_SECONDS` set, an answer is kept for that many seconds; it is off unless
set.

## What a new database holds

The application seeds these at its first start (see "The step at every start" in
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md)):

- **Two roles**, `admin` and `teacher`. They can be neither renamed nor deleted.
- **44 permissions**: the wildcard `*:*` and the 43 that endpoints ask for.
- **51 grants** in `role_permissions`: 26 for `admin` (`*:*`, and each of the teacher's 25 by
  name) and 25 for `teacher`.

Every account whose Role column says `admin` or `teacher` is given the row of that role in
`user_roles` at each start, if it lacks it. Assigning `admin` under **Assign Role to User** also
gives `teacher`; creating an account in **User Accounts** gives the one role. The Role column
follows the highest role the account holds, and reads `none` when it holds neither.

## Deleting an account, a role

The foreign keys above say ON DELETE CASCADE (and SET NULL for `granted_by`). PostgreSQL does
what they say. This application runs SQLite without foreign-key enforcement, so when an
account is deleted, and when one is created, it removes by itself what still points at the
number. Its entries in `audit_logs` stay: `user_id` is emptied and `user_email` remains.

Deleting a role removes its rows in `user_roles` in the same request, so that no account is
left holding a role that was never given to it once SQLite hands the number to the next role.
Creating a role clears any such leftover rows under its new number.

## What is recorded

Role changes, grants and revokes, what is done to an account, and the creation, change and
deletion of a role or a permission are written to `audit_logs` with the account that made
them (**Maintenance** > **Audit Log**; see "The audit log" in
[RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md)). Not written: a request refused for lack of a
permission, and signing in and out.
