# RBAC endpoint audit, January 2026

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (every endpoint and what it asks for),
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission),
[RBAC_CODEBASE_REVIEW.md](RBAC_CODEBASE_REVIEW.md) and
[API_PERMISSIONS_REFERENCE.md](../../src/backend/API_PERMISSIONS_REFERENCE.md) (for a developer).

This file held the audit of January 2026 and its completion report: a list of the endpoints
that needed a permission, the permission planned for each, and the statement that all of them
were moved to `@require_permission` (with a count of 79, or 67 in another place, and 370 passing
tests). The list named permissions and addresses the application does not have, so it no longer
applied. The earlier text is in the repository's history.

## What holds

The headline holds, and has grown: the endpoints for students, courses, grades, attendance,
reports, exports, imports and the administration of accounts, roles and permissions ask for a
permission, with the decorator `@require_permission`. The application has 344 endpoints today.
The ones that ask for no permission are of five kinds, listed in "Checks that are not
permissions" in [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md): the role `admin`, the role
`admin` or `teacher`, a sign-in only, nothing at all, and the Control API rules.

## Where the inventory is now

The table "Every endpoint and what it asks for" in [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md)
replaces the inventory of the audit. It is not written by hand. A program reads the
application's own route table and writes the block between the two markers:

```
cd src/backend
python -m backend.scripts.endpoint_requirements --write
```

`src/backend/tests/test_permission_documents.py` fails when the table differs from the route
table, and when one of the three permission documents names a permission the code does not
have. After a change to an endpoint's `@require_permission`, run the command and commit the
file.

The audit named permissions that are not in the application's list, among them
`users:manage_roles`, `users:manage_perms` and `system:admin`. The permissions are the 44 of
`PERMISSION_DEFS` in `src/backend/routers/routers_rbac.py`, described in
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md).

## A note for developers that is still true

The decorator `require_permission` in `src/backend/rbac.py` looks at the endpoint's parameters:

- It hands the endpoint a database session (`db`) only when the endpoint has a parameter of
  that name. An endpoint without one gets no session from it; the decorator opens a session of
  its own for the check and closes it.
- **The endpoint must take `request: Request`.** Without it the decorator cannot read the
  sign-in, and in `strict` and `permissive` mode every call answers 500 "Request not
  available".
- The decorator reads the account from the bearer token itself. The endpoint needs no
  `current_user` parameter for the check.
