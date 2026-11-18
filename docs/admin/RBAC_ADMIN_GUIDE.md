# Accounts, roles and permissions: the administrator's guide

**Checked against the application:** 17 and 18 November 2026, `main` after v1.18.73. Every step
below was done in a browser against a running copy, and every statement about what the server
allows was tried with an account of that kind. Where v1.18.73 itself behaves differently, the
text says so.

**Related:** [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (who can do what) and
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md) (every permission and what it opens).

This file replaces a guide that described the planned system: 26 permissions, tasks done with
`curl`, SQL queries for an audit, a migration between two versions. Most of it did not match
what the application does. This one says what the pages do, and where they do not work.

**Since 18 November 2026** (not in v1.18.73 or earlier) the application has two roles,
Administrator and Teacher. The roles Viewer and Guest are gone, "Student" is no longer a role
an account can have, and teachers import students and courses. See "After the upgrade".

---

## Where everything is

Sign in as an administrator, then: **System** > **Show Control Panel** > **Maintenance**.
Two panels there are about accounts:

- **User Accounts**: the accounts themselves.
- **RBAC Configuration**: roles and permissions. Only an administrator sees it.

User Accounts shows an account's number as "ID: 7" under its name. The role and permission
forms ask for that number, not for the name or the e-mail address.

## The kinds of account, in short

| Kind | Can |
|---|---|
| Administrator | Everything |
| Teacher | All of the school's records: students, courses, enrolments, grades, attendance, the lesson log, reports, exports, imports of students and courses, messages to all users. Not accounts, roles, a semester's session file, backups. |
| No role | Sign in, and nothing else of use: no page of records opens for it. What an account is after its last role was taken away. |

Students have no accounts. A student is a record the teachers keep, not somebody who signs in.

The full table is in [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md).

## Accounts

### Create an account

In **User Accounts**, under "Create new user": Email, Password, Name, Role (Administrator or
Teacher), then **Create user**. The account is active at once. The password must have at
least 8 characters, with an uppercase and a lowercase letter, a number and a symbol, and no
spaces.

### Approve a registration

Somebody who registers on the sign-in page gets a Teacher account that cannot sign in yet.
Every administrator gets a notification, and User Accounts shows the account as "Pending
approval" with a count above the list.

- **Approve** activates it. If e-mail is configured the person is told by e-mail; the page
  says whether the e-mail went out, and asks you to tell them yourself when it did not.
- **Delete** removes a request from somebody you do not recognise.

Whether registration is offered at all is a setting of the server, `SELF_REGISTRATION_MODE`:
`approval` (the default), `open` (the account is active at once) or `disabled`.

### Change an account

**Edit** opens the row: the name, the role and the box "Active". **Save** stores the name
and "Active", and the role when you chose another one.

- Unticking **Active** stops the account at once: its next request is refused and it cannot
  sign in. Ticking it again brings it back.
- The role box offers Administrator, Teacher and **No role**.
- **No role** takes the account's roles away. It can still sign in and no page of records
  opens for it. See "Take an account's access away" below.

In v1.18.73 and earlier the role box offers Administrator, Teacher and Student, the role in the
list and in the Edit row is not always the account's, and **Save** sends the role it shows:

- An account with the role Viewer or Guest cannot be saved from Edit as it is: the box shows
  "Administrator" and the server refuses the save ("Could not update user").
- **An administrator who got the role under Assign Role to User is listed as "Teacher", and
  Edit followed by Save makes the account a teacher**, also when nothing was changed. There,
  set the role box to the role the account is to have before every **Save**.

### Reset a password

**Reset password** asks for a new password and **Apply reset**. It also stops the account's
open sessions from being renewed and unlocks an account that was locked after too many
failed sign-ins.

The person is not asked to choose a new password at the next sign-in. An administrator
changes the own password at the top of User Accounts ("Change Your Password"). Nobody else
has a page for that: a teacher who wants a new password asks an administrator for a reset.

### Delete an account

**Delete** asks once and cannot be undone. The account's roles, its own permissions, its
notifications, saved searches, reports, dashboards and private notes about students go with
it; its entries in the audit log stay.

In v1.18.73 and earlier, on an installation with its own SQLite database (SMS Lite without a
shared database), the roles of a deleted account stayed behind and the next account created
got them. There, look the new account up in the Permissions Catalog after creating it.

