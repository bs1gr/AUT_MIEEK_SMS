# Permission reference

**Checked against the application:** 17 November 2026, `main` after v1.18.73. Every
permission named here is one the code has: `src/backend/tests/test_permission_documents.py`
fails when this file names another, or leaves one out.

**Related:** [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what, and every endpoint
with what it asks for) and [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the administrator's
steps).

This file replaces a reference that described 26 permissions, a Student role and a Viewer role
as they were planned. Three of those permissions were never in the code under that name
("imports:manage", "metrics:view" and "notifications:broadcast": the code has
`notifications:manage` for sending a message), and what it said the roles hold was not what
the application gives them.

---

## How a request is decided

A request carries the account's sign-in. The server then asks, for most endpoints, "does this
account hold permission X?". The answer is yes when any of these holds:

1. **A role of the account holds X.** An account has rows in `user_roles`; each role has rows
   in `role_permissions`.
2. **X was granted to the account itself** (a row in `user_permissions`, optionally with an
   end date after which it no longer counts).
3. **A wider permission covers X.** `*:*` covers everything. A permission written as an area
   followed by `:*` would cover that area; none is in use.
4. **The account has no role row that matches its role, and no grant of its own.** Then the
   built-in list for its role is used (see "Accounts without role rows" below).

A permission that is switched off (`is_active` false) counts for nobody.

The answer is worked out from the database on every request. A change takes effect with the
next request, without a new sign-in. (`PERMISSION_CACHE_TTL_SECONDS` can make the server keep
an answer for some seconds; it is off unless set.)

Some endpoints do not ask for a permission at all. They check the account's **role** (the word
in the account's Role column), or only that somebody is signed in, or nothing. Those are listed
under "Checks that are not permissions".

## The roles and what they hold

A new database gets four roles. This is what the application gives them at its first start.

| Role | Permissions |
|---|---|
| `admin` | `*:*`, and each of the teacher's 25 once more by name |
| `teacher` | `students:view`, `students:create`, `students:edit`, `students:delete`, `courses:view`, `courses:create`, `courses:edit`, `courses:delete`, `grades:view`, `grades:edit`, `grades:delete`, `attendance:view`, `attendance:edit`, `attendance:delete`, `enrollments:view`, `enrollments:manage`, `reports:view`, `reports:generate`, `reports:export`, `analytics:view`, `system:import`, `system:export`, `notifications:manage`, `exports:generate`, `exports:download` |
| `viewer` | `students:view`, `courses:view`, `grades:view`, `attendance:view`, `enrollments:view`, `reports:view`, `analytics:view`, `exports:generate`, `exports:download` |
| `guest` | the same nine as `viewer` |

There is no `student` role. An account whose Role is "Student" has no role row. Nor is
`none` a role: it is what the Role column holds ("No role") after the last role of an account
was revoked, and nothing is built in for it.

**Giving a role brings the lower ones with it.** Assigning `admin` under **Assign Role to
User** also gives `teacher`, `viewer` and `guest`; assigning `teacher` also gives `viewer` and
`guest`. Creating an account in **User Accounts** gives the one role only. Both end in the
same permissions.

## The permissions in the list

These 39 are in the database of a new installation and are the ones the **Permissions
Catalog** shows. The first is `*:*`, which covers every permission and is held by `admin`
alone; the other 38 follow.

### Records

| Permission | Opens | Held by |
|---|---|---|
| `students:view` | The list of students and a student's record; the search for students; a student's attendance, grades, enrolments, highlights and daily performance; the account's own private notes about a student, to read and to write | admin, teacher, viewer, guest |
| `students:create` | Add a student, add several at once | admin, teacher |
| `students:edit` | Change a student, make one active or inactive, fill in the academic year for many; add and change highlights; add, change and delete daily performance; together with `attendance:edit`, save an attendance sheet | admin, teacher |
| `students:delete` | Delete a student, delete a highlight | admin, teacher |
| `courses:view` | The list of courses and a course; its evaluation rules; who is enrolled; the attendance, grades and daily performance of a course; the search for courses | admin, teacher, viewer, guest |
| `courses:create` | Add a course | admin, teacher |
| `courses:edit` | Change a course, end it, reactivate it, change its evaluation rules; enrol students, remove an enrolment, change its status | admin, teacher |
| `courses:delete` | Delete a course | admin, teacher |
| `grades:view` | The list of grades and one grade; the search for grades | admin, teacher, viewer, guest |
| `grades:edit` | Add and change a grade | admin, teacher |
| `grades:delete` | Delete a grade | admin, teacher |
| `attendance:view` | The list of attendance records, one record, the records of a course on a date | admin, teacher, viewer, guest |
| `attendance:edit` | Record and change attendance; together with `students:edit`, save an attendance sheet; the lesson log, to read, to write and to export | admin, teacher |
| `attendance:delete` | Delete an attendance record | admin, teacher |

