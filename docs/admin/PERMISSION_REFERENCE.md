# Permission reference

**Checked against the application:** 18 November 2026, `main` after v1.18.73. Every
permission named here is one the code has: `src/backend/tests/test_permission_documents.py`
fails when this file names another, or leaves one out.

**Related:** [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what, and every endpoint
with what it asks for) and [RBAC_ADMIN_GUIDE.md](RBAC_ADMIN_GUIDE.md) (the administrator's
steps).

**What changed on 18 November 2026** (the owner's decisions; not in v1.18.73 or earlier):

- The application has two roles, `admin` and `teacher`. The roles Viewer and Guest are gone,
  and "Student" is no longer a role an account can have.
- An account may do what its rows in the database say, and nothing else. The list the code
  kept for accounts without role rows is gone.
- Teachers import students and courses from a file.
- The list of permissions is closed: it holds what the endpoints ask for, and the wildcard.
  The thirteen permissions that were asked for without being in the list were added, and the
  eight that opened nothing were removed.

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

There is no fourth way. An account without a role and without a grant of its own holds
nothing, whatever the word in its Role column says.

A permission that is switched off (`is_active` false) counts for nobody.

The answer is worked out from the database on every request. A change takes effect with the
next request, without a new sign-in. (`PERMISSION_CACHE_TTL_SECONDS` can make the server keep
an answer for some seconds; it is off unless set.)

Some endpoints do not ask for a permission at all. They check the account's **role** (the word
in the account's Role column), or only that somebody is signed in, or nothing. Those are listed
under "Checks that are not permissions".

## The roles and what they hold

A new database gets two roles. This is what the application gives them at its first start.

| Role | Permissions |
|---|---|
| `admin` | `*:*`, and each of the teacher's 25 once more by name |
| `teacher` | `students:view`, `students:create`, `students:edit`, `students:delete`, `courses:view`, `courses:create`, `courses:edit`, `courses:delete`, `grades:view`, `grades:edit`, `grades:delete`, `attendance:view`, `attendance:edit`, `attendance:delete`, `reports:view`, `reports:generate`, `reports:export`, `notifications:manage`, `exports:generate`, `exports:download`, `imports:preview`, `imports:execute`, `imports:create`, `imports:view`, `jobs:view` |

**The Role column of an account** holds `admin`, `teacher` or `none`. `none` ("No role" in User
Accounts) is not a role: it is what the column holds when the account has neither of the two.
Such an account can sign in, and nothing opens for it.

**The two roles are fixed points.** They can be neither renamed nor deleted: accounts are tied
to them by name. Their permissions can be changed (except that `*:*` cannot be taken from
`admin`), and an installation can add roles of its own.

**Giving `admin` brings `teacher` with it.** Assigning `admin` under **Assign Role to User**
also gives `teacher`. Creating an account in **User Accounts**, or changing its role there,
gives the one role only. Both end in the same permissions.

## The permissions in the list

These 44 permissions are in the database of a new installation and are the ones the
**Permissions Catalog** shows. The first is `*:*`, which covers every permission and is held
by `admin` alone; the other 43 are exactly the ones the endpoints ask for.

### Records

| Permission | Opens | Held by |
|---|---|---|
| `students:view` | The list of students and a student's record; the search for students; a student's attendance, grades, enrolments, highlights and daily performance; the account's own private notes about a student, to read and to write | admin, teacher |
| `students:create` | Add a student, add several at once | admin, teacher |
| `students:edit` | Change a student, make one active or inactive, fill in the academic year for many; add and change highlights; add, change and delete daily performance; together with `attendance:edit`, save an attendance sheet | admin, teacher |
| `students:delete` | Delete a student, delete a highlight | admin, teacher |
| `courses:view` | The list of courses and a course; its evaluation rules; who is enrolled; the attendance, grades and daily performance of a course; the search for courses | admin, teacher |
| `courses:create` | Add a course | admin, teacher |
| `courses:edit` | Change a course, end it, reactivate it, change its evaluation rules; enrol students, remove an enrolment, change its status | admin, teacher |
| `courses:delete` | Delete a course | admin, teacher |
| `grades:view` | The list of grades and one grade; the search for grades | admin, teacher |
| `grades:edit` | Add and change a grade | admin, teacher |
| `grades:delete` | Delete a grade | admin, teacher |
| `attendance:view` | The list of attendance records, one record, the records of a course on a date | admin, teacher |
| `attendance:edit` | Record and change attendance; together with `students:edit`, save an attendance sheet; the lesson log, to read, to write and to export | admin, teacher |
| `attendance:delete` | Delete an attendance record | admin, teacher |

Enrolments have no permission of their own: reading them asks for `courses:view` or
`students:view`, changing them for `courses:edit`.

### Reports, exports and messages

| Permission | Opens | Held by |
|---|---|---|
| `reports:view` | The account's custom reports: list, create, change, delete, the list of generated files; the report templates, to read; a student's outlook on the profile page | admin, teacher |
| `reports:generate` | Nearly all of `/analytics` and all of `/metrics` and `/reports`: the Dashboard's figures, the Analytics page, student performance reports; generating a custom report and downloading the file | admin, teacher |
| `reports:export` | The PDF and Excel buttons of the Analytics page (which `reports:generate` opens as well) | admin, teacher |
| `exports:generate` | Every file of Utils > Export (CSV, Excel and PDF of students, courses, grades, attendance, enrolments, highlights and daily performance, a student's report, a course's analytics, everything as a ZIP); starting an export job | admin, teacher |
| `exports:download` | Downloading the file of a finished export job | admin, teacher |
| `notifications:manage` | Sending a message to all users, to a role or to named accounts | admin, teacher |

### Imports

| Permission | Opens | Held by |
|---|---|---|
| `imports:preview` | Checking a file of students or courses before it is imported (`POST /api/v1/imports/preview`) | admin, teacher |
| `imports:execute` | Importing the checked file (`POST /api/v1/imports/execute`) | admin, teacher |
| `imports:create` | Uploading a file to import (`/api/v1/imports/upload`, `/api/v1/imports/students`, `/api/v1/import-export/imports/...`) | admin, teacher |
| `imports:view` | The list of import jobs and one job | admin, teacher |
| `jobs:view` | The state of a background job. The Imports tab follows the import it started with it. | admin, teacher |

A semester's session file (Utils > Export > Session Export/Import) is not among these: it asks
for `sessions:manage`, which stays with the administrator.

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
| `sessions:manage` | Session export and import (Utils > Export > Session Export/Import) |
| `exports:view` | The list of export jobs and one job. A teacher can start a job and download its file, and cannot look at it (plan todo 62). |
| `jobs:create` | Starting a background job by hand (`POST /api/v1/jobs/`) |
| `jobs:manage` | Cancelling a background job |
| `jobs:delete` | Deleting a background job |
| `diagnostics:view` | The query diagnostics under `/api/v1/diagnostics` |
| `diagnostics:manage` | Resetting the query diagnostics |
| `admin:manage` | Clearing the analytics cache |
| `reports:create` | `POST /api/v1/analytics/reports/custom` |
| `analytics:export` | The Analytics page's PDF and Excel, as an alternative to `reports:export` and `reports:generate` |

### The list is closed

Every permission an endpoint asks for is in the list, so each can be granted and revoked from
the **Permissions Catalog**; and the list holds nothing that no endpoint asks for, except the
wildcard. Two tests keep it so (`test_two_roles_model.py`, `test_permission_documents.py`):
an endpoint that asks for a new permission fails them until the permission is added to
`PERMISSION_DEFS` in `backend/routers/routers_rbac.py`.

Until 18 November 2026 thirteen permissions were asked for and not in the list (only the
administrator's wildcard opened their endpoints), and eight were in the list and opened
nothing: `analytics:view`, `enrollments:view`, `enrollments:manage`, `system:import`,
`system:export`, `students.self:read`, `grades.self:read` and `attendance.self:read`. A
database that still holds the eight loses them, with their grants, when it is upgraded.

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

## Accounts without a role

An account holds no role when:

- its last role was revoked under **Assign Role to User**, or **Edit** in User Accounts set
  its role to "No role";
- it was a Student, Viewer or Guest account when the database was upgraded (see below).

Its Role column reads `none`. It can sign in, see its own profile and change its password;
every page of records answers "forbidden". A permission granted to the account itself still
counts. Giving it a role again, in either place, brings the access back.

**The step at every start.** Each time the application starts, every account whose Role column
says `admin` or `teacher` is given the row of that role if it lacks it. This is what keeps the
accounts of an old database working (one from before the role tables has no rows at all), and
the first administrator of an installation, whom the start creates after it seeded the roles.
The step never gives a role back that was taken away, because `none` names no role. The same
step runs after a restore from a backup and with "Initialize RBAC Defaults".

**The upgrade of an older database** (migration `5189ab647b5a`, run by the first start of the
new version):

| Before | After |
|---|---|
| Role column "student", "viewer" or "guest" | `none`, or `teacher` / `admin` if the account also held that role |
| The roles `viewer` and `guest` | Removed, with the rows that gave them to accounts |
| The eight permissions that opened nothing | Removed, with their grants |
| The thirteen permissions that were asked for and missing | Added |
| The role `teacher` | Granted the four `imports:` permissions and `jobs:view` |

Everything else stays as it is, including changes an administrator made to what `teacher`
holds and permissions granted to single accounts.

**A leftover in the code.** `backend/rbac.py` still lets an account whose Role column says
"student" read a student record that belongs to it (through the record's `user_id` column), on
the nine endpoints marked "(or the student's own record)" in the matrix. No page and no
request can make such an account any more, and nothing fills `user_id`, so the rule opens
nothing. It is recorded in the plan (todo 63).

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

Repaired on 18 November 2026, and still so in v1.18.73 and earlier:

- An account without role rows was given a list of permissions the code kept for the word in
  its Role column. A leftover word could grant access no row stood for, and revoking the only
  role of an account under **Assign Role to User** took nothing away (PR 423 and the change
  described at the top of this file).
- The roles `admin` and `teacher` could be renamed and deleted through the API.
- The **Permissions Catalog** could not grant to or revoke from a role: its list of roles
  was empty (PR 422).
- Five requests could take `*:*` from the administrators, after which none of them could open
  the account or the role panels: revoking it from the role `admin` through
  `POST /permissions/roles/revoke`, switching the permission off, deleting it (two
  addresses) and renaming it. After a switch-off a restart did not put it back. All five are
  refused now, and a start repairs a database in that state (PR 422).
- An administrator who got the role under Assign Role to User was listed in User Accounts as
  a Teacher and became one when Edit was saved (PR 422).
- The **Overview** tab showed no permission names, and the **Users** tab invented ones
  (PR 422).

Repaired on 17 November 2026 (PR 419), and still so in v1.18.73 and earlier: a change of the
Role to "Student" left the account's roles in place, and on SQLite a deleted account's roles
passed to the next account created.
