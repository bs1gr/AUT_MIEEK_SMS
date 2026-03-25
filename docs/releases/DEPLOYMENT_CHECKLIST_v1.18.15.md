# Deployment Checklist — v1.18.15

**Version**: 1.18.15
**Release Date**: 2026-03-21
**Environment Targets**: Docker (production), Native (development)
**Status**: ✅ PREPARED

---

## Pre-Deployment

### 1. Prerequisites

- [ ] Download `SMS_Installer_1.18.15.exe` from GitHub release assets
- [ ] Confirm GitHub digest for published installer (authoritative post-upload SHA256)
- [ ] Verify Authenticode signature: `Get-AuthenticodeSignature` → Status must be `Valid`
- [ ] Signer must be: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
- [ ] Confirm `VERSION` file reads `v1.18.15`

### 2. Backup

- [ ] Create backup of production database before starting
- [ ] Record backup filename and timestamp
- [ ] Verify backup integrity (size > 0)

---

## Standard Windows Deployment (Installer)

### 3. Upgrade from v1.18.14

- [ ] Stop Docker if running: `.\DOCKER.ps1 -Stop`
- [ ] Run installer: `SMS_Installer_1.18.15.exe`
- [ ] Upgrade path: v1.18.14 → v1.18.15 (no database migration required)
- [ ] Accept UAC prompt
- [ ] Complete installer wizard
- [ ] Installer auto-restores `sms-app` container

### 4. Post-Install Smoke Test

- [ ] Docker container `sms-app` status: `Up ... (healthy)`
- [ ] `.\DOCKER.ps1 -Status` shows healthy
- [ ] `Invoke-WebRequest http://localhost:8080/health` → HTTP 200
- [ ] Login to application: confirm version displays `1.18.15`
- [ ] RBAC: confirm user permissions table accessible (no startup errors in logs)

---

## QNAP / PostgreSQL Deployment

### 5. QNAP-Specific Notes

- [ ] This release adds SQLite/QNAP DB selection logic in startup profile defaults
- [ ] Startup profile defaults are now hardened (forward declaration fix included)
- [ ] PostgreSQL auth drift recovery is hardened (single-mode startup)
- [ ] Run preflight validation before starting: check bind IP, port sanity, writable paths
- [ ] Verify PostgreSQL health endpoint after start

### 6. QNAP Post-Deploy

- [ ] `docker inspect sms-app --format '{{.State.Health.Status}}'` → `healthy`
- [ ] Check `docker logs sms-app --tail 30` for errors
- [ ] Confirm `/health` endpoint returns 200

---

## Native Development Environment

### 7. Native Update

- [ ] `git pull origin main`
- [ ] `git checkout v1.18.15` (or keep `main`)
- [ ] `pip install -r backend/requirements.txt` (if dependencies changed)
- [ ] `npm install --prefix frontend` (if dependencies changed)
- [ ] `.\NATIVE.ps1 -Start`
- [ ] Backend `/health` on port 8000 → 200
- [ ] Frontend on port 5173 → accessible

---

## Production Docker Deployment (Manual)

### 8. Docker Update

```powershell
.\DOCKER.ps1 -Update      # fast update (cached build + backup)
# OR
.\DOCKER.ps1 -UpdateClean # clean rebuild (no-cache + backup)
```

- [ ] Build completes without errors
- [ ] `sms-app` container starts in `healthy` state
- [ ] `Invoke-WebRequest http://localhost:8080/health` → 200

---

## Post-Deployment Verification

### 9. Core Functionality

- [ ] Student list loads without error
- [ ] Course list loads without error
- [ ] Grades entry functional
- [ ] Attendance tracking functional
- [ ] Reports (custom report builder accessible)
- [ ] Analytics dashboard accessible
- [ ] Admin: RBAC panel accessible (no 403 from permissions table missing)

### 10. RBAC Verification

- [ ] Login as admin → admin panel accessible
- [ ] Login as teacher → scoped access correct
- [ ] No `user_permissions table does not exist` errors in logs

### 11. Observation Period

- [ ] Monitor `docker logs sms-app` for first 10–15 minutes
- [ ] No restart loops (restart count stays at 0)
- [ ] No auth drift errors (PostgreSQL deployments)

---

## Rollback Procedure

If deployment fails at any step:

```powershell
# Rollback installer: run previous installer (SMS_Installer_1.18.14.exe)
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
| RBAC functional | |  |
| Observation period clear | |  |

**Date**: _______________
**Verified by**: Owner
