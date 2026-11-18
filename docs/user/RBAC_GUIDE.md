# RBAC guide: roles and permissions in short

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [RBAC_ADMIN_GUIDE.md](../admin/RBAC_ADMIN_GUIDE.md) (the steps in the pages),
[PERMISSION_REFERENCE.md](../admin/PERMISSION_REFERENCE.md) (every permission),
[PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md) (who can do what, and every endpoint) and
[API_PERMISSIONS_REFERENCE.md](../../src/backend/API_PERMISSIONS_REFERENCE.md) (for a developer).

This guide used to describe roles named admin, teacher and guest, permissions written
`students.read` and `courses.write`, and a fallback list of permissions for the word in the Role
column. The application has none of these, and the guide advised the unsafe mode `permissive`
for production. The earlier text is in the repository's history. This is the model in one page.

## The model

- An account's **Role** column holds `admin`, `teacher` or `none` (shown as **No role**).
- There are two roles, **Administrator** (`admin`) and **Teacher** (`teacher`). They can be
  neither renamed nor deleted. Assigning `admin` under **Assign Role to User** also gives
  `teacher`.
- A role holds permissions, and a permission can also be granted to one account alone. An
  account may do what its roles and its own grants say, and nothing else. `*:*` covers every
  permission and belongs to `admin`; the other 43 of the 44 are what the endpoints ask for.
- An account with **No role** can sign in and change its own password, and nothing else
  opens for it. Students have no accounts: a student is a record the teachers keep.
- Permissions are written `area:action`, for example `students:view`.
- A change counts from the account's next request. Nobody has to sign in again.

## What each can do

| Task | Administrator | Teacher | No role |
|---|---|---|---|
| Students, courses, enrolments, grades, attendance, highlights, daily performance and the lesson log: see, add, change, delete | yes | yes | no |
| Search, the Dashboard's figures, Analytics, student performance reports, custom reports | yes | yes | no |
| Export files (**Utils** > **Export**) | yes | yes | no |
| Import students and courses from a file (**Utils** > **Imports**) | yes | yes | no |
| Send a message to all users or to a role; the feedback inbox | yes | yes | no |
| Own notifications, saved searches, own dashboards, own password | yes | yes | yes |
| Report templates: create, change, delete, import | yes | no | no |
| Session export and import | yes | no | no |
| Accounts, roles and permissions, the **Audit Log** | yes | no | no |
| Backup, restore and clear the database, the semester archive, e-mail settings, rate limits | yes | no | no |
| A student's data export and erasure, the health field | yes | no | no |

The table of every endpoint is in [PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md).

## Where it is managed

Sign in as an administrator: **System** > **Show Control Panel** > **Maintenance**.

- **User Accounts**: create an account, approve a registration, change the name, the role
  (Administrator, Teacher or **No role**) and **Active**, reset a password, delete.
- **RBAC Configuration**: **Overview**, **Users**, **Assign Role to User**, **Permissions
  Catalog** (grant and revoke a permission to a role or to one account; look an account up) and
  **Settings** (**Initialize RBAC Defaults**).
- **Audit Log**: who did what, and when.

The steps are in [RBAC_ADMIN_GUIDE.md](../admin/RBAC_ADMIN_GUIDE.md). Nothing is done with SQL.

## The three auth modes

`AUTH_MODE` is a setting of the server, not of a page.

| Mode | What it does |
|---|---|
| `strict` (the default) | Every request must be signed in, and the checks apply |
| `permissive` | A request **without** a sign-in passes the permission checks. A signed-in request is checked as in `strict` |
| `disabled` | No check is made |

**`permissive` lets a request without a sign-in through: anybody who can reach the server reads
and changes the data. It is never for a server that other machines can reach.** Keep `strict`.
The server writes a warning to its log at every start when the mode is not `strict`.

## The API for roles and permissions

Under `/api/v1/admin/rbac`. Reading asks for `permissions:view`, every change for
`permissions:manage`; only `admin` holds them. Sign in with `POST /api/v1/auth/login` and send
the token as `Authorization: Bearer <token>`.

| Request | Body | Answer |
|---|---|---|
| `GET /roles`, `GET /permissions`, `GET /summary` | none | the roles, the permissions, or all of them with the grants and the roles of the accounts |
| `POST /roles` | `{"name": "...", "description": "..."}` | the role |
| `PUT /roles/{id}`, `DELETE /roles/{id}` | `{"name"?, "description"?}` | the role, or `{"status": "deleted"}` |
| `POST /permissions` | `{"key": "area:action", "resource": "...", "action": "...", "description": "..."}` | the permission |
| `PUT /permissions/{id}`, `DELETE /permissions/{id}` | `{"key"?, "resource"?, "action"?, "description"?}` | the permission, or `{"status": "deleted"}` |
| `POST /assign-role`, `POST /revoke-role` | `{"user_id": 42, "role_name": "teacher"}` | `{"status": "assigned"}`, or `{"status": "revoked", "role": ...}` |
| `POST /bulk-assign-role` | `{"user_ids": [42, 43], "role_name": "teacher"}` | `{"results": [...]}` |
| `POST /bulk-grant-permission` | `{"role_names": ["teacher"], "permission_name": "audit:view"}` | `{"results": [...]}` |
| `POST /revoke-permission` | `{"role_name": "teacher", "permission_name": "audit:view"}` | `{"status": "revoked"}` |
| `POST /ensure-defaults` | none | `{"status": "ok"}`; the button **Initialize RBAC Defaults** |
| `GET /change-history` | none (query `page`, `page_size`, `action`, `user_id`) | the entries of the actions `role_change`, `permission_grant` and `permission_revoke`; asks for `audit:view` |

The server refuses what would lock the administrators out: revoking the Administrator role from
the last administrator, and taking `*:*` from `admin` (revoking, switching it off, deleting or
renaming it). It also refuses to rename or delete the roles `admin` and `teacher`. Granting to
one account, and the other requests under `/api/v1/permissions`, are in
[PERMISSION_MANAGEMENT_GUIDE.md](../admin/PERMISSION_MANAGEMENT_GUIDE.md).

## Where changes are recorded

The **Audit Log** (**Maintenance** > **Audit Log**, administrators only; the API answers
`GET /api/v1/audit/logs` for an account with `audit:view`) lists, with **When**, **Who**, **What**
and **About**: changes to accounts (created, role changed, activated, deactivated, deleted,
password reset), roles given and taken away, permissions granted and revoked, and the creation,
change and deletion of a role or a permission through the API. Narrow it with **What was
done**, **Made by**, **From** and **To**. Not recorded: a request refused for lack of a
permission, and signing in and out.
