# QNAP PostgreSQL — Single Source of Truth (Policy & Procedures)

Last updated: 2026-10-05

This document specifies the current installer behavior and operational procedures for using the QNAP-hosted PostgreSQL instance as the single, shared database for the Student Management System (SMS).

Summary
-------
- Single Source of Truth: The QNAP server hosts ONE and ONLY PostgreSQL database that all production installations should use when configured for QNAP.
- Remote Credential File: Installations choosing QNAP load a `.json`, `.env`, or `.txt` credential file in the installer. The installer reads flat database keys from that file and MUST NOT create new PostgreSQL databases on the QNAP host during setup.
- Manual Fallback: If the remote QNAP server cannot be reached during the installer's TCP pre-check, the operator must explicitly decide whether to continue with the remote configuration or go back and switch to local SQLite.
- Migration Tools are special-case: Scripts like `backend/scripts/migrate_sqlite_to_postgres.py` and app-level import/export are manual, exceptional tools and are not part of normal setup.

What each deployment mode does with its data (2026-10-05)
--------------------------------------------------------
The System page shows which database a running server uses: its engine and target. A QNAP
connection shows a green "Remote DB connected (QNAP/VPN)" badge; SQLite shows an amber "Local
database on this machine only" badge.

| Mode | Database | Where the data lives | Shared with QNAP? | When QNAP is unreachable |
|------|----------|----------------------|-------------------|--------------------------|
| SMS Lite, no credentials file | SQLite | `%LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db` | No: this PC only | Not applicable; works offline |
| SMS Lite with `local-secrets\qnap-credentials.json` (same folder) | QNAP PostgreSQL | QNAP | Yes | **At startup: Lite does not start.** A Retry/Cancel box (EN/EL) waits for QNAP; Lite never falls back to a local file. **During a session:** student, attendance and grade changes are kept in the browser and sent when QNAP is back (see below). |
| Docker with `DATABASE_ENGINE=postgresql` and `POSTGRES_*` (or `DATABASE_URL`) in `config/.env` | QNAP PostgreSQL | QNAP | Yes | The server keeps running and answers `503 DATABASE_UNAVAILABLE`; changes are kept in the browser and sent when QNAP is back. |
| Docker without PostgreSQL settings | SQLite | `/data/student_management.db` in the `sms_data` volume | No: this Docker host only | Not applicable |
| Native (development) | Whatever `src/backend/.env` says | — | Depends on `.env` | As Docker |
| Android app (Capacitor) | None of its own | The server chosen in the app's server selector | As that server | As that server; changes wait in the app's storage |

**Changes kept in the browser while the database is down.**
- A warning banner names the pending student, attendance and grade changes.
- Each queue retries every 30 seconds while its page is open, and again when the page is
  reopened. Changes wait in that browser on that device only.
- Lists cannot load and other changes cannot be saved until the database is back.

**Migrations.** Every server runs Alembic against its own database at startup: Lite and Docker
upgrade QNAP's schema when a newer version first connects. Back up QNAP before installing a new
version.

**Switching an install between SQLite and QNAP moves no data.**
- Adding a credentials file to a Lite install makes it show QNAP's data; the old
  `sms_lite.db` stays untouched in AppData. Removing the file brings back that old, stale local
  data.
- To move data, copy a local database into an **empty** PostgreSQL database
  (`migrate_sqlite_to_postgres`, below), or use the app's import/export.

**Safe setup.**
- Lite: install with the QNAP option, or run `infra/scripts/dev/setup_lite_qnap_remote.ps1`.
- Docker: set the PostgreSQL values in `config/.env`.
- Either way, then open System and confirm the green badge and the QNAP host.

Principles (policy)
-------------------
1. Single Source of Truth
   - The QNAP PostgreSQL server is the canonical data store for shared installations.
   - No installer or automated process should create a new PostgreSQL database on the QNAP server during normal setup.

2. Remote Credential File
   - When an operator selects the "QNAP PostgreSQL" option during installation, the installer will:
     1. Ask the operator to browse to a `.json`, `.env`, or `.txt` credential file.
     2. Read flat credential values from that file using either `host` / `port` / `dbname` / `user` / `password` / `sslmode` keys or their `POSTGRES_*` equivalents.
     3. If the file is valid, configure the application to use the remote database and do not create any database/schema on QNAP.

3. Manual Fallback
   - If the installer cannot verify TCP connectivity to QNAP (network error, DNS, firewall, maintenance), it warns the operator before continuing.
   - The installer does not automatically switch profiles. To use local SQLite, the operator must explicitly return to the database profile page and choose the local option.
   - IMPORTANT: Using local SQLite as a fallback is a temporary, manual decision. Operators should plan to re-sync data to the central QNAP instance when connectivity is restored.

4. Migration Tools Are Special-Case
   - Migration helpers (for example `backend/scripts/migrate_sqlite_to_postgres.py`) exist to help operators synchronize data manually in exceptional cases (data recovery, one-off imports, advanced migrations).
   - These scripts are NOT routine setup tools and should only be used after creating snapshots/backups and reviewing the migration plan.

