# Rate Limits: Quick Reference

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

One page for administrators; the whole guide is
[RATE_LIMITING_GUIDE.md](RATE_LIMITING_GUIDE.md). The earlier text of this page promised that
a saved limit applies at once and gave advice on speed that the application cannot follow.
It is in the repository's history.

## The five limits

Requests per minute, counted per client address. The names are those of the **Rate Limits**
tab. What each covers is read from the code.

| Name on the tab | Default | Covers |
|---|---|---|
| **Read Requests** | 1,000 | Most routes that read records |
| **Write Requests** | 500 | Routes that create, change or delete records; feedback; reports |
| **Heavy Operations** | 200 | Preview and **Confirm & Import** of Utils > **Imports**; session file export, import, rollback; database backup, restore, clear; semester archive; one student's data export; monitoring routes |
| **Authentication** | 120 | Sign-in, registration, sign-out, refresh, CSRF token |
| **Bulk Imports** | 5,000 | `POST /api/v1/imports/students` only (reads JSON files from a server folder). Utils > Imports does not use it |

No limit of this kind: the Export Center's file downloads, search, custom reports,
dashboards, help.

## Changing a limit

1. System > Control Panel > tab **Rate Limits** (administrators only).
2. Change a row; it is marked **Modified**. Click **Save Changes**. The page says: "Rate
   limits saved. They take effect the next time the server starts."
3. Restart the server.

**Reset Defaults** asks first, then says: "Rate limits reset to defaults. They take effect
the next time the server starts."

## When it takes effect

At the next start of the server, not at once. Tried on 18 November 2026: with the read limit
saved as 3 per minute, eight reads in a row still answered 200; after a restart the fourth
was refused. The values are kept in `src/backend/config/rate_limits.json`.

## Environment variables

`RATE_LIMIT_READ_PER_MINUTE`, `RATE_LIMIT_WRITE_PER_MINUTE`, `RATE_LIMIT_HEAVY_PER_MINUTE`,
`RATE_LIMIT_AUTH_PER_MINUTE`, `RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE`. One that is set wins over
the saved value, and the tab goes on showing the saved value (read from the code). They are
read when the server starts.

## A refused request, and the endpoints

HTTP 429, body `{"detail":"3 per 1 minute"}` (the limit exceeded), no `Retry-After` header
(tried). The lockout after wrong passwords is separate, with its own message.

Endpoints, for an administrator's sign-in, under `/control/api`: `GET /rate-limits`,
`POST /rate-limits/update`, `/bulk-update` and `/reset`. Values are whole numbers from 1 up.
