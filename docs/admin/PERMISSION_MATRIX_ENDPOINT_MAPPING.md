# Permission matrix: the endpoint mapping of January 2026

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

**Related:** [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what, and every endpoint
with what it asks for), [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission)
and [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md).

This file held a design of 11 January 2026: 79 endpoints against three roles (Administrator,
Teacher, Viewer) and 25 permissions, before most of it was built. The application was built
differently, so the table no longer applied. The earlier text is in the repository's history.

## What came out differently

| The design | The application |
|---|---|
| Three roles: Administrator, Teacher, Viewer | Two roles, Administrator and Teacher, and "No role" for an account that holds neither. Viewer is gone |
| A teacher could not add a student or a course, and could not delete a student, a grade or an attendance record | A teacher holds the create, edit and delete permissions of students and courses and the delete permissions of grades and attendance, and imports students and courses from a file. Only the administrator holds the administration |
| 25 permissions, among them `enrollments:view`, `enrollments:manage`, `analytics:view`, `system:import` and `system:export` | 44 permissions, none of those five. Enrolments are covered by `courses:view`, `courses:edit` and `students:view`; the figures of the Dashboard and the Analytics page by `reports:generate`; imports and exports by `imports:*` and `exports:*` |
| 79 endpoints, with addresses such as `/students/{id}/photo`, `/students/batch/import` and `/rbac/roles` | 344 endpoints. The roles and permissions are under `/api/v1/admin/rbac` and `/api/v1/permissions`; imports under `/api/v1/imports` and `/api/v1/import-export` |
| Registering an account asks for `users:manage` | Registering asks for nothing, where the server offers it; under the default setting the new account waits for an administrator's approval (`SELF_REGISTRATION_MODE`, see [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md)) |

## Where to look now

[PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) has the table of what each kind of account can do
and, at the end, every endpoint with what it asks for. A program writes that table from the
application's own route table, and a test fails when it falls behind: see
[RBAC_ENDPOINT_AUDIT.md](RBAC_ENDPOINT_AUDIT.md).
