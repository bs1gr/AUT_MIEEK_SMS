# Managing permissions through the API

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the administrator's steps in the
pages), [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission and what it opens)
and [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (every endpoint and what it asks for).

This file used to hold SQL and curl procedures written for a plan: three roles, 26 permissions,
a `role_id` column on the accounts and a seed script. The application has none of these, so the
procedures no longer applied. The earlier text is in the repository's history.

## Use the pages first

Everything below can be done in the pages: **System** > **Show Control Panel** >
**Maintenance** > **RBAC Configuration** and **User Accounts**. The steps are in
[RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md). Write a script only when something has to be done
many times or without a person at the screen.

The pages use the same requests. **Permissions Catalog** sends the four requests under
`/api/v1/permissions` that grant and revoke. **Assign Role to User** and **Initialize RBAC
Defaults** use `/api/v1/admin/rbac`.

## Signing in for the API

The API takes a bearer token. Get one with a sign-in, then send it with every request:

```
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "..."}'

curl http://localhost:8000/api/v1/permissions/stats \
  -H "Authorization: Bearer <access_token>"
```

- The answer to the sign-in is `{"access_token": "...", "token_type": "bearer"}`. A token
  lasts 30 minutes unless the server sets `ACCESS_TOKEN_EXPIRE_MINUTES` differently; sign in
  again for a new one.
- Port 8000 is a server started from source (native), port 8080 the Docker stack.
- The account must be active. One that has to change its password first is refused everywhere
  except `/auth/me`, the password change, the token refresh and the sign-out.
- The server's CSRF check (`CSRF_ENABLED`) is off unless the installation switches it on.
  Where it is on, requests that change data are checked for a CSRF token as well; this file does
  not cover that.

## What a request asks for

Reading needs `permissions:view`, changing needs `permissions:manage`, and the history of
changes needs `audit:view`. Only the role `admin` holds them. Every request below is checked
with the permissions of the account that sent it, and a change counts from the next request
(see "How a request is decided" in [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md)).

The two families spell the permission differently in a body: `/permissions/...` says
`permission_key`, `/admin/rbac/...` says `permission_name`.

## `/api/v1/permissions`

| Request | Asks for | Body or query | Answer |
|---|---|---|---|
| `GET /permissions/` | `permissions:view` | query `resource`, `action`, `is_active`, `search`, `skip` (0), `limit` (100, at most 500) | a list of `{id, key, resource, action, description, is_active}` |
| `GET /permissions/by-resource` | `permissions:view` | none | `[{resource, permissions: [...]}]`, the active ones |
| `GET /permissions/stats` | `permissions:view` | none | `{total_permissions, active_permissions, inactive_permissions, permissions_by_resource, most_common_actions}`; a new database counts 44 |
| `GET /permissions/{id}` | `permissions:view` | none | one permission, with `created_at` and `updated_at` |
| `POST /permissions/` | `permissions:manage` | `{key, resource, action, description?}` | 201 and the permission; 400 when the key exists |
| `PATCH /permissions/{id}` | `permissions:manage` | `{description?, is_active?}` | the permission |
| `DELETE /permissions/{id}` | `permissions:manage` | none | 204; its grants go with it |
| `POST /permissions/roles/grant` | `permissions:manage` | `{role_name, permission_key}` | `{status: "granted", role_name, permission_key}`, or `{status: "already_granted"}` |
| `POST /permissions/roles/revoke` | `permissions:manage` | `{role_name, permission_key}` | `{status: "revoked", ...}`; 404 when the role did not hold it |
| `POST /permissions/users/grant` | `permissions:manage` | `{user_id, permission_key, expires_at?}` | `{status: "granted", user_id, permission_key}`; when it was held already, `{status: "already_granted", updated_expiration: true or false}` |
| `POST /permissions/users/revoke` | `permissions:manage` | `{user_id, permission_key}` | `{status: "revoked", ...}`; 404 when the account did not hold it |
| `GET /permissions/users/{user_id}` | signed in; another account needs `users:view` | none | `{user_id, email, role, permissions, direct_permissions, role_permissions}` |

In the last answer `permissions` is every key the account holds, `direct_permissions` is a list
of `{permission_key, granted_at, expires_at}` and `role_permissions` a list of
`{permission_key, role_name}`.

A grant needs an active permission (404 "Permission not found or inactive"). The wildcard
`*:*` cannot be switched off, deleted, renamed, or revoked from the role `admin`: the server
answers 400.

## `/api/v1/admin/rbac`

| Request | Asks for | Body or query | Answer |
|---|---|---|---|
| `GET /roles` | `permissions:view` | none | `[{id, name, description}]` |
| `POST /roles` | `permissions:manage` | `{name, description?}` | the role; 400 when it exists |
| `PUT /roles/{id}` | `permissions:manage` | `{name?, description?}` | the role; 400 when `admin` or `teacher` is renamed, and when the new name exists |
| `DELETE /roles/{id}` | `permissions:manage` | none | `{status: "deleted"}`; the accounts that held the role lose it; 400 for `admin` and `teacher` |
| `GET /permissions` | `permissions:view` | none | a list of `{id, key, resource, action, description, is_active}` |
| `POST /permissions` | `permissions:manage` | `{key, resource, action, description?}` | the permission; 400 when the key exists |
| `PUT /permissions/{id}` | `permissions:manage` | `{key?, resource?, action?, description?}` | the permission; 400 when the new key exists, or when the key of `*:*` is changed |
| `DELETE /permissions/{id}` | `permissions:manage` | none | `{status: "deleted"}` |
| `POST /assign-role` | `permissions:manage` | `{user_id, role_name}` | `{status: "assigned"}`; `admin` also gives `teacher` |
| `POST /revoke-role` | `permissions:manage` | `{user_id, role_name}` | `{status: "revoked", role}` with the word now in the account's Role column, or `{status: "not_assigned"}`; 400 "Cannot remove the last admin user" |
| `POST /bulk-assign-role` | `permissions:manage` | `{user_ids: [...], role_name}` | `{results: [{user_id, status}]}`, status `assigned`, `already_assigned` or `user_not_found` |
| `POST /bulk-grant-permission` | `permissions:manage` | `{role_names: [...], permission_name}` | `{results: [{role_name, status}]}`, status `granted`, `already_granted` or `role_not_found` |
| `POST /revoke-permission` | `permissions:manage` | `{role_name, permission_name}` | `{status: "revoked"}` or `{status: "not_granted"}` |
| `POST /ensure-defaults` | `permissions:manage` | none | `{status: "ok"}`; the button **Initialize RBAC Defaults** |
| `GET /summary` | `permissions:view` | none | `{roles, permissions, role_permissions: [{role_id, permission_id}], user_roles: [{user_id, role_id}]}` |
| `GET /change-history` | `audit:view` | query `page` (1), `page_size` (50), `action`, `user_id` | `{logs, total, page, page_size, has_next}`: only entries of the actions `role_change`, `permission_grant` and `permission_revoke`; `user_id` is the account that made the change |

Accounts themselves (`/api/v1/admin/users`, `/api/v1/auth/...`) ask for `users:view` and
`users:manage`: see [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md).

## When a request is refused

- Without a token, in the default mode: 401 "Authentication required".
- A permission the account does not hold: 403 "Permission denied: requires
  'permissions:manage'". The text names the key, and it is English whatever language the client
  asks for.
- The answer has the same envelope as every other: `success`, `error` with `code` (`HTTP_403`),
  `message`, `details` and `path`, and `meta` with `request_id`, `timestamp` and `version`.
- Another account's permissions without `users:view`: 403 "Permission denied".

## An end date, and who granted

- A grant to an account may carry `expires_at`. It counts while that moment has not passed; a
  time sent without a zone is read as UTC. Afterwards it counts for nothing.
- Sending the grant again with a new `expires_at` changes the date. Sending it without one
  changes nothing, so to remove an end date, revoke the grant and grant it again. The pages
  have no field for an end date.
- The account that sent a grant to an account is stored as `granted_by` in `user_permissions`,
  with `granted_at`. No page shows the column; the Audit Log names the author of every grant and
  revoke.

## What the Audit Log records

**Maintenance** > **Audit Log** and `GET /api/v1/audit/logs` (for `audit:view`) show, with
the account that made it:

- assigning and revoking a role, in bulk or one by one;
- every grant and revoke of a permission, to a role or to an account, from either family;
- creating, renaming, describing anew and deleting a role (a deletion says how many accounts
  held the role);
- creating, changing, switching off, switching on and deleting a permission (a deletion says
  how many roles and accounts held it);
- what **Initialize RBAC Defaults** adds.

A save that changes nothing writes nothing. Switching a permission off is recorded as a
revoke and switching it on as a grant; a change to its key, its description, its resource or
its action is recorded with the action `update`, so `GET /change-history` does not list it
(see above) and the Audit Log does.

Not written: a change of the end date of a grant that exists, a request refused for lack of a
permission, and signing in and out.

Do not change the tables by SQL. It leaves no entry in the Audit Log, and a server that keeps
answers for some seconds (`PERMISSION_CACHE_TTL_SECONDS`) sees the change only when they expire.