Enrolments have no permission of their own in use: reading them asks for `courses:view` or
`students:view`, changing them for `courses:edit`.

### Reports and exports

| Permission | Opens | Held by |
|---|---|---|
| `reports:view` | The account's custom reports: list, create, change, delete, the list of generated files; the report templates, to read; a student's outlook on the profile page | admin, teacher, viewer, guest |
| `reports:generate` | Nearly all of `/analytics` and all of `/metrics` and `/reports`: the Dashboard's figures, the Analytics page, student performance reports; generating a custom report and downloading the file | admin, teacher |
| `reports:export` | The PDF and Excel buttons of the Analytics page (which `reports:generate` opens as well) | admin, teacher |
| `exports:generate` | Every file of Utils > Export (CSV, Excel and PDF of students, courses, grades, attendance, enrolments, highlights and daily performance, a student's report, a course's analytics, everything as a ZIP); starting an export job | admin, teacher, viewer, guest |
| `exports:download` | Downloading the file of a finished export job | admin, teacher, viewer, guest |
| `notifications:manage` | Sending a message to all users, to a role or to named accounts | admin, teacher |

### Administration

No role but `admin` holds these.

| Permission | Opens |
|---|---|
| `users:view` | The list of accounts; another account's permissions in the lookup |
| `users:manage` | Create, change and delete an account, reset its password, unlock it |
| `permissions:view` | The roles, the permissions and who holds what |
| `permissions:manage` | Assign and remove a role; grant and revoke a permission; create, change and delete roles and permissions; "Initialize RBAC Defaults" |
| `audit:view` | The audit log, the history of role and permission changes, the history of imports and exports |
| `adminops:backup` | `POST /api/v1/adminops/backup` |
| `adminops:restore` | `POST /api/v1/adminops/restore` |
| `adminops:clear` | `POST /api/v1/adminops/clear` |
| `imports:preview` | `POST /api/v1/imports/preview` |
| `imports:execute` | `POST /api/v1/imports/execute` |

### In the list, opening nothing

No endpoint asks for these eight. Granting or revoking one changes nothing.

| Permission | What it was meant for |
|---|---|
| `analytics:view` | The analytics pages. They ask for `reports:generate`. |
| `enrollments:view`, `enrollments:manage` | Enrolments. They ask for `courses:view`, `students:view` and `courses:edit`. |
| `system:import`, `system:export` | Imports and exports. They ask for the `imports:` and `exports:` permissions. |
| `students.self:read`, `grades.self:read`, `attendance.self:read` | A student account reading its own data. See "Student accounts". |

## Asked for by an endpoint, not in the list

The code asks for these permissions, and the database of a new installation does not have
them. An account passes only by the wildcard `*:*`, so in practice only an administrator. They
cannot be granted from the **Permissions Catalog**, because it offers the 39 above.

| Permission | Asked for by |
|---|---|
| `imports:create` | Uploading a file to import (`/api/v1/imports/upload`, `/api/v1/imports/students`, `/api/v1/import-export/imports/...`) |
| `imports:view` | The list of import jobs and one job |
| `exports:view` | The list of export jobs and one job. A teacher can start a job and download its file, and cannot look at it (plan todo 62). |
| `sessions:manage` | Session export and import (Utils > Export > Session Export/Import) |
| `jobs:create`, `jobs:view`, `jobs:manage`, `jobs:delete` | The background jobs under `/api/v1/jobs` |
| `diagnostics:view`, `diagnostics:manage` | The query diagnostics under `/api/v1/diagnostics` |
| `admin:manage` | Clearing the analytics cache |
| `reports:create` | `POST /api/v1/analytics/reports/custom` |
| `analytics:export` | The Analytics page's PDF and Excel, as an alternative to `reports:export` and `reports:generate` |

