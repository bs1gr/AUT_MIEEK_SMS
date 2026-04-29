# Deployment Checklist - Version 1.18.10

**Release Date**: March 9, 2026
**Tag**: vv1.18.21
**Previous Version**: vv1.18.21

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [ ] `VERSION` file reads `vv1.18.21`
- [ ] `frontend/package.json` version is `1.18.10`
- [ ] `backend/main.py` version header is `1.18.10`
- [ ] `INSTALLER_BUILDER.ps1` version reference is `1.18.10`
- [ ] `CHANGELOG.md` contains `[1.18.10] - 2026-03-09` section

### 1.2 Code Quality
- [ ] `scripts/VERIFY_VERSION.ps1 -CheckOnly` — success
- [ ] `COMMIT_READY.ps1 -Quick -Snapshot` — success

### 1.3 Git State
- [ ] `git status` — clean working tree before tag creation
- [ ] All release prep changes committed and pushed to `origin/main`
- [ ] No uncommitted or stray drift files remain

---

## Phase 2: Tag & Release

### 2.1 Create Tag
```powershell
git tag -a vv1.18.21 -m "vv1.18.21: installer profile-drift fix and release alignment"
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
- [ ] `SMS_Installer_1.18.10.exe` present in release assets
- [ ] `SMS_Installer_1.18.10.exe.sha256` present in release assets
- [ ] No other assets present (installer-only policy)

### 3.2 Signature Verification
```powershell
$sig = Get-AuthenticodeSignature "SMS_Installer_1.18.10.exe"
$sig.Status  # Must be "Valid" or approved policy status
$sig.SignerCertificate.Subject  # Must contain "AUT MIEEK"
```

### 3.3 Checksum Verification
```powershell
$hash = (Get-FileHash "SMS_Installer_1.18.10.exe" -Algorithm SHA256).Hash
$expected = (Get-Content "SMS_Installer_1.18.10.exe.sha256").Split(' ')[0]
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
- [ ] PostgreSQL profile preserved after upgrade
- [ ] No silent fallback to local SQLite
- [ ] Application starts without errors

### 4.3 Recovery Helper Smoke Test
- [ ] `scripts/ops/REPAIR_LAPTOP_ENV_PROFILE.ps1` creates backup of `.env`
- [ ] Recovery script restores remote profile keys when expected

---

## Phase 5: Production Deployment

### 5.1 Docker Update
```powershell
.\DOCKER.ps1 -Update
```

### 5.2 Post-Deploy Health Check
- [ ] `docker ps` — sms-app container healthy
- [ ] `/health` endpoint returns 200
- [ ] No restart loops observed
- [ ] Application accessible on port 8080

---

## Phase 6: Documentation

- [ ] Work plan updated with vv1.18.21 release prep / publication state
- [ ] CHANGELOG.md reflects released version
- [ ] Release docs committed (`RELEASE_NOTES`, `GITHUB_RELEASE`, `RELEASE_MANIFEST`, `DEPLOYMENT_CHECKLIST`)
