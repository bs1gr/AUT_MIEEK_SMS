# RBAC codebase review, January 2026

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [RBAC_DATABASE_SCHEMA.md](RBAC_DATABASE_SCHEMA.md) (the tables today),
[RBAC_ENDPOINT_AUDIT.md](RBAC_ENDPOINT_AUDIT.md),
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (how a request is decided) and
[API_PERMISSIONS_REFERENCE.md](../../src/backend/API_PERMISSIONS_REFERENCE.md) (for a developer).

This file held an automated review of 8 January 2026 that prepared a "Phase 2" of the
permission work: five files read (`rbac.py`, `security/current_user.py`, `routers/routers_auth.py`,
`dependencies.py`, `models.py`), the finding that no endpoint used the new decorators and that
the tables were empty, and a plan of three weeks to move 148 endpoints. The plan was carried
out, so the findings no longer applied. The earlier text is in the repository's history.

## What the review found, and what is true today

| The review found (8 January 2026) | Today |
|---|---|
| No endpoint uses `@require_permission`; 148 endpoints use `optional_require_role` | `@require_permission` is used 215 times in 26 router files. `optional_require_role` is used 21 times in 5 router files, for the checks that ask for the role `admin` (or `admin` and `teacher`), which a grant cannot open. The application has 344 endpoints (see [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md)) |
| The permission and role tables are empty; seed them with a script | A start seeds them when they are missing: two roles, 44 permissions, 53 grants. There is no seed script; the button is **Initialize RBAC Defaults** |
| Permissions come from three sources: grants to the account, roles, and the legacy rule "the word `admin` in the Role column holds everything" | Two sources, and the wildcard: grants to the account and the grants of its roles; `*:*` covers everything. The Role column no longer grants anything |
| Roles admin, teacher, viewer; students reach their own data through self-access | Two roles, and "No role" for an account that holds neither. Students have no accounts. The self-access rule is still in `rbac.py`, on nine endpoints, and opens nothing |
| `has_permission` uses raw SQL for role permissions | It uses the ORM. Raw SQL is left in `get_user_permissions` and in the grant, revoke and lookup requests of `routers_permissions.py` |
| Three queries per check, no cache | Two to four questions per check, and an optional cache of the answers: `PERMISSION_CACHE_TTL_SECONDS`, off unless set |
| The decorator expects `current_user`, `db` and `request` among the endpoint's parameters | It reads the account itself from the bearer token. It needs `request`; it hands `db` over only to an endpoint that takes it |
| `security/current_user.py` and `routers_auth.py` as the base of authentication | Both still are. `current_user.py` also notes who is acting on each request (`remember_actor`), which is how an entry of the Audit Log names its author |
| A plan: migrate by router, 27 January to 14 February | Done |

## What still holds

- **A refused request is not written to the audit log.** The decorator raises the 403 without
  an audit entry (`require_permission` in `rbac.py`). What the Audit Log does record, with
  the account that made the change, is what is done to accounts, roles given and taken away,
  permissions granted and revoked, and the creation, change and deletion of roles and
  permissions: see [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md), "The audit log".
- **The 403 text is English only.** The decorator sends `Permission denied: requires
  'students:edit'` as a plain string, and the error handler passes a plain string through
  whatever language the client asks for. `get_error_message` in `backend/error_messages.py`
  translates, and the decorator does not use it.
- **Raw SQL in two places** (see the table), with the comment that it avoids a schema mismatch.
