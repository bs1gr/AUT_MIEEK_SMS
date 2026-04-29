# Deployment Checklist - Version 1.18.11

**Release Date**: March 9, 2026
**Tag**: vv1.18.21
**Previous Version**: vv1.18.21

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [ ] `VERSION` file reads `vv1.18.21`
- [ ] `frontend/package.json` version is `1.18.11`
- [ ] `backend/main.py` version header is `1.18.11`
- [ ] `INSTALLER_BUILDER.ps1` version reference is `1.18.11`
- [ ] `CHANGELOG.md` contains `[1.18.11] - 2026-03-09` section

### 1.2 Code Quality
- [ ] `scripts/VERIFY_VERSION.ps1 -CheckOnly` — success
- [ ] `COMMIT_READY.ps1 -Quick -Snapshot` — success

### 1.3 Git State
- [ ] `git status` — clean working tree before tag creation
- [ ] All corrective release prep changes committed and pushed to `origin/main`
- [ ] No uncommitted or stray drift files remain

---

## Phase 2: Tag & Release

### 2.1 Create Tag
```powershell
git tag -a vv1.18.21 -m "vv1.18.21: corrective installer asset publication fix"
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
- [ ] `SMS_Installer_1.18.11.exe` present in release assets
- [ ] `SMS_Installer_1.18.11.exe.sha256` present in release assets
- [ ] No other assets present (installer-only policy)

### 3.2 Signature Verification
```powershell
$sig = Get-AuthenticodeSignature "SMS_Installer_1.18.11.exe"
$sig.Status
$sig.SignerCertificate.Subject
```

### 3.3 Checksum Verification
```powershell
$hash = (Get-FileHash "SMS_Installer_1.18.11.exe" -Algorithm SHA256).Hash
$expected = (Get-Content "SMS_Installer_1.18.11.exe.sha256").Split(' ')[0]
if ($hash -eq $expected) { "✅ SHA256 MATCH" } else { "❌ MISMATCH" }
```

---

## Phase 4: Documentation

- [ ] Work plan updated with vv1.18.21 corrective release state
- [ ] CHANGELOG.md reflects released version
- [ ] Corrective release docs committed (`RELEASE_NOTES`, `GITHUB_RELEASE`, `RELEASE_MANIFEST`, `DEPLOYMENT_CHECKLIST`)
