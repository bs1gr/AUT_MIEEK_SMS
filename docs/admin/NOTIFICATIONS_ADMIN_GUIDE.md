# Notifications Administration Guide

**Applies to**: v1.18.73 and later
**Last checked against the code**: November 2026
**Audience**: administrators

This guide describes what the application does today. The first version of it (January 2026)
described a design: an administration panel, monitoring dashboards, reports, e-mail and
WebSocket settings for notifications. None of that was built. If you are looking for one of
those, see [What the application does not have](#what-the-application-does-not-have).

For the bell and the list as every user sees them, see the
[Notifications User Guide](../user/NOTIFICATIONS_USER_GUIDE.md).

---

## What creates a notification

Four things, and nothing else:

| Notification | Who receives it | When | Where a click leads |
|---|---|---|---|
| **New account awaiting approval** | Every active administrator | Someone registers and the account needs approval (`SELF_REGISTRATION_MODE=approval`, the default) | System > Control Panel > User Management |
| **Activation email not sent** | The administrator who approved the account; every active administrator if that cannot be told | An account was activated, but the e-mail to its owner failed or mail is not configured | System > Control Panel > User Management |
| **The automatic backup failed** | Every active administrator | The server could not make its automatic backup. At most one per administrator in 24 hours | System > Control Panel > Maintenance |
| **A message sent by hand** | All active accounts, one role, or the accounts an administrator names | An administrator or a teacher sends it (see below) | Nowhere: the text opens in place |

The first three are shown in the language of the reader, whatever language the server wrote
them in. A message sent by hand is shown as it was typed.

A notification is created for no other event: not for grades, attendance, enrolments,
courses, imports or exports.

The bell also shows **Update Available** when a newer release is published. That entry is
not a stored notification: it is kept in the browser, counts as one on the bell, and is
hidden with its **×** until the next release.

## What to do about each one

- **New account awaiting approval.** Open it, check who registered, and activate the
  account in User Management. Until you do, its owner cannot sign in.
- **Activation email not sent.** The account is active, but its owner was not told. Tell
  them yourself. If the notification says that mail is not configured, enter the SMTP
  settings under System > Control Panel > Email; on the cloud host they are empty unless
  someone entered them there.
- **The automatic backup failed.** The message carries the server's reason. Until a backup
  succeeds there is no new backup: open Manage Backups (System > Control Panel >
  Maintenance > System Operations), make a backup by hand, and see
  [Backup and Restore](BACKUP_AND_RESTORE.md).

## Sending a message to users

1. Open **Utils** in the navigation, then the **Notifications** tab.
2. Under **Send Notification** choose:
   - **Notification type**: System, Announcement, Course, Grade, Attendance, Enrollment or
     General. It only sets the label and the icon of the message.
   - **Target audience**: **All users**, a **Role** (Admin, Teacher, Student or Viewer), or
     **Specific users** (their numeric account IDs, separated by commas). "Specific users"
     is offered to administrators only.
   - **Title** and **Message**: both are required.
3. Select **Send notification**. The page answers "Notification broadcast sent."

What to know before sending:

- Each recipient gets a copy of their own. They see it the next time their bell asks the
  server: when they open the application, return to its tab, or come back online. Nothing is
  pushed to a page that is already open.
- "All users" and a role reach active accounts only.
- A sent message cannot be changed or taken back. Each recipient can delete their own copy.
- No e-mail is sent.
- User Management does not show account IDs, so "Specific users" is only practical when you
  already know them.

**Who may send.** Administrators and teachers: the form is shown to both (until v1.18.72
it was shown to administrators only, while the server already accepted a teacher's message).
A teacher is offered "All users" and "Role"; "Specific users" asks for account numbers,
which no page shows to a teacher. Other accounts (student, viewer, guest) are told "Your
account is not allowed to send notifications."

The server decides by the permission `notifications:manage`, which the administrator and
the teacher role hold by default. If an installation has taken it from a role, an account
of that role still sees the form and is told the same sentence when it sends.

A message does not say who sent it: a teacher's message to all users looks like an
administrator's.

## How notifications are kept

- Notifications are rows in the application's database (table `notifications`), one per
  recipient. They are part of every database backup.
- Each account sees only its own. An administrator cannot read another account's
  notifications in the application.
- **Delete** hides a notification; the row stays in the database, marked as deleted.
  Nothing removes notifications after a time, so the table only grows.

## What the application does not have

So that nobody looks for it:

- **No administration panel for notifications.** There is no dashboard, monitor, health
  check, log viewer, report, alert threshold or bulk action for them, and no menu
  "Settings > Notifications" or "Admin > Notifications".
- **No e-mail or SMS for a notification.** The application sends e-mail in other cases
  (the activation message for an approved account, a report that is ready, the test
  message of the mail settings), never as a copy of a notification.
- **No per-user settings.** The API has `GET` and `PUT /api/v1/notifications/preferences`
  and stores what is sent to them, but no page uses them and nothing reads them when a
  notification is created. Quiet hours, digests and per-type switches do not exist.
- **No push channel.** The Socket.IO channel was removed after v1.18.70; it never carried a
  notification. The server still has a WebSocket endpoint
  (`/api/v1/notifications/ws`), but no page of the application connects to it.
- **No separate log files.** There is no `notifications.log` or `email.log`; what the
  server writes about notifications is in its ordinary log.

## If something looks wrong

| What you see | Likely reason | What to do |
|---|---|---|
| A user says a message did not arrive | Their page was open the whole time | Ask them to switch to another tab and back, or reload |
| The bell's number does not change after you read something elsewhere | The same: the count is read at the moments listed above | Reload the page |
| "Activation email not sent" after every approval | Mail is not configured on that server | System > Control Panel > Email |
| "The automatic backup failed" every day | The reason is in the message | [Backup and Restore](BACKUP_AND_RESTORE.md) |
| No notification about a new registration | Self-registration is `open` or `disabled`, or you are not an active administrator | Check `SELF_REGISTRATION_MODE` and your account |

## For developers: the API

All under `/api/v1/notifications`, for the signed-in account:

| Request | What it does |
|---|---|
| `GET /` | The account's notifications (`skip`, `limit` up to 100, `unread_only`), with the total and the unread count |
| `GET /unread-count` | The number on the bell |
| `POST /{id}/read`, `POST /read-all` | Mark one, or all, as read |
| `DELETE /{id}` | Hide one (soft delete) |
| `POST /broadcast` | Send a message; needs `notifications:manage` |
| `GET /release-announcement` | Whether a newer release is published |
| `GET`, `PUT /preferences` | Stored, not used (above) |