### The last administrator

The application refuses to delete, deactivate or demote the last active administrator.

## Roles

### Give an account a role

**RBAC Configuration** > **Assign Role to User**:

1. Type the account's number in **User ID**. "Assigned roles" shows what it has now.
2. Choose a role under **Role Name**: Administrator or Teacher.
3. **Assign Role to User**. The page answers "Role assigned successfully" and empties the
   number box; type the number again to see the result.

What follows from a role:

- **Administrator brings Teacher with it.** The account then shows two roles. That is intended
  and changes nothing: the administrator's role already covers what the teacher's holds.
- The Role column of User Accounts follows the highest role the account has: Administrator,
  then Teacher, and reads "No role" when it has neither. (In v1.18.73 and earlier it shows the
  role the account got first.)
- The change counts from the account's next request. Nobody has to sign in again.

### Take a role away

Same tab: type the number, then **Revoke** next to the role. Taking away Administrator does not
take away the Teacher role that came with it: the account is a teacher then. Revoke that as
well if the account is to lose it.

**Revoking the last role leaves the account with nothing.** The page says so, the account's
Role column reads "No role", and every page of records is refused to it from its next
request, also for the sign-in it already has. It can still sign in. Neither "Initialize RBAC
Defaults" nor a restart gives the role back. To end the state, give the account a role here,
or choose one in **User Accounts** > **Edit**. A permission granted to the account itself
stays: look the account up in the Permissions Catalog.

