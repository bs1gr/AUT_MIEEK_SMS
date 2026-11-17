# Notifications User Guide

**Applies to**: v1.18.72 and later
**Last checked against the application**: November 2026

This guide describes what the application does today. Its first version (January 2026)
described a design with e-mail notifications, personal settings, quiet hours and instant
delivery; those were not built, and they are listed at the end so that nobody looks for
them.

---

## What a notification is

A short message for your account, shown under the bell at the top of the page. You get one
in two cases:

- **An administrator sent a message** to everyone, to your role, or to you.
- **You are an administrator** and something needs you: a new account is waiting for
  approval, an activation e-mail could not be sent, or the automatic backup failed. The
  [Administration Guide](../admin/NOTIFICATIONS_ADMIN_GUIDE.md) says what to do about each.

The application does not create a notification when a grade or an attendance record is
entered, when you are enrolled in a course, or when a course changes.

## The bell

- The bell is at the top of every page once you are signed in.
- A number on it is the count of notifications you have not read (above 99 it shows "99+").
- Select the bell to open the list. Select anywhere else to close it.

The number is read from the server when you open the application, when you return to its
tab, and when your connection comes back. **Nothing arrives while the page just stays
open.** If you are waiting for a message, switch to another tab and back, or reload.

## The list under the bell

It shows your ten newest notifications. For each one:

- A blue dot marks it as unread.
- **Select it** to mark it as read. If it leads somewhere (the administrator notices do),
  the application opens that page; otherwise the full text opens in place.
- The **eye** button marks it as read without opening it.
- The **bin** button deletes it from your list.

Above the list, **Mark all as read** clears the number on the bell. Below it,
**View all notifications** opens the full list.

## The full list

**View all notifications** opens a panel with everything, twenty at a time:

- **Previous** and **Next** at the bottom move through older notifications.
- **View details** shows the whole text of one; **Hide details** closes it again.
- **Delete** removes it from your list.
- **Mark all as read**, at the top, does the same as under the bell.

What you mark or delete here changes the bell and the short list at once.

## "Update Available"

When a newer release of the application is published, the list shows **Update Available**
with the version, and the bell counts it as one. It is a reminder kept in your browser, not
a message from a person. The **×** on it hides it until the next release. Updating is done
by an administrator.

## Privacy

- You see only your own notifications, and nobody else sees yours in the application.
- Deleting a notification removes it from your lists. The record stays in the application's
  database.
- A message from an administrator is a copy made for you: deleting yours does not delete
  anyone else's.

## If something looks wrong

| What you see | What to do |
|---|---|
| No bell | You are not signed in |
| A colleague got a message and you did not | Switch to another tab and back, or reload. If it is still missing, the message may have been sent to another role |
| The number does not go down after reading | Reload the page; if it stays, tell your administrator |
| A notification will not open a page | Only the administrator notices lead somewhere; the others open their text in place |

## What the application does not have

- **E-mail or SMS for notifications.** Nothing is sent to your mailbox or phone when a
  notification is created.
- **Personal notification settings.** There is no page for choosing which notifications you
  get, no quiet hours and no daily or weekly digest.
- **Filtering or sorting** of the list by type or date. The newest is always first.
- **Instant delivery.** See [The bell](#the-bell) for when new notifications show up.

Questions go to your system administrator.
