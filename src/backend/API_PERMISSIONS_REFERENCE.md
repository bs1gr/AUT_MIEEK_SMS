# API permissions reference

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [PERMISSION_MATRIX.md](../../docs/admin/PERMISSION_MATRIX.md) (every endpoint and
what it asks for), [PERMISSION_REFERENCE.md](../../docs/admin/PERMISSION_REFERENCE.md) (the 44
permissions), [PERMISSION_MANAGEMENT_GUIDE.md](../../docs/admin/PERMISSION_MANAGEMENT_GUIDE.md)
(the requests that manage roles and permissions) and
[RBAC_OPERATIONS_GUIDE.md](../../docs/admin/RBAC_OPERATIONS_GUIDE.md) ("Adding a permission").

This file held a table per router of about 77 endpoints, with the permission each was said to
ask for, test samples and a migration guide. Most of the addresses and permissions in it do not
exist, so it no longer applied. The earlier text is in the repository's history. It is for
developers and for whoever writes a script against the API.

## The list of endpoints is generated

Every endpoint, with what it asks for, is the table at the end of
[PERMISSION_MATRIX.md](../../docs/admin/PERMISSION_MATRIX.md). A program writes it from the
application's route table:

```
cd src/backend
python -m backend.scripts.endpoint_requirements --write
```

`src/backend/tests/test_permission_documents.py` fails when the table and the application
differ. There is no second table here, so there is nothing to keep in step. The 44 permissions
and what each opens are in [PERMISSION_REFERENCE.md](../../docs/admin/PERMISSION_REFERENCE.md).

An endpoint asks for one of five things: a permission; the role `admin` (or `admin` or
`teacher`); only a sign-in; nothing; or the Control API rules. A grant to an account opens what
asks for a permission, and does not open what asks for a role.

## How a request is authenticated

- Sign in with `POST /api/v1/auth/login` and a JSON body `{"email": "...", "password": "..."}`.
  The answer is `{"access_token": "...", "token_type": "bearer"}`.
- Send `Authorization: Bearer <access_token>` with every later request. A token lasts 30 minutes
  unless the server sets `ACCESS_TOKEN_EXPIRE_MINUTES` differently.
- At every request the server reads the account from the database. An account that is
  inactive, or that does not exist, is refused with 401, and a change of its roles or
  grants counts from its next request.
- An account that has to change its password first is refused everywhere except `/auth/me`,
  the password change, the token refresh and the sign-out.

## The three auth modes

`AUTH_MODE` is a setting of the server (environment or `.env`), not something a page changes.

| Mode | What it does |
|---|---|
| `strict` (the default) | Every request must be signed in, and the checks apply |
| `permissive` | A request **without** a sign-in passes the permission checks. A signed-in request is checked as in `strict` |
| `disabled` | No check is made |

**`permissive` lets anybody who can reach the server read and change the data, with no sign-in
at all. Never use it, or `disabled`, on a server that other machines can reach.** The server
writes a warning to its log at every start when the mode is not `strict`. SMS Lite sets
`strict` itself.

## What a refused request answers

Errors come in the same envelope as every other answer:

```
{
  "success": false,
  "data": null,
  "error": {
    "code": "HTTP_403",
    "message": "Permission denied: requires 'students:edit'",
    "details": null,
    "path": "/api/v1/students/7"
  },
  "meta": {"request_id": "...", "timestamp": "...", "version": "..."}
}
```

| Case | Status and text |
|---|---|
| No bearer token, in `strict` mode | 401 "Authentication required" |
| A token that is not valid, or an account that is inactive | 401 "Could not validate credentials" |
| A permission the account does not hold | 403 "Permission denied: requires 'students:edit'". With several keys asked for in the alternative: "requires one of '...', '...'" |
| A role check the account fails | 403 "Access denied. Required role: admin. Your role: teacher" |
| Another account's permissions, without `users:view` | 403 "Permission denied" |
| An account that has to change its password | 403 "Password change required before using the application" |

The text of the permission check is English, whatever language the client asks for: the
decorator sends a plain string, and the error handler passes a plain string through. A request
refused for lack of a permission is not written to the audit log.

## The lesson log

`GET /api/v1/lesson-logs/`, `PUT /api/v1/lesson-logs/` and
`GET /api/v1/lesson-logs/export/{file_format}` (`pdf` or `excel`) all ask for `attendance:edit`.
Reading needs it too, because an entry holds the teacher's private notes: `attendance:view` is
not enough.

- One row per course, date and teaching period (`period_number`, from 1; the default is 1).
- `PUT` creates or updates the row and is safe to repeat, which is how the Attendance page
  saves as it goes. A text field left out of the body keeps its stored value. An empty string,
  or `null`, clears it. The fields are `material_covered` and `teacher_notes`.
- The account that last changed the text is recorded, and shown as `updated_by_name`.
- The list takes `course_id`, `date`, `start_date`, `end_date` and `period_number`, newest date
  first.
- The export needs `course_id`; `start_date` and `end_date` narrow it, `lang` is `en` or `el`.
  The teacher's notes are printed only with `include_notes=true`.

## Protecting a new endpoint

```python
@router.post("/")
@limiter.limit(RATE_LIMIT_WRITE)  # from backend.rate_limiting, as the other routers do
@require_permission("things:create")  # from backend.rbac
async def create_thing(request: Request, payload: ThingIn, db: Session = Depends(get_db)):
    ...
```

- The key is `area:action`, in lower case. A list of keys, `require_permission(["a:view",
  "b:view"])`, lets any one of them through. `require_any_permission` and
  `require_all_permissions` in the same module take their keys as arguments.
- **The endpoint must take `request: Request`.** Without it, in `strict` and `permissive` mode,
  the decorator answers 500 "Request not available".
- The decorator hands `db` to the endpoint only if the endpoint has a parameter of that name.
  It reads the account from the token itself; no `current_user` parameter is needed.
- The permission must be in the list. Add the key to `PERMISSION_DEFS` in
  `src/backend/routers/routers_rbac.py` (and to `TEACHER_PERMISSIONS` if teachers are to hold
  it). Until it is there these tests fail: `test_permission_documents.py` ("the list is closed")
  and `test_two_roles_model.py`. The remaining steps (the frontend name, the reference, the
  table, and how an installation that already runs gets the permission) are in
  [RBAC_OPERATIONS_GUIDE.md](../../docs/admin/RBAC_OPERATIONS_GUIDE.md), "Adding a permission".
- `allow_self_access=True` is a leftover for student accounts, which no account can be any
  more: it opens nothing today.
- `backend/security/permissions.py` has a `require_permission` and an
  `optional_require_permission` that are dependencies, not decorators. They answer "Missing
  permission: ..."; `optional_require_permission` is the one the `/adminops` and search
  endpoints use. The other routers that ask for a permission use the decorator of
  `backend/rbac.py`.

## Role checks

An endpoint that only the administrator may use, whatever permissions a grant gives, uses
`Depends(optional_require_role("admin"))` from `backend/routers/routers_auth.py`. It reads
the word in the account's Role column (`admin`, `teacher` or `none`), so a grant does not open
it: a teacher who holds every permission in the list still cannot open the semester archive.
With `AUTH_MODE` set to `disabled` it hands the endpoint a placeholder administrator, and
answers 401 on the paths that contain `/admin`.
