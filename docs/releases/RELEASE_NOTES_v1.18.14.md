# Release Notes - Version 1.18.14

**Status**: Release preparation in progress
**Release Date (target)**: 2026-03-19
**Previous Version**: v1.18.13
**Scope Baseline**: `v1.18.13..HEAD`

---

## Scope Summary

- **Commits reviewed**: 12
- **Primary focus**: security/code-scanning remediation + dependency hardening

---

## Included Changes

### Security hardening (backend)
- Added explicit boundary validation for backup filename entry points in:
  - `backend/services/database_manager.py` (`delete_backup`, `get_backup_path`, `restore_backup`)
  - `backend/routers/control/database.py` (download/delete/restore route guards)
- Tightened updater status endpoint handling in:
  - `backend/routers/control/maintenance.py` (fail-closed invalid `job_id` behavior)

### Regression coverage
- Added traversal rejection coverage for control database download route:
  - `backend/tests/test_control_database_credentials.py`

### Dependency alignment and remediation
- Frontend lockfile updates:
  - `socket.io-parser` → `4.2.6`
  - `flatted` → `3.4.2`
- Backend constraints hardening:
  - `backend/requirements.txt`: `werkzeug>=3.1.6`
  - `backend/requirements-dev.txt`: `pypdf>=6.9.1`, `werkzeug>=3.1.6`
- Prior vulnerability-focused dependency refreshes in this range include:
  - `PyJWT` to `2.12.0`
  - `cryptography` and `python-multipart` security updates

---

## Verification Status (pre-release)

- [x] Backend focused tests passed (`25 passed`):
  - `backend/tests/test_database_manager_security.py`
  - `backend/tests/test_control_database_credentials.py`
  - `backend/tests/test_control_maintenance.py`
- [x] Backend batch-run passed (`34/34` batches):
  - `test-results/backend_batch_run_20260319_162940.txt`
- [x] Frontend full Vitest passed (`112 files`, `1900 tests`):
  - `test-results/frontend_vitest_batch_20260319_165300.txt`
- [x] Frontend audit clean (`0` vulnerabilities)
- [x] Backend environment audit clean after remediation (`pip_audit`: no known vulnerabilities)
- [x] State snapshot recorded:
  - `artifacts/state/STATE_2026-03-19_204251.md`
- [x] Local installer build/sign/smoke for `v1.18.14`
  - `dist/SMS_Installer_1.18.14.exe`
  - Signature: `Valid` (`CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`)
  - SHA256: `78B10CA0D5A4F9E8C2A46C29ADBC4210BF66C275165E0678DC44CA55C898E9D6`
- [ ] Tag creation + release workflow verification