In v1.18.73 and earlier revoking the only role takes nothing away. The page answers
"revoked" and the role is gone from the list, but the word in the Role column stays (an
administrator's becomes "Teacher"), and an account without roles gets the permissions the
program kept for that word: a teacher whose Teacher role was revoked still reads, changes and
exports everything. There, take access away as described below.

The last administrator cannot lose the Administrator role ("Cannot remove the last admin
user").

## Take an account's access away

Any one of these works at once, for the sign-in the account already has too:

- **Edit** > untick **Active**. The account cannot sign in until you tick it again.
- **Edit** > role **No role**. The account can sign in and no page of records opens for it.
  Permissions granted to the account itself stay: look it up in the Permissions Catalog and
  revoke them there.
- **Assign Role to User** > **Revoke** every role the account has. The same.
- **Delete** the account.

To check an account, look it up in the Permissions Catalog. An account without a role shows
no role and, unless something was granted to it by itself, no permission.

In v1.18.73 and earlier neither the role Student (which the role box offers there) nor the
revoking of every role takes a teacher's access away. There, untick **Active**.

## Permissions

### See what an account holds

**RBAC Configuration** > **Permissions Catalog**, under "User permission lookup": type the
account's number and **View permissions**. The answer shows the account's e-mail address and
role, the permissions granted to the account itself ("Direct permissions") and the ones it has
through each role.

The same tab lists all 44 permissions, grouped by area, each with a line of description. They
are the ones the server asks for, and the wildcard `*:*`: see
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md).

### Grant a permission to one account

Same tab, "Grant Permission": **Grant To**: User, the account's number, the permission, then
**Grant**. "Revoke Permission" below it takes it back the same way. Both count from the
account's next request.

Example: `audit:view` granted to a teacher lets that account read the audit log through the
API, and nothing else changes for it.

One limit: a grant opens what asks for a **permission**. It does not open what asks for the
**administrator role**: the semester archive, the e-mail settings, the rate limits, the report
templates, a student's data export and erasure.

### Grant a permission to a role

The same form with **Grant To**: Role: choose the role (admin or teacher) and
the permission, then **Grant**. Every account with that role has the permission from its next
request. "Revoke Permission" with Role takes it from the role the same way.

Example: `audit:view` granted to the role teacher lets every teacher read the audit log
through the API; revoked, a teacher's next request for it is refused.

- The limit above holds here too.
- **Initialize RBAC Defaults** (Settings tab) puts back a standard grant that was revoked.
- `*:*` cannot be revoked from the role admin: the page says so, and the server refuses the
  request. Without it no administrator could open the account or the role panels.

In v1.18.73 and earlier the box that should list the roles is empty, in the grant form and in
the revoke form, so neither can be done from the page; and the request behind the revoke form
(`POST /api/v1/permissions/roles/revoke`) accepts `*:*` for the role `admin`. See "If the
administrator is locked out".

## The other tabs of RBAC Configuration

- **Overview** counts the roles and the permissions, names the roles, and lists every
  permission by its key with its name in the page's language. "Role-Permission Mappings"
  lists every grant as role → permission.
- **Users** lists every account: name, e-mail address, number ("ID"), the word in its Role
  column ("Legacy role") and the roles it holds, or "No RBAC roles assigned" (an account
  without a role). The number is what Assign Role to User and the Permissions Catalog ask
  for.
- In v1.18.73 and earlier the two lists of Overview show blank rows where the permissions
  should be, and Users shows each account that has a role as "User 3" with an invented
  address ("user_3@system") and "Legacy role: user".
- **Settings** has one button, **Initialize RBAC Defaults**. It adds any of the two roles,
  the 44 permissions and their standard grants that are missing, and gives every account
  whose Role is Administrator or Teacher that role if it lacks it. It removes nothing: a
  permission you took from a role comes back, a permission you added stays. The application
  does the same at every start when a role, the list or the administrator's `*:*` is missing.

## Traps

### The pages do not hide what an account may not do

Apart from the administrator's own panels, every signed-in account sees the same pages and
buttons. What it may do is decided by the server at each request. A refused request shows as a
failure message on the page.

### Nobody is recorded as the author of a change

Role and permission changes are written to the audit log with the time, the account they were
about and what changed. The entry does not say which administrator made the change.

### No page shows the audit log

The audit log and the history of role changes are answered by the API
(`GET /api/v1/audit/logs`, `GET /api/v1/admin/rbac/change-history`) for an account with
`audit:view`. The application has no page for them.

## If the administrator is locked out

- **The role and account panels answer "forbidden" for every administrator.** The role
  `admin` has lost the wildcard `*:*`. No page can do that, and the server refuses the
  requests that would: taking it from the role, switching it off, deleting it, renaming it.
  In v1.18.73 and earlier the server accepts them. Restart the application: at every start
  it checks that the role `admin` holds `*:*` and that the permission is switched on, and
  puts both right, together with the rest of the standard grants. (In v1.18.73 and earlier
  a restart does not help when the permission was switched off; update the application.)
- **The roles themselves.** The roles `admin` and `teacher` can be neither renamed nor
  deleted: the server refuses both. In v1.18.73 and earlier it accepts them and nothing bad
  follows there; a database in which one of the two is missing is put right by the first
  start of a newer version.
- **An administrator forgot the password.** Another administrator resets it in User Accounts.
- **There is no other administrator.** This cannot be done from the pages. The server has
  settings for it: with `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` and
  `DEFAULT_ADMIN_FORCE_RESET=true` in its environment, the next start creates the account of
  that address, or makes it an active administrator again, with that password. Take
  `DEFAULT_ADMIN_FORCE_RESET` out afterwards, or every start resets the password.

## After the upgrade

The first start of the version that has two roles changes an existing installation once:

- **An account that was a Student, a Viewer or a Guest is listed with "No role".** It can sign
  in and nothing opens for it. If the person is to work with the records, choose **Teacher**
  under **Edit**; otherwise leave it, deactivate it or delete it. An account that held the
  Teacher or Administrator role beside one of the three keeps that role.
- **Teachers can import.** **Utils** > **Imports** works for a teacher: students and courses
  from a file, with a check of the file before anything is stored. A semester's session file
  (**Utils** > **Export** > **Session Export/Import**) stays with the administrator.
- **Every administrator and teacher keeps the access.** An account of an old installation that
  never had a role of its own in the role tables is given one at the start.
- Changes you made to what the role Teacher holds, and permissions you granted to single
  accounts, stay.

## What the application does not have

- A page for creating roles or permissions. The two roles and 44 permissions are fixed unless
  somebody works with the API.
- A read-only role. Viewer and Guest are gone; they read and exported everything and got no
  Dashboard figures.
- Accounts for students.
- Permissions per course or per class. A teacher account sees and changes every student and
  every course.
- An end date for a grant, from the page. (The API accepts one.)
- A page for the audit log.
- A page where a teacher changes the own password.