Installer Behavior (current)
----------------------------
- On fresh install when QNAP option chosen:
  1. Operator selects a `.json`, `.env`, or `.txt` credential file from the installer UI.
  2. Installer loads flat credential values from that file.
  3. Installer runs a TCP reachability pre-check for the configured host unless the host is the Docker-internal alias `postgres`.
  4. If the pre-check fails, the installer asks whether to continue anyway; otherwise the operator can go back and switch to local SQLite manually.
  5. On success or explicit confirmation, the installer writes the remote PostgreSQL settings into the application's `.env`.

- On upgrade (existing installation):
  - The upgrade flow must NOT change the database selection implicitly. If the installation already points to a remote QNAP DB, the upgrade continues to use that DB. If it points to SQLite, the upgrade preserves SQLite unless operator explicitly reconfigures to QNAP.

Supported credential file formats
--------------------------------
Purpose: the installer currently accepts a directly readable credential file chosen by the operator in the installer UI.

JSON example:

```json
{
  "host": "qnap.example.edu",
  "port": 5432,
  "dbname": "sms_central",
  "user": "sms_app",
  "password": "<password>",
  "sslmode": "prefer"
}
```

ENV or TXT example:

```text
POSTGRES_HOST=qnap.example.edu
POSTGRES_PORT=5432
POSTGRES_DB=sms_central
POSTGRES_USER=sms_app
POSTGRES_PASSWORD=<password>
POSTGRES_SSLMODE=prefer
```

- The current installer does not consume nested profile maps such as `profiles.qnap_main` or secret-reference fields such as `credential_secret_ref`.

Operational procedures (recommended)
-----------------------------------
1. Pre-install checklist for central deployments
   - Verify the QNAP PostgreSQL instance is healthy and reachable from client subnets.
   - Distribute a validated installer-readable `.json`, `.env`, or `.txt` credential file through a secure channel.
   - Ensure the QNAP DB user has only the permissions required by the app (no admin-level schema creation rights needed for normal installs).

2. During installation
   - Always prefer the remote-first path when the operator chooses QNAP.
   - If fallback to SQLite is necessary, record the intended QNAP target in your local deployment notes. The installer currently writes standard installation metadata only; it does not create a dedicated reconciliation metadata file.

3. Reconciling fallback installs (manual sync)
   - When QNAP connectivity is restored, the operator should:
     1. Take an application-level backup/snapshot of the local SQLite database and the QNAP database before any sync.
     2. `backend/scripts/migrate_sqlite_to_postgres.py` **cannot reconcile**. It matches rows by id, so it only copies into an EMPTY database. It refuses a non-empty destination; `--truncate` would REPLACE all of QNAP, and `--no-truncate` silently skips every row whose id is already taken. Never point it at the live QNAP database to merge.
     3. To bring entries from an old fallback `sms_lite.db` into QNAP, open it with a Lite install that has no credentials file, then export the records you need and import them, or re-enter them. Since 2026-10-05 Lite no longer creates such fallback data.

4. Verification & Auditing
   - Every reconciliation must be accompanied by logs and an artifacts snapshot (see `COMMIT_READY.ps1 -Snapshot` pattern). Keep the following: pre-sync backup, post-sync validation report, and a change log.

Examples: Common operator flows
--------------------------------
1. Fresh-install with QNAP reachable
   - Operator browses to a `.json`, `.env`, or `.txt` credential file from the installer UI.
   - Installer loads the remote values, validates the file, and finishes installation. Application runs against QNAP.

2. Fresh-install with QNAP unreachable
   - Installer cannot verify TCP connectivity to QNAP and warns the operator.
   - Operator either continues with the remote configuration if the network path is expected to come online, or goes back and chooses local SQLite as a temporary fallback.
   - Operator records the intended QNAP target in local deployment notes for later reconciliation.

3. Copying a SQLite database into a new, empty PostgreSQL database
   - Operator takes backups (SQLite file + a dump of the target).
   - Operator previews, then runs the helper. It refuses a destination that already has data:

```powershell
# Example: run manual migration from the repository root on the admin machine
# Activate the virtualenv, preview first with --dry-run, then rerun without it to apply
& .\.venv\Scripts\Activate.ps1
python -m backend.scripts.migrate_sqlite_to_postgres --sqlite-path "C:\path\to\fallback.db" --postgres-url "postgresql://sms_app:<password>@qnap.example.edu:5432/sms_central" --dry-run
```

Notes & warnings
----------------
- Do NOT let installers auto-create new PostgreSQL databases on QNAP. Creating additional DB instances undermines the single-source policy and creates fragmentation and support burden.
- Migration scripts can be destructive if used incorrectly. `--truncate` deletes all destination data; it is meant for restoring a backup. Always run with `--dry-run` first, verify the output, and create backups.
- If you need a testing/staging database on QNAP, provision it separately from the production single-source database.

Related files & references
-------------------------
- Installer script: `installer/SMS_Installer.iss`
- Migration helper: `backend/scripts/migrate_sqlite_to_postgres.py` (documentation in docstring)
- Application import/export endpoints: see `docs/user/USER_GUIDE_COMPLETE.md` → "Data import/export"
- Snapshot recommendations: `COMMIT_READY.ps1 -Snapshot` and `scripts/VERIFY_AND_RECORD_STATE.ps1` (where available)

Change log
----------
- 2026-03-25 — Initial policy + operational guidance (author: automation assistant)
- 2026-10-05 — Per-mode data table. Lite no longer falls back to SQLite while set up for QNAP; QNAP outages queue changes in the browser. The migration helper no longer truncates by default and cannot reconcile.
