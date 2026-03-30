# QNAP Reconciliation Runbook (Quick)

**Status**: Active QNAP reconciliation runbook

This runbook provides a concise, operator-focused checklist for reconciling temporary local-fallback installs (SQLite) back into the central QNAP PostgreSQL instance.

Warning: Follow the full policy in `QNAP_POSTGRES_SINGLE_SOURCE.md` before performing any migration. Always create backups and run with `--dry-run` before applying changes.

## Pre-conditions
- Confirm network connectivity from the admin workstation to QNAP
- Gather operator contact info and schedule a maintenance window
- Ensure backups available for both local SQLite and QNAP DB

## Checklist

1. Snapshot local fallback database (SQLite)

```powershell
# On the machine with the fallback install
Stop-Service -Name "sms-app" -ErrorAction SilentlyContinue
Copy-Item -Path "C:\path\to\app\data\fallback.db" -Destination "C:\backups\fallback_{timestamp}.db" -Force
```

2. Dump QNAP PostgreSQL (admin workstation)

```bash
# On admin workstation with pg tools
PGPASSWORD="<secret>" pg_dump -h qnap.example.edu -p 5432 -U sms_app -Fc -f qnap_pre_sync.dump sms_central
```

3. Run migration in preview mode

```powershell
& .\.venv\Scripts\Activate.ps1
python -m backend.scripts.migrate_sqlite_to_postgres --sqlite-path "C:\backups\fallback_{timestamp}.db" --postgres-url "postgresql://sms_app:<password>@qnap.example.edu:5432/sms_central" --dry-run
```

4. Review preview diff and validation report
- Confirm conflicts, duplicate keys, and business-rule issues are acceptable

5. If acceptable, run migration without `--dry-run` (after full backups)

```powershell
python -m backend.scripts.migrate_sqlite_to_postgres --sqlite-path "C:\backups\fallback_{timestamp}.db" --postgres-url "postgresql://sms_app:<password>@qnap.example.edu:5432/sms_central"
```

6. Post-sync verification
- Run application-level sanity checks (counts, recent transactions)
- Check application logs for errors
- Keep migration logs with your deployment notes

## Rollback plan

- If anything unexpected happens, restore QNAP from `qnap_pre_sync.dump` and restore local DB from the backup copy.

## Local contact note

- Add your environment-specific owner or operator contacts before distributing this runbook outside the repository.
