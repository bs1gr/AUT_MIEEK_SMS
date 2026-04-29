# Deployment Checklist - Version 1.18.7

**Release Date**: March 5, 2026
**Tag**: vv1.18.21
**Previous Version**: vv1.18.21

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [ ] `VERSION` file reads `vv1.18.21`
- [ ] `frontend/package.json` version is `1.18.7`
- [ ] `backend/main.py` version header is `1.18.7`
- [ ] `COMMIT_READY.ps1` version reference is `vv1.18.21`
- [ ] `CHANGELOG.md` contains `[1.18.7] - 2026-03-05` section

### 1.2 Code Quality
- [ ] `python -m ruff check backend/` — 0 errors
- [ ] `npm --prefix frontend run lint` — 0 errors
- [ ] `npx tsc --noEmit --skipLibCheck` — 0 errors (frontend)

### 1.3 Test Suite
- [ ] Backend tests: `.\RUN_TESTS_BATCH.ps1` — all batches passing
- [ ] Frontend tests: `npm --prefix frontend run test` — all passing
- [ ] E2E tests: `.\RUN_E2E_TESTS.ps1` — all passing

### 1.4 Git State
- [ ] `git status` — clean working tree
- [ ] All changes committed and pushed to `origin/main`
- [ ] No uncommitted or stashed changes

---

## Phase 2: Tag & Release

### 2.1 Create Tag
```powershell
git tag -a vv1.18.21 -m "vv1.18.21: Control Panel Auto-Updater, Offline Sync, Health Diagnostics"
git push origin vv1.18.21
```

### 2.2 Monitor Workflows
- [ ] `Create GitHub Release on tag` — SUCCESS
- [ ] `Build & Upload Installer with SHA256` — SUCCESS
- [ ] `Release Asset Sanitizer` — SUCCESS

### 2.3 Verify Release Page
- [ ] Release page exists at: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vv1.18.21`
- [ ] Release body populated from `GITHUB_RELEASE_vv1.18.21.md`
- [ ] Not marked as draft

---

## Phase 3: Artifact Verification

### 3.1 Installer Assets
- [ ] `SMS_Installer_1.18.7.exe` present in release assets
- [ ] `SMS_Installer_1.18.7.exe.sha256` present in release assets
- [ ] No other assets present (installer-only policy)

### 3.2 Signature Verification
```powershell
# Download installer, then verify:
$sig = Get-AuthenticodeSignature "SMS_Installer_1.18.7.exe"
$sig.Status  # Must be "Valid"
$sig.SignerCertificate.Subject  # Must contain "AUT MIEEK"
```

### 3.3 Checksum Verification
```powershell
$hash = (Get-FileHash "SMS_Installer_1.18.7.exe" -Algorithm SHA256).Hash
$expected = (Get-Content "SMS_Installer_1.18.7.exe.sha256").Split(' ')[0]
if ($hash -eq $expected) { "✅ SHA256 MATCH" } else { "❌ MISMATCH" }
```

---

## Phase 4: Functional Validation

### 4.1 Fresh Installation (Manual)
- [ ] Run installer on clean machine/VM
- [ ] Application launches successfully
- [ ] Login page accessible
- [ ] Health endpoint responds 200

### 4.2 Upgrade from vv1.18.21 (Manual)
- [ ] Run installer over existing vv1.18.21 installation
- [ ] Data preserved after upgrade
- [ ] Application starts without errors
- [ ] New features accessible (auto-updater panel, offline indicators)

### 4.3 Feature Smoke Tests
- [ ] Control panel auto-updater shows version info
- [ ] Offline sync queues operations when disconnected
- [ ] Health diagnostics surfaces PostgreSQL status
- [ ] Notification bell integration works

---

## Phase 5: Production Deployment

### 5.1 Docker Update
```powershell
.\DOCKER.ps1 -Update    # Cached build + backup
# OR
.\DOCKER.ps1 -UpdateClean  # Full rebuild
```

### 5.2 Post-Deploy Health Check
- [ ] `docker ps` — sms-app container healthy
- [ ] `/health` endpoint returns 200
- [ ] No restart loops (restart count = 0)
- [ ] Application accessible on port 8080

---

## Phase 6: Documentation

- [ ] Work plan updated with vv1.18.21 release status
- [ ] CHANGELOG.md reflects released version
- [ ] Release docs committed (4 files in `docs/releases/`)

---

## Rollback Procedure

If critical issues are found:

```powershell
# Docker rollback
.\DOCKER.ps1 -Stop
# Checkout previous version
git checkout vv1.18.21
.\DOCKER.ps1 -Start

# Installer rollback
# Use vv1.18.21 installer from previous release
```
