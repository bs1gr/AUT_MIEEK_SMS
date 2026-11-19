# RBAC operations: what to check, and what repairs itself

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the steps in the pages),
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission),
[PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what),
[PERMISSION_MANAGEMENT_GUIDE.md](PERMISSION_MANAGEMENT_GUIDE.md) (the API) and
[BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md).

This file used to hold daily, weekly and monthly SQL checks, alarm thresholds, incident
runbooks and a support organisation, written for a database with three roles and a `role_id`
column on the accounts. The application has neither, so the procedures no longer applied. The
earlier text is in the repository's history.

## What a healthy installation shows

Sign in as an administrator: **System** > **Show Control Panel** > **Maintenance**.

- **RBAC Configuration** > **Overview** shows **Roles (2)** and **Permissions (44)** on an
  installation that nobody has added roles or permissions to. "Role-Permission Mappings" lists
  53 grants: 27 for `admin` (`*:*` and the teacher's 26 by name) and 26 for `teacher`.
- **RBAC Configuration** > **Users** lists every account with its number, the word in its Role
  column and the roles it holds. An active Administrator or Teacher shows its role. "No RBAC
  roles assigned" belongs only to an account that is meant to have no role.
- **User Accounts** counts the registrations waiting for approval.
- **Audit Log** says who changed what and when. Narrow it with **What was done** (for
  example "Role changed" or "Permission granted"), **Made by**, **From** and **To**. Look for
  changes nobody expected. "Not recorded" under **Who** stands for entries written before
  authors were recorded, and for a request without a sign-in.

## What every start does

The application does this at every start, without anybody pressing a button:

- It **seeds** when the database has no roles, no permissions or no grants, when one of the
  two roles is missing, or when the role `admin` does not hold an active `*:*`. Seeding adds
  what is missing (the roles, all 44 permissions, the standard grants, and it switches `*:*`
  on) and removes nothing.
- It **gives every account whose Role column says Administrator or Teacher the row of that
  role** if the account lacks it. This keeps an old database working and gives the first
  administrator of an installation the role the start has just seeded. It never gives back a
  role that was taken away: **No role** names no role. This step also runs when the migrations
  failed, so that an administrator can sign in and see what went wrong.

A start does not put back a single standard grant that somebody took from `teacher` while
nothing else is missing. **Initialize RBAC Defaults** does.

## Initialize RBAC Defaults

**RBAC Configuration** > **Settings** > **Initialize RBAC Defaults** does what a start does
when it seeds, whatever the state of the database, including the rows of the accounts' roles.
It removes nothing: a permission you took from a role comes back, a permission you added
stays. What it adds is written to the Audit Log.

## When something is wrong

The steps are in "If the administrator is locked out" and "Take an account's access away" in
[RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md). In short:

| What you see | What it is | The way out |
|---|---|---|
| The role and account panels answer "forbidden" for every administrator | `admin` has lost `*:*` | Restart the application: the start puts it back |
| A person can sign in and every page answers "forbidden"; a line at the top says the account has no role | The account has no role | **User Accounts** > **Edit** > Teacher, or **Assign Role to User** |
| A standard role is missing | An older version could delete it | Restart the application |
| An administrator forgot the password | | Another administrator resets it in **User Accounts** |
| There is no other administrator | | `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` and `DEFAULT_ADMIN_FORCE_RESET=true` in the server's environment; take `DEFAULT_ADMIN_FORCE_RESET` out afterwards |
| An account has to stop at once | | **Edit** > untick **Active** |

## Keep two administrators

The application refuses to delete, deactivate or demote the last active administrator, and to
revoke the Administrator role from the last one. It cannot help when that one administrator
forgets the password: the way out then is the environment settings above. A second administrator
resets the password in **User Accounts**.

## Reviewing what single accounts were granted

A grant to one account is not in the **Users** tab, which lists roles. Look an account up in
**RBAC Configuration** > **Permissions Catalog** > "User permission lookup": "Direct
permissions" are the grants made to the account itself. Taking a role away, or choosing **No
role**, leaves them in place. The **Audit Log**, with **What was done** set to "Permission
granted", shows the grants and who made them (a permission that was created or switched on is
listed there too).

For all accounts at once no page has a list. Somebody with access to the database can read it
(the columns are those of `user_permissions`, `users` and `permissions` in `models.py`):

```sql
-- Grants made to single accounts that still count, and who made them
SELECT u.id, u.email, p.key, up.granted_at, up.expires_at, g.email AS granted_by
FROM user_permissions up
JOIN users u ON u.id = up.user_id
JOIN permissions p ON p.id = up.permission_id
LEFT JOIN users g ON g.id = up.granted_by
WHERE p.is_active IS TRUE
  AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
ORDER BY u.email, p.key;

-- Active accounts that hold no role
SELECT u.id, u.email, u.role
FROM users u
WHERE u.is_active IS TRUE
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
```

The second list should hold only accounts whose Role column says `none`. One that says `admin`
or `teacher` is given its role at the next start.

These queries only read. Change nothing by SQL: it leaves no entry in the Audit Log, and a
server that keeps answers for some seconds (`PERMISSION_CACHE_TTL_SECONDS`) sees the change only
when they expire.

## Adding a permission

For a developer. A permission exists when an endpoint asks for it:

1. The endpoint uses `@require_permission("area:action")` (see
   [API_PERMISSIONS_REFERENCE.md](../../src/backend/API_PERMISSIONS_REFERENCE.md)).
2. Add the key to `PERMISSION_DEFS` in `src/backend/routers/routers_rbac.py`, and to
   `TEACHER_PERMISSIONS` if teachers are to hold it. These tests fail until it is there:
   `test_two_roles_model.py` and `test_permission_documents.py`. The first also states the
   numbers (44 permissions, 53 grants), which change with it.
3. Add its name to `permissionNames` in `src/frontend/src/locales/en/rbac.js` and `el/rbac.js`;
   `permissionNames.test.ts` fails until you do.
4. Name it in [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md), under one of its four
   headings, with who holds it, and update the number of permissions there and in
   [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md).
5. Refresh the table of endpoints in [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md):
   `python -m backend.scripts.endpoint_requirements --write`, run in `src/backend`.

An installation that already runs does not get the new permission from a start: a start seeds
only in the cases above. Add a migration that inserts it, as migration `5189ab647b5a` did for
the thirteen it added, or have the administrators press **Initialize RBAC Defaults**.

## Backup

[BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) says what is backed up and how to restore. After a
restore the application gives the accounts the rows of their roles again (the step at every
start); **Initialize RBAC Defaults** adds anything else that is missing.