One exception is written into the code: an account whose Role is `admin` passes every
permission that begins with `imports:`, whatever its role rows say.

## Checks that are not permissions

| Check | Where |
|---|---|
| **Role `admin`** | Rate limits; creating, changing, deleting and importing report templates; the e-mail settings of Import/Export; the semester archive; a student's data export and erasure and the health field (together with `students:view`, `students:delete` or `students:edit`) |
| **Role `admin` or `teacher`** | The feedback inbox |
| **Signed in** | Own notifications and their settings; saved searches; own dashboards; `/auth/me` and the change of the own password; the account's own permissions in the lookup |
| **Nothing** | Sign-in, sign-out, token refresh, registration and its mode; the CSRF token; sending feedback; the privacy notice; the user guide; the list of analytics report templates |
| **Control API rules** | Everything under `/control/api` and eight addresses under `/api/v1/admin`: see [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md#the-control-api) |

A role check reads the word in the account's Role column. A permission grant does not open it:
a teacher who is granted every permission in the list still cannot open the semester archive.

An account that must change its password first (a new default administrator, for one) is
refused everywhere except `/auth/me`, the password change, the token refresh and the sign-out.

## Student accounts

The code lets an account with the Role "Student" pass the check for `students:view` on the
nine endpoints marked "(or the student's own record)" in the matrix, when the student record
asked for belongs to that account. A student record belongs to an account through its
`user_id` column.

Nothing in the application fills that column: not the student form, not the import, not the
account form. So a student account passes none of these checks and every page of records
answers "forbidden" for it. The three `.self:read` permissions the built-in list gives a
student are not asked for by any endpoint.

## Accounts without role rows

When an account has no role row matching its Role, and no permission granted to itself, the
server falls back on a built-in list for that Role (in `backend/rbac.py`). For `admin`,
`teacher` and `guest` the list equals the table above; for `viewer` it is the table's nine
without the two `exports:` permissions; for `student` it is the three `.self:read`
permissions.

This matters in two cases:

- An old database from before the role tables: its accounts keep working.
- An account granted a permission of its own **and** left without a matching role row gets
  only what its rows say. The built-in list is then not used.

An account whose roles were revoked under **Assign Role to User** is not such an account:
the revoke changes the word in its Role column with the rows (to the highest role that is
left, or to `none`), so the built-in list of the old word no longer applies to it.

## The three auth modes

`AUTH_MODE` is a setting of the server (environment or `.env`), not something a page changes.

| Mode | What it does |
|---|---|
| `strict` (the default) | Every request must be signed in, and the checks above apply. |
| `permissive` | A request **without** a sign-in passes the permission checks. Anyone who can reach the server reads and changes the data. A signed-in request is checked as in `strict`. |
| `disabled` | No check is made. |

The server writes a warning to its log at every start when the mode is not `strict`. SMS Lite
sets `strict` itself. Use nothing else on a server that other machines can reach.

## Known gaps

Recorded in `docs/plans/UNIFIED_WORK_PLAN.md` (todo 63), not repaired:

- The audit log does not record who made a role or permission change.

Repaired on 18 November 2026 (PR 423), and still so in v1.18.73 and earlier: revoking the
only role of an account under **Assign Role to User** took nothing away. The account kept the
word in its Role column and got the built-in list for it ("Accounts without role rows"
above).

Repaired on 18 November 2026 (PR 422), and still so in v1.18.73 and earlier:

- The **Permissions Catalog** could not grant to or revoke from a role: its list of roles
  was empty.
- Five requests could take `*:*` from the administrators, after which none of them could open
  the account or the role panels: revoking it from the role `admin` through
  `POST /permissions/roles/revoke`, switching the permission off, deleting it (two
  addresses) and renaming it. After a switch-off a restart did not put it back. All five are
  refused now, and a start repairs a database in that state.
- An account with the Role Viewer or Guest could not be saved from **Edit** in User Accounts,
  and an administrator who got the role under Assign Role to User was listed there as a
  Teacher and became one when Edit was saved.
- The **Overview** tab showed no permission names, and the **Users** tab invented ones.

Repaired on 17 November 2026 (PR 419), and still so in v1.18.73 and earlier: a change of the
Role to "Student" left the account's roles in place, and on SQLite a deleted account's roles
passed to the next account created.
