# Deployment Checklist - Version 1.18.12

**Release Date**: March 10, 2026
**Official Public Release Designation**: March 11, 2026
**Tag**: vv1.18.21
**Previous Tag**: vv1.18.21
**Previous Archived Prerelease Reference**: vv1.18.21

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [x] `VERSION` file reads `vv1.18.21`
- [x] `frontend/package.json` version is `1.18.12`
- [x] `backend/main.py` version header is `1.18.12`
- [x] `INSTALLER_BUILDER.ps1` version reference is `1.18.12`
- [x] `CHANGELOG.md` contains `[1.18.12] - 2026-03-10` section

### 1.2 Code Quality
- [x] `scripts/VERIFY_VERSION.ps1 -CheckOnly` — success
- [x] `COMMIT_READY.ps1 -Quick -Snapshot` — success

### 1.3 Local Artifact Verification
- [x] Local installer build completed for `SMS_Installer_1.18.12.exe`
- [x] Authenticode signing verified (`AUT MIEEK`)
- [x] Installer smoke validation passed

### 1.4 Git State
- [x] `git status` — clean working tree before tag creation
- [x] All corrective release prep changes committed and pushed to `origin/main`
- [x] Unrelated workflow/doc-policy edits remained excluded or separately managed during release prep

---

## Phase 2: Tag & Release

### 2.1 Create Tag
```powershell
git tag -a vv1.18.21 -m "vv1.18.21: corrective release for installer pipeline and path hardening"
git push origin vv1.18.21
```

Completed on the original release date; the same tag was later promoted to the first official public release without minting a new version.

### 2.2 Monitor Workflows
- [x] `Create GitHub Release on tag` — SUCCESS
- [x] `Release - Build & Upload Installer with SHA256` — SUCCESS
- [x] `Release Asset Sanitizer` — SUCCESS

### 2.3 Verify Release Page
- [x] Release page exists at: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vv1.18.21`
- [x] Release body was later replaced with the first official public release body during publication-state promotion
- [x] Not marked as draft
- [x] Marked latest/non-prerelease as the first official public release

---

## Phase 3: Artifact Verification

### 3.1 Installer Assets
- [x] `SMS_Installer_1.18.12.exe` present in release assets
- [x] No extra release assets present beyond installer allowlist
- [x] GitHub release digest metadata displayed for the installer asset

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

- [x] Work plan updated with `vv1.18.21` publication status
- [x] `CHANGELOG.md` reflects released version
- [x] Release docs committed (`RELEASE_NOTES`, `GITHUB_RELEASE`, `RELEASE_MANIFEST`, `DEPLOYMENT_CHECKLIST`)
- [x] `.github/RELEASE_NOTES_vv1.18.21.md` present for workflow consumption

## Phase 5: Official Public Release Promotion

- [x] Existing `vv1.18.21` GitHub release promoted from prerelease to latest/non-prerelease
- [x] Archived banner removed from `vv1.18.21` release body
- [x] Official public release body applied
- [x] `vv1.18.21` through `vv1.18.21` remained archived as prereleases
