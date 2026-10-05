# QNAP Reconciliation Runbook (Quick)

**Status**: Active. Rewritten 2026-10-05.

This runbook covers data that was entered into a local SQLite database while the shared QNAP
PostgreSQL database should have been used.

> **Do not run `migrate_sqlite_to_postgres` against the live QNAP database to "merge" data.**
> This runbook used to say to, without `--no-truncate`, and the script's default then **deleted
> every QNAP table** before copying. The tool matches rows by id and cannot merge two
> databases that were edited separately:
> - by default it now refuses a destination that already has data;
> - `--truncate` replaces all of it;
> - `--no-truncate` silently skips every row whose id is already taken, or attaches local rows
>   to the wrong students and courses.

Full policy: `QNAP_POSTGRES_SINGLE_SOURCE.md` (includes the per-deployment-mode table).

## Where local data can still come from

- **SMS Lite before 2026-10-05.** When QNAP was unreachable, Lite silently switched to
  `%LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db` for that session. Since 2026-10-05 Lite
  with a credentials file does not start without QNAP, so new fallback data is no longer
  created.
- **An install deliberately run on SQLite** (Lite without a credentials file, or Docker without
  PostgreSQL settings) that should now join QNAP.
- **Docker during a QNAP outage keeps nothing locally.** Changes wait in the browser and are sent
  by the app itself when QNAP is back; no runbook is needed.

## Checklist

1. **Snapshot both sides first.**

   ```powershell
   # On the machine with the local data (close SMS Lite first)
   Copy-Item "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\sms_lite.db" "C:\backups\sms_lite_$(Get-Date -Format yyyyMMdd_HHmm).db"
   ```

   ```bash
   # QNAP dump (admin workstation with pg tools)
   PGPASSWORD="<secret>" pg_dump -h <qnap-host> -p <port> -U <user> -Fc -f qnap_pre_reconcile.dump <dbname>
   ```

2. **Find what is missing on QNAP.** Open the local copy with a Lite install that has **no**
   credentials file, so it runs on SQLite, and compare it with QNAP. Look for students, courses,
   attendance and grades entered during the outage.

3. **Bring those records into QNAP through the application.** Use Import/Export (students,
   courses) or re-enter attendance and grades on a QNAP-connected install. Imports match courses
   by course code and students by student ID or e-mail, not by local ids.

4. **Verify:** counts and the recent entries on QNAP, plus the application logs.

5. **Keep the evidence:** the backups, what was moved, and by whom.

## Copying a whole SQLite database into a new, empty PostgreSQL database

This is the one job `migrate_sqlite_to_postgres` is for (for example, a standalone install's
first move to its own new PostgreSQL). Preview first:

```powershell
& .\.venv\Scripts\Activate.ps1
python -m backend.scripts.migrate_sqlite_to_postgres --sqlite-path "C:\backups\sms_lite_<timestamp>.db" --postgres-url "postgresql://<user>:<password>@<host>:<port>/<new-empty-db>" --dry-run
```

Then run it without `--dry-run`. If it reports that the destination already has data, stop:
you are pointing at a database that is in use.

## Rollback plan

- Restore QNAP from `qnap_pre_reconcile.dump`, and the local database from its backup copy.

## Local contact note

- Add your environment-specific owner or operator contacts before distributing this runbook outside the repository.
