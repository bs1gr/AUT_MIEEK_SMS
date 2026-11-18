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
| Teacher | All of the school's records: students, courses, enrolments, grades, attendance, the lesson log, reports, exports, messages to all users. Not accounts, roles, imports, backups. |
| Viewer, Guest | Read the records and export them. Change nothing. No Dashboard figures. |
| Student | Sign in, and nothing else of use: no page of records opens for it. |
| No role | The same. What an account is after its last role was revoked. |

The full table is in [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md).

## Accounts

### Create an account

In **User Accounts**, under "Create new user": Email, Password, Name, Role (Administrator,
Teacher or Student), then **Create user**. The account is active at once. The password must
have at least 8 characters, with an uppercase and a lowercase letter, a number and a symbol,
and no spaces.

A Viewer or Guest account cannot be created here: create it as a Teacher and change its role
as described under "Make a read-only account".

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
- The role box offers Administrator, Teacher and Student. For an account with the role Viewer
  or Guest it also shows that role, selected, and **Save** leaves the role as it is unless
  you choose another one.
- Changing the role to **Student** takes the account's roles away. It can still sign in
  and no page of records opens for it. See "Take an account's access away" below.

In v1.18.73 and earlier the role in the list and in the Edit row is not always the
account's, and **Save** sends the role it shows:

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
2. Choose a role under **Role Name**: Administrator, Teacher, Guest or Viewer.
3. **Assign Role to User**. The page answers "Role assigned successfully" and empties the
   number box; type the number again to see the result.

What follows from a role:

- **Teacher brings Viewer and Guest with it, Administrator brings all three.** The account
  then shows several roles. That is intended and changes nothing: the higher role already
  holds what the lower ones hold.
- The Role column of User Accounts follows the highest role the account has: Administrator,
  then Teacher, then Viewer, then Guest, and reads "No role" when it has none. (In v1.18.73
  and earlier it shows the role the account got first.)
- The change counts from the account's next request. Nobody has to sign in again.

### Take a role away

Same tab: type the number, then **Revoke** next to the role. Taking away Teacher does not take
away the Viewer and Guest roles that came with it; revoke those as well if the account is to
lose them.

**Revoking the last role leaves the account with nothing.** The page says so, the account's
Role column reads "No role", and every page of records is refused to it from its next
request, also for the sign-in it already has. It can still sign in. "Initialize RBAC
Defaults" does not give the role back. To end the state, give the account a role here, or
choose one in **User Accounts** > **Edit**. A permission granted to the account itself
stays: look the account up in the Permissions Catalog.

The Role column steps down with the roles: an account that loses Teacher and still has
Viewer reads "Viewer".

In v1.18.73 and earlier revoking the only role takes nothing away. The page answers
"revoked" and the role is gone from the list, but the word in the Role column stays (an
administrator's becomes "Teacher"), and an account without roles gets the built-in
permissions of that word: a teacher whose Teacher role was revoked still reads, changes and
exports everything. There, take access away as described below.

The last administrator cannot lose the Administrator role ("Cannot remove the last admin
user").

### Make a read-only account

1. **User Accounts**: create the account as a **Teacher**. Note its number.
2. **RBAC Configuration** > **Assign Role to User**: type the number, choose **Viewer**,
   **Assign Role to User**.
3. Type the number again and **Revoke** the role **Teacher**.

User Accounts now shows the account as "Viewer".

What a viewer gets: every list and record to read, the Search page, and every export,
including the ZIP of all data. What it does not get: any change, the lesson log, the
Dashboard's figures and the Analytics page (those panels stay empty). The pages still show
their "Add" and "Save" buttons to a viewer; the server refuses the request.

## Take an account's access away

Any one of these works at once, for the sign-in the account already has too:

- **Edit** > untick **Active**. The account cannot sign in until you tick it again.
- **Edit** > role **Student**. The account can sign in and no page of records opens for it.
  Permissions granted to the account itself stay: look it up in the Permissions Catalog and
  revoke them there.
- **Assign Role to User** > **Revoke** every role the account has. The same, and the Role
  column reads "No role". (Not in v1.18.73 and earlier: see "Take a role away".)
- **Delete** the account.

To check an account, look it up in the Permissions Catalog. An account without a role shows
no permission at all. A student account that holds nothing shows three permissions ending in
`.self:read` and no role; those three open nothing.

In v1.18.73 and earlier the role Student did not take the roles away: a former teacher kept a
teacher's access. There, untick **Active**.

## Permissions

### See what an account holds

**RBAC Configuration** > **Permissions Catalog**, under "User permission lookup": type the
account's number and **View permissions**. The answer shows the account's e-mail address and
role, the permissions granted to the account itself ("Direct permissions") and the ones it has
through each role.

The same tab lists all 39 permissions, grouped by area, each with a line of description. Eight
of them open nothing, and several things the server asks for are not among them: see
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md).

### Grant a permission to one account

Same tab, "Grant Permission": **Grant To**: User, the account's number, the permission, then
**Grant**. "Revoke Permission" below it takes it back the same way. Both count from the
account's next request.

Example: `audit:view` granted to a teacher lets that account read the audit log through the
API, and nothing else changes for it.

Two limits:

- A grant opens what asks for a **permission**. It does not open what asks for the
  **administrator role**: the semester archive, the e-mail settings, the rate limits, the
  report templates, a student's data export and erasure.
- Only the 39 permissions of the list can be granted. Imports, for one, ask for permissions
  that are not in it, so imports stay with the administrator.

### Grant a permission to a role

The same form with **Grant To**: Role: choose the role (admin, teacher, guest or viewer) and
the permission, then **Grant**. Every account with that role has the permission from its next
request. "Revoke Permission" with Role takes it from the role the same way.

Example: `audit:view` granted to the role teacher lets every teacher read the audit log
through the API; revoked, a teacher's next request for it is refused.

- The two limits above hold here too.
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
  column ("Legacy role") and the roles it holds, or "No RBAC roles assigned" (a Student
  account, or one whose roles were all revoked). The number is what Assign Role to User and
  the Permissions Catalog ask for.
- In v1.18.73 and earlier the two lists of Overview show blank rows where the permissions
  should be, and Users shows each account that has a role as "User 3" with an invented
  address ("user_3@system") and "Legacy role: user".
- **Settings** has one button, **Initialize RBAC Defaults**. It adds any of the four roles,
  the 39 permissions and their standard grants that are missing, and gives every account
  whose Role is Administrator, Teacher, Viewer or Guest that role if it lacks it. It removes
  nothing: a permission you took from a role comes back, a permission you added stays.

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
- **An administrator forgot the password.** Another administrator resets it in User Accounts.
- **There is no other administrator.** This cannot be done from the pages. The server has
  settings for it: with `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` and
  `DEFAULT_ADMIN_FORCE_RESET=true` in its environment, the next start creates the account of
  that address, or makes it an active administrator again, with that password. Take
  `DEFAULT_ADMIN_FORCE_RESET` out afterwards, or every start resets the password.

## What the application does not have

- A page for creating roles or permissions. The four roles and 39 permissions are fixed
  unless somebody works with the API.
- Permissions per course or per class. A teacher account sees and changes every student and
  every course.
- A working student role: see "Student" under the kinds of account.
- An end date for a grant, from the page. (The API accepts one.)
- A page for the audit log.
- A page where a teacher changes the own password.
