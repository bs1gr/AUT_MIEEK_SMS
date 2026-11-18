# Rate Limits

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

The server has five request limits, each a number of requests per minute for one client
address. Administrators can change them on the **Rate Limits** tab of the Control Panel. A
saved limit takes effect the next time the server starts, not at once. The earlier text of
this guide said that changes applied immediately, listed uses for the groups that the server
does not have, and described sliders and indicators the page does not show. The earlier text
is in the repository's history. A one-page version of this guide is
[RATE_LIMITING_QUICK_REFERENCE.md](RATE_LIMITING_QUICK_REFERENCE.md).

What was tried, on a scratch copy of the application on 18 November 2026: the read limit was
set to 3 per minute on the **Rate Limits** tab. The server reported the new value, and eight
reads in a row still answered 200. After the server was restarted, the fourth read was
refused with HTTP 429, with the body `{"detail":"3 per 1 minute"}` and no `Retry-After`
header. The value had been saved in `src/backend/config/rate_limits.json`.

What is read from the code and was not tried is marked "read from the code".

## The five limits

A limit is a number of requests per minute. The names are the ones the **Rate Limits** tab
shows.

| Name on the tab | Default | What it covers (read from the code) |
|---|---|---|
| **Read Requests** | 1,000 | Most routes that read records: students, courses, enrolments, attendance, grades, highlights, daily performance, lesson logs, student notes, notifications, analytics, the audit log, background jobs, metrics, privacy |
| **Write Requests** | 500 | The routes that create, change or delete those records, sending feedback, and the reports routes |
| **Heavy Operations** | 200 | The preview and **Confirm & Import** of Utils > Imports, and the older upload route; the export, import and rollback of a session file; the database backup, restore and clear; the semester archive's preview and execution; the export of one student's personal data; the monitoring routes of the Control Panel |
| **Authentication** | 120 | Signing in, registering, signing out, refreshing the sign-in, asking who is signed in, and the route that issues the CSRF token |
| **Bulk Imports** | 5,000 | One route: `POST /api/v1/imports/students`, which reads JSON files from a folder on the server and is not an upload. A function for courses carries the same limit but has no route. Utils > Imports does not use either |

So the imports a teacher or administrator makes on Utils > **Imports** count under **Heavy
Operations**, not under **Bulk Imports**.

Routes with no limit of this kind (read from the code): the file exports of the Export Center
(`/export`), the search routes, custom reports, dashboards, the help routes (including the
Quick Guide PDF), the older `/import-export` routes, RBAC and the other Control Panel routes
except monitoring.

A limit only decides when a request is refused. Raising it does not make anything faster.

## How a limit counts

- Per client address: the address the server sees for the request. Two people who reach the
  server from one address share the count (read from the code: `get_remote_address`).
- The counts are kept in the server's memory (read from the code).

## What a refused request looks like

HTTP 429, with a body of the form `{"detail":"3 per 1 minute"}`: the limit and "per 1
minute". There is no `Retry-After` header (tried). Wait for the minute to pass.

The sign-in lockout is a separate thing. After several wrong passwords an account is locked
for a while ([USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md), section 1). Read from the
code: the answer is also a 429, with the message "Too many failed login attempts. Please try
again later." and a `Retry-After` header. Its settings are `AUTH_LOGIN_*` in
`src/backend/ENV_VARS.md`. A wrong password alone is not a rate limit: the answer is "Invalid
email or password".

## Changing the limits: the Rate Limits tab

For administrators only: System > Control Panel, tab **Rate Limits**. The title is **Rate
Limiting Configuration**. The line under it says: "Adjust API rate limits to prevent service
degradation. A saved limit takes effect the next time the server starts."

The box **Rate Limit Configuration** says: "Adjust these limits if users experience 429 (Too
Many Requests) errors." Below it are five rows: **Read Requests**, **Write Requests**,
**Heavy Operations**, **Authentication** and **Bulk Imports**. Each has a slider, a number box,
the text "requests per minute" and "Default: N".

1. Change a value with the slider or in the number box. The row is marked **Modified**.
2. Click **Save Changes**. It cannot be clicked until something is changed. The page says:
   "Rate limits saved. They take effect the next time the server starts."
3. Restart the server. Until then the old limits stay in force.

**Reset Defaults** asks "Reset all rate limits to defaults?" and then says: "Rate limits reset
to defaults. They take effect the next time the server starts."

Read from the code: the slider runs from 1 to three times the default in steps of 5; the
number box takes any whole number from 1 up. A green "+N%" shows how far a value is above its
default.

## Environment variables

`RATE_LIMIT_READ_PER_MINUTE`, `RATE_LIMIT_WRITE_PER_MINUTE`, `RATE_LIMIT_HEAVY_PER_MINUTE`,
`RATE_LIMIT_AUTH_PER_MINUTE` and `RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE`. They are described in
`src/backend/ENV_VARS.md`. Read from the code:

- A variable that is set wins over the saved value. The tab goes on showing the saved value,
  not the variable's (`src/backend/routers/control/rate_limits.py` returns the saved values),
  so with a variable set, the tab can say something other than what is in force.
- The limits are read when the server starts; a variable changed later also needs a restart.

## Where the values are kept

In `src/backend/config/rate_limits.json`, in the backend's `config` folder; **Save Changes**
and **Reset Defaults** write it. At the start the server reads it, and a file it cannot read
is ignored: the defaults apply (read from the code).

## The endpoints

All under `/control/api`. They need the sign-in of an administrator (read from the code:
`optional_require_role("admin")`).

| Request | What it does |
|---|---|
| `GET /control/api/rate-limits` | The saved values (`current`), the defaults (`defaults`) and the time (`timestamp`) |
| `POST /control/api/rate-limits/update` | Saves one limit: `{"limit_type": "auth", "value": 240}` |
| `POST /control/api/rate-limits/bulk-update` | Saves several: `{"limits": {"read": 2000, "write": 1000}}` |
| `POST /control/api/rate-limits/reset` | Saves the defaults |

`limit_type` is one of `read`, `write`, `heavy`, `auth` and `teacher_import`. A value is a
whole number from 1 up. The Rate Limits tab uses `bulk-update` and `reset`. Read from the
code: a `bulk-update` that holds one wrong entry answers 400, but the correct entries in it
have already been saved. Like a save on the page, these take effect at the next start.

## Which limit to raise

Find the action that was refused in the table above and raise the limit of its group.
Imports on Utils > **Imports** are in **Heavy Operations**. Then restart the server.
