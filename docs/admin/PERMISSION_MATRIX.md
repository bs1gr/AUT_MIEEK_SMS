# Permission matrix: who can do what

**Checked against the application:** 17 November 2026, `main` after v1.18.73. The table of
endpoints at the end is read from the application's own route table; the cells of the first table were tried
against a running copy as an administrator, a teacher, a viewer, a guest, a student account and
without a sign-in.

**Related:** [PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission and what it
opens) and [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the administrator's steps).

This file replaces a design document of January 2026 that listed 25 planned permissions and
what three planned roles would get. The application was built differently in several places
(a teacher adds and deletes students and courses, for one), so that text is gone.

---

## The kinds of account

| Kind | How an account gets it | What it holds |
|---|---|---|
| **Administrator** (`admin`) | Role "Administrator" in **User Accounts**, or the role `admin` under **Assign Role to User** | Every permission (the wildcard `*:*`), and the things only the administrator role may do |
| **Teacher** (`teacher`) | Role "Teacher" in **User Accounts**; every account that registers itself | 25 permissions: all of the school's records, reports, exports, messages |
| **Viewer** (`viewer`) and **Guest** (`guest`) | Only under **Assign Role to User**; the two hold the same | 9 permissions: read the records, export them |
| **Student** (`student`) | Role "Student" in **User Accounts** | Nothing that opens anything: see below |

Both panels are under **System > Control Panel > Maintenance**.

A student account is not a role in the permission tables. It can sign in, read its own
notifications and change its password; every page of records answers "forbidden". The code has
a rule that lets a student read the record that belongs to its own account, but no page and no
request ever ties a student record to an account, so the rule never applies.

## What each kind can do

✅ the server allows it, ❌ the server refuses it (HTTP 403; 401 without a sign-in).

| Task | Administrator | Teacher | Viewer, Guest | Student account |
|---|---|---|---|---|
| See students, courses, enrolments, grades, attendance, highlights | ✅ | ✅ | ✅ | ❌ |
| Search page | ✅ | ✅ | ✅ | ❌ |
| Add, change and delete students and courses; enrol | ✅ | ✅ | ❌ | ❌ |
| Record and delete grades and attendance, daily performance, highlights | ✅ | ✅ | ❌ | ❌ |
| Lesson log: read, write, export | ✅ | ✅ | ❌ | ❌ |
| Own private notes about a student | ✅ | ✅ | ✅ | ❌ |
| Dashboard figures, Analytics page, student performance reports | ✅ | ✅ | ❌ | ❌ |
| Custom reports: list, create, change, delete | ✅ | ✅ | ✅ | ❌ |
| Custom reports: generate and download | ✅ | ✅ | ❌ | ❌ |
| Report templates: create, change, delete, import | ✅ | ❌ | ❌ | ❌ |
| Export files (Utils > Export: CSV, Excel, PDF, everything as a ZIP) | ✅ | ✅ | ✅ | ❌ |
| Import files (Utils > Imports; Control Panel > Import/Export) | ✅ | ❌ | ❌ | ❌ |
| Session export and import (Utils > Export) | ✅ | ❌ | ❌ | ❌ |
| Send a message to all users or to a role | ✅ | ✅ | ❌ | ❌ |
| Feedback inbox (Utils > Notifications) | ✅ | ✅ | ❌ | ❌ |
| Own notifications, saved searches, own dashboards, own password | ✅ | ✅ | ✅ | ✅ |
| Accounts: list, create, change, delete, reset a password | ✅ | ❌ | ❌ | ❌ |
| Roles and permissions: see and change | ✅ | ❌ | ❌ | ❌ |
| Audit log (no page shows it; the API answers) | ✅ | ❌ | ❌ | ❌ |
| Backup, restore and clear the database through `/adminops` | ✅ | ❌ | ❌ | ❌ |
| Semester archive, e-mail settings, rate limits | ✅ | ❌ | ❌ | ❌ |
| A student's data export and erasure (GDPR), the health field | ✅ | ❌ | ❌ | ❌ |

Three rows deserve a second look:

- **A viewer exports everything.** "Read-only" means the account cannot change a record. It
  can download every list and the ZIP of all of them.
- **A viewer has no Dashboard figures.** The Dashboard and the Analytics page ask for
  `reports:generate`, which the viewer and guest roles do not hold, so those pages open with
  empty panels.
- **The export jobs of Control Panel > Import/Export** are a separate, partly broken feature
  (plan todo 62) and are not in the table.

## What the pages show

The pages follow the role in a few places only. Everything else is decided by the server, at
the moment of the request.

- Every signed-in account gets the same nine entries in the navigation: Dashboard, Search,
  Attendance, Grades, Students, Courses, Calendar, Utils, System.
- Shown to the administrator role only: the pages under `#/admin/` (anyone else lands on the
  Dashboard), the **Rate Limits** tab of the Control Panel, the panels **RBAC Configuration**,
  **Email Configuration** and **Import/Export** and the semester archive under Maintenance,
  the privacy panel in a student's edit window, and the target "Specific users" of a message.
- Shown to administrators and teachers only: the form that sends a message, the feedback
  inbox, "Add Highlight" on a student's profile.
- A viewer, a guest and a student account therefore see buttons such as "Add Student". The
  server refuses the request and the page reports a failure.

## Addresses outside the table

These answer without a sign-in: `/health`, `/health/live`, `/health/ready`, `/metrics` (unless
`ENABLE_METRICS=0`), `/api`, the two addresses a page reports its own errors to
(`/api/logs/frontend-error`, `/api/logs/frontend-warning`), and the page with its files.

## The Control API

The System page talks to `/control/api` (and to eight addresses under `/api/v1/admin` listed
below with "Control API rules"). Its rules are not permissions:

1. It exists only where it is switched on. It is on for a server started from source and for
   SMS Lite; it is off in Docker and with `SMS_ENV=production`, unless `ENABLE_CONTROL_API=1`
   is set. Switched off, every address answers 404.
2. A signed-in administrator passes: the account must be active, hold the role `admin`, and
   not be waiting for a first password change.
3. Otherwise, where `ADMIN_SHUTDOWN_TOKEN` is set, the request must carry it in the header
   `X-ADMIN-TOKEN`.
4. Otherwise a request from the same machine passes, and one from another machine is refused.

Rule 4 means that on a PC that runs the application itself, any program on that PC, and any
account signed in at that PC, reaches the Control API. That is how a teacher sees the System
page working in SMS Lite.

One address is outside the rules: `GET /control/api/restart` only says whether a restart is
possible here, and answers anyone.

## Every endpoint and what it asks for

The table below is written by a program, not by hand:

```powershell
cd src/backend
python -m backend.scripts.endpoint_requirements --write
```

`src/backend/tests/test_permission_documents.py` fails when the table and the application
differ, and when one of the three permission documents names a permission that does not exist.

How to read the right-hand column:

- A permission in code font: the account must hold it. "or" means any one is enough, "and"
  means all of them.
- "(or the student's own record)": the rule for student accounts described above.
- "role `admin`": the account's role is checked, not a permission. A grant cannot open it.
- "signed in": any active account.
- "nothing": answers without a sign-in.
- "Control API rules": the four rules above.

All of this is for `AUTH_MODE=strict`, the default. See
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md#the-three-auth-modes) for the other two.

<!-- endpoint-requirements:start -->

344 endpoints.

#### `/api/v1/admin`

| Request | Asks for |
|---|---|
| `GET /api/v1/admin/debug-processes` | Control API rules |
| `GET /api/v1/admin/health` | Control API rules |
| `GET /api/v1/admin/list-encrypted-backups` | Control API rules |
| `GET /api/v1/admin/performance` | Control API rules |
| `POST /api/v1/admin/rbac/assign-role` | `permissions:manage` |
| `POST /api/v1/admin/rbac/bulk-assign-role` | `permissions:manage` |
| `POST /api/v1/admin/rbac/bulk-grant-permission` | `permissions:manage` |
| `GET /api/v1/admin/rbac/change-history` | `audit:view` |
| `POST /api/v1/admin/rbac/ensure-defaults` | `permissions:manage` |
| `GET /api/v1/admin/rbac/permissions` | `permissions:view` |
| `POST /api/v1/admin/rbac/permissions` | `permissions:manage` |
| `DELETE /api/v1/admin/rbac/permissions/{permission_id}` | `permissions:manage` |
| `PUT /api/v1/admin/rbac/permissions/{permission_id}` | `permissions:manage` |
| `POST /api/v1/admin/rbac/revoke-permission` | `permissions:manage` |
| `POST /api/v1/admin/rbac/revoke-role` | `permissions:manage` |
| `GET /api/v1/admin/rbac/roles` | `permissions:view` |
| `POST /api/v1/admin/rbac/roles` | `permissions:manage` |
| `DELETE /api/v1/admin/rbac/roles/{role_id}` | `permissions:manage` |
| `PUT /api/v1/admin/rbac/roles/{role_id}` | `permissions:manage` |
| `GET /api/v1/admin/rbac/summary` | `permissions:view` |
| `POST /api/v1/admin/reset-database` | Control API rules |
| `POST /api/v1/admin/restore-encrypted-backup` | Control API rules |
| `POST /api/v1/admin/sample-data` | Control API rules |
| `POST /api/v1/admin/shutdown` | Control API rules |
| `GET /api/v1/admin/users` | `users:view` |
| `POST /api/v1/admin/users` | `users:manage` |
| `DELETE /api/v1/admin/users/{user_id}` | `users:manage` |
| `PATCH /api/v1/admin/users/{user_id}` | `users:manage` |
| `POST /api/v1/admin/users/{user_id}/reset-password` | `users:manage` |
| `POST /api/v1/admin/users/{user_id}/unlock` | `users:manage` |

#### `/api/v1/adminops`

| Request | Asks for |
|---|---|
| `POST /api/v1/adminops/backup` | `adminops:backup` |
| `POST /api/v1/adminops/clear` | `adminops:clear` |
| `POST /api/v1/adminops/restore` | `adminops:restore` |

#### `/api/v1/analytics`

| Request | Asks for |
|---|---|
| `GET /api/v1/analytics/attendance-gaps` | `reports:generate` |
| `DELETE /api/v1/analytics/cache/clear` | `admin:manage` |
| `DELETE /api/v1/analytics/cache/course/{course_id}` | `admin:manage` |
| `DELETE /api/v1/analytics/cache/student/{student_id}` | `admin:manage` |
| `GET /api/v1/analytics/course/{course_id}/grade-distribution` | `reports:generate` |
| `GET /api/v1/analytics/course/{course_id}/students-comparison` | `reports:generate` |
| `GET /api/v1/analytics/dashboard` | `reports:generate` |
| `POST /api/v1/analytics/export/excel` | `analytics:export` or `reports:export` or `reports:generate` |
| `POST /api/v1/analytics/export/pdf` | `analytics:export` or `reports:export` or `reports:generate` |
| `GET /api/v1/analytics/lookups` | `reports:generate` |
| `GET /api/v1/analytics/overview` | `reports:generate` |
| `GET /api/v1/analytics/predictive/student` | `reports:view` |
| `POST /api/v1/analytics/reports/custom` | `reports:create` |
| `GET /api/v1/analytics/reports/custom/{report_id}` | `reports:view` |
| `GET /api/v1/analytics/reports/templates` | nothing |
| `GET /api/v1/analytics/student/{student_id}/all-courses-summary` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/attendance` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/course/{course_id}/final-grade` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/overview` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/performance` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/summary` | `reports:generate` |
| `GET /api/v1/analytics/student/{student_id}/trends` | `reports:generate` |

#### `/api/v1/attendance`

| Request | Asks for |
|---|---|
| `GET /api/v1/attendance/` | `attendance:view` |
| `POST /api/v1/attendance/` | `attendance:edit` |
| `GET /api/v1/attendance/absence-status/course/{course_id}` | `courses:view` |
| `GET /api/v1/attendance/absence-status/student/{student_id}` | `students:view` (or the student's own record) |
| `POST /api/v1/attendance/bulk/create` | `attendance:edit` |
| `GET /api/v1/attendance/course/{course_id}` | `courses:view` |
| `GET /api/v1/attendance/date/{attendance_date}/course/{course_id}` | `attendance:view` |
| `POST /api/v1/attendance/sheet` | `attendance:edit` and `students:edit` |
| `GET /api/v1/attendance/stats/student/{student_id}/course/{course_id}` | `students:view` |
| `GET /api/v1/attendance/student/{student_id}` | `students:view` (or the student's own record) |
| `DELETE /api/v1/attendance/{attendance_id}` | `attendance:delete` |
| `GET /api/v1/attendance/{attendance_id}` | `attendance:view` |
| `PUT /api/v1/attendance/{attendance_id}` | `attendance:edit` |

#### `/api/v1/audit`

| Request | Asks for |
|---|---|
| `GET /api/v1/audit/logs` | `audit:view` |
| `GET /api/v1/audit/logs/user/{user_id}` | `audit:view` |
| `GET /api/v1/audit/logs/{log_id}` | `audit:view` |

#### `/api/v1/auth`

| Request | Asks for |
|---|---|
| `POST /api/v1/auth/change-password` | signed in |
| `POST /api/v1/auth/login` | nothing |
| `POST /api/v1/auth/logout` | nothing |
| `GET /api/v1/auth/me` | signed in |
| `POST /api/v1/auth/refresh` | nothing |
| `POST /api/v1/auth/register` | nothing |
| `GET /api/v1/auth/registration-mode` | nothing |

#### `/api/v1/courses`

| Request | Asks for |
|---|---|
| `GET /api/v1/courses/` | `courses:view` |
| `POST /api/v1/courses/` | `courses:create` |
| `DELETE /api/v1/courses/{course_id}` | `courses:delete` |
| `GET /api/v1/courses/{course_id}` | `courses:view` |
| `PUT /api/v1/courses/{course_id}` | `courses:edit` |
| `POST /api/v1/courses/{course_id}/end` | `courses:edit` |
| `GET /api/v1/courses/{course_id}/evaluation-rules` | `courses:view` |
| `PUT /api/v1/courses/{course_id}/evaluation-rules` | `courses:edit` |
| `POST /api/v1/courses/{course_id}/reactivate` | `courses:edit` |

#### `/api/v1/custom-reports`

| Request | Asks for |
|---|---|
| `GET /api/v1/custom-reports` | `reports:view` |
| `POST /api/v1/custom-reports` | `reports:view` |
| `POST /api/v1/custom-reports/bulk-generate` | `reports:generate` |
| `GET /api/v1/custom-reports/statistics` | `reports:view` |
| `GET /api/v1/custom-reports/templates` | `reports:view` |
| `POST /api/v1/custom-reports/templates` | role `admin` |
| `POST /api/v1/custom-reports/templates/import` | role `admin` |
| `DELETE /api/v1/custom-reports/templates/{template_id}` | role `admin` |
| `GET /api/v1/custom-reports/templates/{template_id}` | `reports:view` |
| `PUT /api/v1/custom-reports/templates/{template_id}` | role `admin` |
| `DELETE /api/v1/custom-reports/{report_id}` | `reports:view` |
| `GET /api/v1/custom-reports/{report_id}` | `reports:view` |
| `PUT /api/v1/custom-reports/{report_id}` | `reports:view` |
| `POST /api/v1/custom-reports/{report_id}/generate` | `reports:generate` |
| `GET /api/v1/custom-reports/{report_id}/generated` | `reports:view` |
| `DELETE /api/v1/custom-reports/{report_id}/generated/{generated_report_id}` | `reports:view` |
| `PATCH /api/v1/custom-reports/{report_id}/generated/{generated_report_id}` | `reports:view` |
| `GET /api/v1/custom-reports/{report_id}/generated/{generated_report_id}/download` | `reports:generate` |

#### `/api/v1/daily-performance`

| Request | Asks for |
|---|---|
| `POST /api/v1/daily-performance/` | `students:edit` |
| `GET /api/v1/daily-performance/date/{date_str}/course/{course_id}` | `courses:view` |
| `GET /api/v1/daily-performance/student/{student_id}` | `students:view` (or the student's own record) |
| `GET /api/v1/daily-performance/student/{student_id}/course/{course_id}` | `students:view` (or the student's own record) |
| `DELETE /api/v1/daily-performance/{id}` | `students:edit` |
| `GET /api/v1/daily-performance/{id}` | `students:view` |
| `PUT /api/v1/daily-performance/{id}` | `students:edit` |

#### `/api/v1/dashboards`

| Request | Asks for |
|---|---|
| `GET /api/v1/dashboards` | signed in |
| `POST /api/v1/dashboards` | signed in |
| `DELETE /api/v1/dashboards/{dashboard_id}` | signed in |
| `GET /api/v1/dashboards/{dashboard_id}` | signed in |
| `PUT /api/v1/dashboards/{dashboard_id}` | signed in |
| `POST /api/v1/dashboards/{dashboard_id}/set-default` | signed in |

#### `/api/v1/data-subject`

| Request | Asks for |
|---|---|
| `DELETE /api/v1/data-subject/students/{student_id}` | `students:delete` and role `admin` |
| `GET /api/v1/data-subject/students/{student_id}/export` | `students:view` and role `admin` |

#### `/api/v1/diagnostics`

| Request | Asks for |
|---|---|
| `GET /api/v1/diagnostics/health/queries` | `diagnostics:view` |
| `GET /api/v1/diagnostics/queries/patterns` | `diagnostics:view` |
| `POST /api/v1/diagnostics/queries/reset` | `diagnostics:manage` |
| `GET /api/v1/diagnostics/queries/slow` | `diagnostics:view` |
| `GET /api/v1/diagnostics/queries/summary` | `diagnostics:view` |

#### `/api/v1/enrollments`

| Request | Asks for |
|---|---|
| `GET /api/v1/enrollments/` | `courses:view` |
| `GET /api/v1/enrollments/course/{course_id}` | `courses:view` |
| `POST /api/v1/enrollments/course/{course_id}` | `courses:edit` |
| `DELETE /api/v1/enrollments/course/{course_id}/student/{student_id}` | `courses:edit` |
| `PATCH /api/v1/enrollments/course/{course_id}/student/{student_id}/status` | `courses:edit` |
| `GET /api/v1/enrollments/course/{course_id}/students` | `courses:view` |
| `GET /api/v1/enrollments/student/{student_id}` | `students:view` (or the student's own record) |
| `GET /api/v1/enrollments/student/{student_id}/performance-history` | `students:view` (or the student's own record) |

#### `/api/v1/export`

| Request | Asks for |
|---|---|
| `GET /api/v1/export/all/zip` | `exports:generate` |
| `GET /api/v1/export/analytics/course/{course_id}/pdf` | `exports:generate` |
| `GET /api/v1/export/attendance/analytics/csv` | `exports:generate` |
| `GET /api/v1/export/attendance/analytics/excel` | `exports:generate` |
| `GET /api/v1/export/attendance/analytics/pdf` | `exports:generate` |
| `GET /api/v1/export/attendance/csv` | `exports:generate` |
| `GET /api/v1/export/attendance/excel` | `exports:generate` |
| `GET /api/v1/export/attendance/excel/{student_id}` | `exports:generate` |
| `GET /api/v1/export/attendance/pdf` | `exports:generate` |
| `GET /api/v1/export/courses/csv` | `exports:generate` |
| `GET /api/v1/export/courses/excel` | `exports:generate` |
| `GET /api/v1/export/courses/pdf` | `exports:generate` |
| `GET /api/v1/export/enrollments/csv` | `exports:generate` |
| `GET /api/v1/export/enrollments/excel` | `exports:generate` |
| `GET /api/v1/export/enrollments/excel/{student_id}` | `exports:generate` |
| `GET /api/v1/export/enrollments/pdf` | `exports:generate` |
| `GET /api/v1/export/grades/csv` | `exports:generate` |
| `GET /api/v1/export/grades/excel` | `exports:generate` |
| `GET /api/v1/export/grades/excel/{student_id}` | `exports:generate` |
| `GET /api/v1/export/grades/pdf` | `exports:generate` |
| `GET /api/v1/export/highlights/csv` | `exports:generate` |
| `GET /api/v1/export/highlights/excel` | `exports:generate` |
| `GET /api/v1/export/highlights/excel/{student_id}` | `exports:generate` |
| `GET /api/v1/export/highlights/pdf` | `exports:generate` |
| `GET /api/v1/export/performance/csv` | `exports:generate` |
| `GET /api/v1/export/performance/excel` | `exports:generate` |
| `GET /api/v1/export/performance/excel/{student_id}` | `exports:generate` |
| `GET /api/v1/export/performance/pdf` | `exports:generate` |
| `GET /api/v1/export/student-report/pdf/{student_id}` | `exports:generate` |
| `GET /api/v1/export/students/csv` | `exports:generate` |
| `GET /api/v1/export/students/excel` | `exports:generate` |
| `GET /api/v1/export/students/pdf` | `exports:generate` |

#### `/api/v1/feedback`

| Request | Asks for |
|---|---|
| `POST /api/v1/feedback/` | nothing |
| `GET /api/v1/feedback/entries` | role `admin` or `teacher` |
| `DELETE /api/v1/feedback/entries/{entry_id}` | role `admin` or `teacher` |
| `PATCH /api/v1/feedback/entries/{entry_id}/archive` | role `admin` or `teacher` |
| `PATCH /api/v1/feedback/entries/{entry_id}/unarchive` | role `admin` or `teacher` |
| `POST /api/v1/feedback/github/import` | role `admin` or `teacher` |

#### `/api/v1/grades`

| Request | Asks for |
|---|---|
| `GET /api/v1/grades/` | `grades:view` |
| `POST /api/v1/grades/` | `grades:edit` |
| `GET /api/v1/grades/analysis/student/{student_id}/course/{course_id}` | `students:view` |
| `GET /api/v1/grades/course/{course_id}` | `courses:view` |
| `GET /api/v1/grades/student/{student_id}` | `students:view` (or the student's own record) |
| `DELETE /api/v1/grades/{grade_id}` | `grades:delete` |
| `GET /api/v1/grades/{grade_id}` | `grades:view` |
| `PUT /api/v1/grades/{grade_id}` | `grades:edit` |

#### `/api/v1/help`

| Request | Asks for |
|---|---|
| `GET /api/v1/help/user-guide/{language}` | nothing |

#### `/api/v1/highlights`

| Request | Asks for |
|---|---|
| `GET /api/v1/highlights/` | `students:view` |
| `POST /api/v1/highlights/` | `students:edit` |
| `GET /api/v1/highlights/student/{student_id}` | `students:view` (or the student's own record) |
| `DELETE /api/v1/highlights/{highlight_id}` | `students:delete` |
| `GET /api/v1/highlights/{highlight_id}` | `students:view` |
| `PUT /api/v1/highlights/{highlight_id}` | `students:edit` |

#### `/api/v1/import-export`

| Request | Asks for |
|---|---|
| `GET /api/v1/import-export/exports` | `exports:view` |
| `POST /api/v1/import-export/exports` | `exports:generate` |
| `GET /api/v1/import-export/exports/{export_job_id}` | `exports:view` |
| `GET /api/v1/import-export/exports/{export_job_id}/download` | `exports:download` |
| `GET /api/v1/import-export/history` | `audit:view` |
| `GET /api/v1/import-export/imports` | `imports:view` |
| `POST /api/v1/import-export/imports/courses` | `imports:create` |
| `POST /api/v1/import-export/imports/grades` | `imports:create` |
| `POST /api/v1/import-export/imports/students` | `imports:create` |
| `GET /api/v1/import-export/imports/{import_job_id}` | `imports:view` |
| `POST /api/v1/import-export/imports/{import_job_id}/commit` | `imports:create` |
| `GET /api/v1/import-export/settings/email` | role `admin` |
| `PUT /api/v1/import-export/settings/email` | role `admin` |
| `POST /api/v1/import-export/settings/email/test` | role `admin` |

#### `/api/v1/imports`

| Request | Asks for |
|---|---|
| `POST /api/v1/imports/execute` | `imports:execute` |
| `POST /api/v1/imports/preview` | `imports:preview` |
| `POST /api/v1/imports/students` | `imports:create` |
| `POST /api/v1/imports/upload` | `imports:create` |

#### `/api/v1/jobs`

| Request | Asks for |
|---|---|
| `GET /api/v1/jobs/` | `jobs:view` |
| `POST /api/v1/jobs/` | `jobs:create` |
| `DELETE /api/v1/jobs/{job_id}` | `jobs:delete` |
| `GET /api/v1/jobs/{job_id}` | `jobs:view` |
| `POST /api/v1/jobs/{job_id}/cancel` | `jobs:manage` |

#### `/api/v1/lesson-logs`

| Request | Asks for |
|---|---|
| `GET /api/v1/lesson-logs/` | `attendance:edit` |
| `PUT /api/v1/lesson-logs/` | `attendance:edit` |
| `GET /api/v1/lesson-logs/export/{file_format}` | `attendance:edit` |

#### `/api/v1/metrics`

| Request | Asks for |
|---|---|
| `GET /api/v1/metrics/attendance` | `reports:generate` |
| `GET /api/v1/metrics/courses` | `reports:generate` |
| `GET /api/v1/metrics/dashboard` | `reports:generate` |
| `GET /api/v1/metrics/grades` | `reports:generate` |
| `GET /api/v1/metrics/students` | `reports:generate` |

#### `/api/v1/notifications`

| Request | Asks for |
|---|---|
| `GET /api/v1/notifications/` | signed in |
| `POST /api/v1/notifications/broadcast` | `notifications:manage` |
| `GET /api/v1/notifications/preferences` | signed in |
| `PUT /api/v1/notifications/preferences` | signed in |
| `POST /api/v1/notifications/read-all` | signed in |
| `GET /api/v1/notifications/release-announcement` | signed in |
| `GET /api/v1/notifications/unread-count` | signed in |
| `WEBSOCKET /api/v1/notifications/ws` | signed in (the token travels in the address) |
| `DELETE /api/v1/notifications/{notification_id}` | signed in |
| `PUT /api/v1/notifications/{notification_id}` | signed in |
| `POST /api/v1/notifications/{notification_id}/read` | signed in |

#### `/api/v1/permissions`

| Request | Asks for |
|---|---|
| `GET /api/v1/permissions/` | `permissions:view` |
| `POST /api/v1/permissions/` | `permissions:manage` |
| `GET /api/v1/permissions/by-resource` | `permissions:view` |
| `POST /api/v1/permissions/roles/grant` | `permissions:manage` |
| `POST /api/v1/permissions/roles/revoke` | `permissions:manage` |
| `GET /api/v1/permissions/stats` | `permissions:view` |
| `POST /api/v1/permissions/users/grant` | `permissions:manage` |
| `POST /api/v1/permissions/users/revoke` | `permissions:manage` |
| `GET /api/v1/permissions/users/{user_id}` | signed in; another account's permissions need `users:view` |
| `DELETE /api/v1/permissions/{permission_id}` | `permissions:manage` |
| `GET /api/v1/permissions/{permission_id}` | `permissions:view` |
| `PATCH /api/v1/permissions/{permission_id}` | `permissions:manage` |

#### `/api/v1/privacy`

| Request | Asks for |
|---|---|
| `GET /api/v1/privacy/info` | nothing |

#### `/api/v1/reports`

| Request | Asks for |
|---|---|
| `POST /api/v1/reports/bulk/student-performance` | `reports:generate` |
| `DELETE /api/v1/reports/cache` | `reports:generate` |
| `DELETE /api/v1/reports/cache/{student_id}` | `reports:generate` |
| `GET /api/v1/reports/formats` | `reports:generate` |
| `GET /api/v1/reports/periods` | `reports:generate` |
| `POST /api/v1/reports/student-performance` | `reports:generate` |
| `POST /api/v1/reports/student-performance/download` | `reports:generate` |

#### `/api/v1/search`

| Request | Asks for |
|---|---|
| `POST /api/v1/search/advanced` | signed in, and `students:view`, `courses:view` or `grades:view` by the kind of record searched |
| `GET /api/v1/search/courses` | `courses:view` |
| `GET /api/v1/search/courses/facets` | `courses:view` |
| `GET /api/v1/search/grades` | `grades:view` |
| `GET /api/v1/search/saved` | signed in |
| `POST /api/v1/search/saved` | signed in |
| `DELETE /api/v1/search/saved/{search_id}` | signed in |
| `GET /api/v1/search/saved/{search_id}` | signed in |
| `PUT /api/v1/search/saved/{search_id}` | signed in |
| `POST /api/v1/search/saved/{search_id}/favorite` | signed in |
| `GET /api/v1/search/statistics` | signed in |
| `GET /api/v1/search/students` | `students:view` |
| `POST /api/v1/search/students/advanced` | `students:view` |
| `GET /api/v1/search/students/facets` | `students:view` |
| `POST /api/v1/search/students/full-text` | `students:view` |
| `GET /api/v1/search/suggestions` | signed in |

#### `/api/v1/security`

| Request | Asks for |
|---|---|
| `GET /api/v1/security/csrf` | nothing |

#### `/api/v1/semester-archive`

| Request | Asks for |
|---|---|
| `POST /api/v1/semester-archive/execute` | role `admin` |
| `GET /api/v1/semester-archive/exports` | role `admin` |
| `GET /api/v1/semester-archive/exports/{export_id}/download` | role `admin` |
| `POST /api/v1/semester-archive/preview` | role `admin` |
| `GET /api/v1/semester-archive/semesters` | role `admin` |

#### `/api/v1/sessions`

| Request | Asks for |
|---|---|
| `GET /api/v1/sessions/backups` | `sessions:manage` |
| `GET /api/v1/sessions/export` | `sessions:manage` |
| `POST /api/v1/sessions/export` | `sessions:manage` |
| `POST /api/v1/sessions/import` | `sessions:manage` |
| `POST /api/v1/sessions/rollback` | `sessions:manage` |
| `GET /api/v1/sessions/semesters` | `sessions:manage` |

#### `/api/v1/student-notes`

| Request | Asks for |
|---|---|
| `GET /api/v1/student-notes/` | `students:view` |
| `PUT /api/v1/student-notes/{student_id}` | `students:view` |

#### `/api/v1/students`

| Request | Asks for |
|---|---|
| `GET /api/v1/students/` | `students:view` |
| `POST /api/v1/students/` | `students:create` |
| `POST /api/v1/students/bulk/autofill-academic-year` | `students:edit` |
| `POST /api/v1/students/bulk/create` | `students:create` |
| `DELETE /api/v1/students/{student_id}` | `students:delete` |
| `GET /api/v1/students/{student_id}` | `students:view` (or the student's own record) |
| `PUT /api/v1/students/{student_id}` | `students:edit` |
| `POST /api/v1/students/{student_id}/activate` | `students:edit` |
| `POST /api/v1/students/{student_id}/deactivate` | `students:edit` |
| `GET /api/v1/students/{student_id}/health` | `students:view` and role `admin` |
| `PUT /api/v1/students/{student_id}/health` | `students:edit` and role `admin` |

#### Control API (`/control/api`)

| Request | Asks for |
|---|---|
| `GET /control/api/database/backups` | Control API rules |
| `DELETE /control/api/database/backups/{filename}` | Control API rules |
| `GET /control/api/database/backups/{filename}/download` | Control API rules |
| `POST /control/api/database/backups/{filename}/restore` | Control API rules |
| `POST /control/api/database/import-credentials` | Control API rules |
| `GET /control/api/database/instances` | Control API rules |
| `POST /control/api/database/instances/{name}/backup` | Control API rules |
| `GET /control/api/database/instances/{name}/stats` | Control API rules |
| `GET /control/api/database/instances/{name}/status` | Control API rules |
| `POST /control/api/database/test-connection` | Control API rules |
| `GET /control/api/diagnostics` | Control API rules |
| `GET /control/api/environment` | Control API rules |
| `GET /control/api/logs/backend` | Control API rules |
| `GET /control/api/maintenance/auth-policy-guide` | Control API rules |
| `GET /control/api/maintenance/auth-settings` | Control API rules |
| `POST /control/api/maintenance/auth-settings` | Control API rules |
| `POST /control/api/maintenance/updates/auto-install` | Control API rules |
| `GET /control/api/maintenance/updates/auto-install/{job_id}/status` | Control API rules |
| `GET /control/api/maintenance/updates/check` | Control API rules |
| `GET /control/api/monitoring/environment` | Control API rules |
| `GET /control/api/monitoring/prometheus/query` | Control API rules |
| `GET /control/api/monitoring/prometheus/range` | Control API rules |
| `POST /control/api/monitoring/start` | Control API rules |
| `GET /control/api/monitoring/status` | Control API rules |
| `POST /control/api/monitoring/stop` | Control API rules |
| `POST /control/api/monitoring/trigger` | Control API rules |
| `POST /control/api/operations/database-backup` | Control API rules |
| `GET /control/api/operations/database-backups` | Control API rules |
| `GET /control/api/operations/database-backups/archive.zip` | Control API rules |
| `POST /control/api/operations/database-backups/archive/save-to-path` | Control API rules |
| `POST /control/api/operations/database-backups/archive/selected.zip` | Control API rules |
| `POST /control/api/operations/database-backups/archive/selected/save-to-path` | Control API rules |
| `POST /control/api/operations/database-backups/delete-selected` | Control API rules |
| `GET /control/api/operations/database-backups/{backup_filename:path}/download` | Control API rules |
| `POST /control/api/operations/database-backups/{backup_filename:path}/save-to-path` | Control API rules |
| `POST /control/api/operations/database-restore` | Control API rules |
| `POST /control/api/operations/database-upload` | Control API rules |
| `POST /control/api/operations/docker-build` | Control API rules |
| `POST /control/api/operations/docker-update-volume` | Control API rules |
| `POST /control/api/operations/exit-all` | Control API rules |
| `POST /control/api/operations/install-backend-deps` | Control API rules |
| `POST /control/api/operations/install-frontend-deps` | Control API rules |
| `GET /control/api/ports` | Control API rules |
| `GET /control/api/rate-limits` | role `admin` |
| `POST /control/api/rate-limits/bulk-update` | role `admin` |
| `POST /control/api/rate-limits/reset` | role `admin` |
| `POST /control/api/rate-limits/update` | role `admin` |
| `GET /control/api/restart` | nothing |
| `POST /control/api/restart` | Control API rules |
| `POST /control/api/start` | Control API rules |
| `GET /control/api/status` | Control API rules |
| `POST /control/api/stop` | Control API rules |
| `POST /control/api/stop-all` | Control API rules |
| `POST /control/api/stop-backend` | Control API rules |
| `GET /control/api/troubleshoot` | Control API rules |

<!-- endpoint-requirements:end -->
