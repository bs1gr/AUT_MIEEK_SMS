# Deployment Checklist - Version 1.18.12

**Release Date**: March 10, 2026
**Tag**: v1.18.12
**Previous Tag**: v1.18.11
**Previous Live Release**: v1.18.9

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [ ] `VERSION` file reads `v1.18.12`
- [ ] `frontend/package.json` version is `1.18.12`
- [ ] `backend/main.py` version header is `1.18.12`
- [ ] `INSTALLER_BUILDER.ps1` version reference is `1.18.12`
- [ ] `CHANGELOG.md` contains `[1.18.12] - 2026-03-10` section

### 1.2 Code Quality
- [ ] `scripts/VERIFY_VERSION.ps1 -CheckOnly` — success
- [ ] `COMMIT_READY.ps1 -Quick -Snapshot` — success

### 1.3 Local Artifact Verification
- [ ] Local installer build completed for `SMS_Installer_1.18.12.exe`
- [ ] Authenticode signing verified (`AUT MIEEK`)
- [ ] Installer smoke validation passed

### 1.4 Git State
- [ ] `git status` — clean working tree before tag creation
- [ ] All corrective release prep changes committed and pushed to `origin/main`
- [ ] Unrelated workflow/doc-policy edits remain excluded or separately managed

---

## Phase 2: Tag & Release

### 2.1 Create Tag
```powershell
git tag -a v1.18.12 -m "v1.18.12: corrective release for installer pipeline and path hardening"
git push origin v1.18.12
```

### 2.2 Monitor Workflows
- [ ] `Create GitHub Release on tag` — SUCCESS
- [ ] `Release - Build & Upload Installer with SHA256` — SUCCESS
- [ ] `Release Asset Sanitizer` — SUCCESS

### 2.3 Verify Release Page
- [ ] Release page exists at: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.12`
- [ ] Release body populated from `GITHUB_RELEASE_v1.18.12.md`
- [ ] Not marked as draft

---

## Phase 3: Artifact Verification

### 3.1 Installer Assets
- [ ] `SMS_Installer_1.18.12.exe` present in release assets
- [ ] No extra release assets present beyond installer allowlist
- [ ] GitHub release digest metadata displayed for the installer asset

### 3.2 Signature Verification
```powershell
$sig = Get-AuthenticodeSignature "SMS_Installer_1.18.12.exe"
$sig.Status
$sig.SignerCertificate.Subject
```

### 3.3 Digest Verification
```powershell
$hash = (Get-FileHash "SMS_Installer_1.18.12.exe" -Algorithm SHA256).Hash
# Compare the local SHA256 above with the digest shown on the GitHub release asset
```

---

## Phase 4: Documentation

- [ ] Work plan updated with `v1.18.12` publication status
- [ ] `CHANGELOG.md` reflects released version
- [ ] Release docs committed (`RELEASE_NOTES`, `GITHUB_RELEASE`, `RELEASE_MANIFEST`, `DEPLOYMENT_CHECKLIST`)
- [ ] `.github/RELEASE_NOTES_v1.18.12.md` present for workflow consumption
