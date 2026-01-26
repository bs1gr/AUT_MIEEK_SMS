# Operator Emergency & Host-level Operations (safe usage)

This short guide centralizes the policy and safe commands for operators who need to perform host-level operations (process termination, emergency shutdowns) for the SMS project.

Important principles

- Never automate host-level destructive commands (e.g., `taskkill`) from user-facing HTTP endpoints. Use the control API helpers and operator scripts.
- Prefer non-destructive, auditable actions. Use the control-API helper to request frontend stop before running host-level termination.
- Require explicit interactive confirmation for emergency host kills. The emergency script enforces this with the `-Confirm` switch.

Safe operator workflow

1. First try the control API helper (non-destructive):

```powershell
# Request the server to stop the frontend via control API

.\scripts\maintenance\stop_frontend_safe.ps1 -ControlUrl 'http://127.0.0.1:8000' -AdminToken '<admin-token-if-needed>'

```text
2. If the control API is not available and you must perform emergency host-level termination, run the interactive operator script (requires explicit confirmation):

```powershell
# Interactive emergency frontend shutdown (operator-only)

.\scripts\operator\KILL_FRONTEND_NOW.ps1 -Confirm

```text
Notes:

- The `scripts/operator/KILL_FRONTEND_NOW.ps1` script is intentionally destructive and requires `-Confirm` to proceed.
- Prefer running the emergency script locally on the operator host rather than embedding a call to `taskkill` in automation or CI.
- In containerized/managed deployments, rely on orchestration (docker, systemd, k8s) to handle process lifecycle; avoid host-level `taskkill`.

Logging & auditing

- All control API calls are logged with caller IP and whether an admin token was present. Check `backend/logs/app.log` for audit records.
- Emergency operator actions are destructive; ensure you have appropriate backups and understand the impact for running services.

Environment variables

- `CONTROL_API_ALLOW_TASKKILL` (default `0`): when set to `1` it allows the server control API to execute taskkill via `_safe_run()`. Use with extreme caution and only for dedicated operator-managed instances.

References

- Maintenance helper: `scripts/maintenance/stop_frontend_safe.ps1`
- Emergency script: `scripts/internal/KILL_FRONTEND_NOW.ps1`
- Backend gating (_safe_run/_allow_taskkill): `backend/main.py`

If you need further help, contact the on-call operator or open an issue in the ops tracker.
