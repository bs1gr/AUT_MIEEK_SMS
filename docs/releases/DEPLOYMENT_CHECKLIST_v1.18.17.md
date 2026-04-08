# Deployment Checklist - v1.18.17

**Version**: 1.18.17
**Release Date**: 2026-04-08
**Environment Targets**: Docker (production), Native (development)
**Status**: ✅ PREPARED

---

## Pre-Deployment

### 1. Prerequisites

- [ ] Download `SMS_Installer_1.18.17.exe` from GitHub release assets
- [ ] Confirm GitHub digest for the published installer (authoritative post-upload SHA256)
- [ ] Verify Authenticode signature: `Get-AuthenticodeSignature` -> Status must be `Valid`
- [ ] Signer must be: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
- [ ] Confirm `VERSION` file reads `v1.18.17`

### 2. Backup

- [ ] Create backup of production database before starting
- [ ] Record backup filename and timestamp
- [ ] Verify backup integrity (size > 0)

---

## Standard Windows Deployment (Installer)

### 3. Upgrade from v1.18.16

- [ ] Stop Docker if running: `.\DOCKER.ps1 -Stop`
- [ ] Run installer: `SMS_Installer_1.18.17.exe`
- [ ] Upgrade path: `v1.18.16 -> v1.18.17` (no database migration required)
- [ ] Accept UAC prompt
- [ ] Complete installer wizard
- [ ] Installer retains remote PostgreSQL `sslmode` in generated environment settings

### 4. Post-Install Smoke Test

- [ ] Docker container `sms-app` status: `Up ... (healthy)`
- [ ] `.\DOCKER.ps1 -Status` shows healthy
- [ ] `Invoke-WebRequest http://localhost:8080/health` -> HTTP 200
- [ ] Login to application: confirm version displays `1.18.17`
- [ ] Verify remote credential validation rejects incomplete files and distinguishes auth vs TCP failures clearly

---

## QNAP / PostgreSQL Deployment

### 5. QNAP-Specific Notes

- [ ] Remote/QNAP PostgreSQL remains the intended shared-database path
- [ ] Installer credential files may be supplied as `.json`, `.env`, or `.txt`
- [ ] Credential files may use flat keys or `POSTGRES_*` keys
- [ ] Verify the selected `sslmode` is preserved in the generated runtime environment
- [ ] Confirm the installer payload does not include workstation-only SQLite or backup artifacts

### 6. QNAP Post-Deploy

- [ ] `docker inspect sms-app --format '{{.State.Health.Status}}'` -> `healthy`
- [ ] Check `docker logs sms-app --tail 30` for errors
- [ ] Confirm `/health` endpoint returns 200
- [ ] Confirm remote single-image restarts preserve the active remote PostgreSQL profile

---

## Native Development Environment

### 7. Native Update

- [ ] `git pull origin main`
- [ ] `git checkout v1.18.17` (or keep `main`)
- [ ] `pip install -r backend/requirements.txt` (if dependencies changed)
- [ ] `npm install --prefix frontend` (if dependencies changed)
- [ ] `.\NATIVE.ps1 -Start`
- [ ] Backend `/health` on port 8000 -> 200
- [ ] Frontend on port 5173 -> accessible

---

## Production Docker Deployment (Manual)

### 8. Docker Update

```powershell
.\DOCKER.ps1 -Update
# OR
.\DOCKER.ps1 -UpdateClean
```

- [ ] Build completes without errors
- [ ] `sms-app` container starts in `healthy` state
- [ ] `Invoke-WebRequest http://localhost:8080/health` -> 200
- [ ] Remote PostgreSQL mode does not leave obsolete internal-postgres resources behind

---

## Post-Deployment Verification

### 9. Core Functionality

- [ ] Student list loads without error
- [ ] Course list loads without error
- [ ] Grades entry functional
- [ ] Attendance tracking functional
- [ ] Reports (custom report builder accessible)
- [ ] Analytics dashboard accessible
- [ ] Admin database-management credential import still succeeds for complete remote files

### 10. Observation Period

- [ ] Monitor `docker logs sms-app` for first 10-15 minutes
- [ ] No restart loops (restart count stays at 0)
- [ ] No remote-profile drift or stale credential errors appear in logs

---

## Rollback Procedure

If deployment fails at any step:

```powershell
# Rollback installer: run previous installer (SMS_Installer_1.18.16.exe)
# Rollback Docker:
.\DOCKER.ps1 -Stop
# Restore from backup (taken in step 2)
.\DOCKER.ps1 -Start
```

---

## Sign-Off

| Step | Status | Notes |
|---|---|---|
| Installer signature verified | |  |
| Upgrade completed | |  |
| Health endpoint 200 | |  |
| Smoke test passed | |  |
| Observation period clear | |  |

**Date**: _______________
**Verified by**: Owner
