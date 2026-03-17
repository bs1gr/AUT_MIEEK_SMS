# Deployment Checklist - Version 1.18.13

**Release Date (target)**: March 17, 2026
**Tag**: v1.18.13
**Previous Tag**: v1.18.12

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [x] `VERSION` file reads `v1.18.13`
- [x] `frontend/package.json` version is `1.18.13`
- [x] `backend/main.py` version header is `1.18.13`
- [x] `INSTALLER_BUILDER.ps1` version reference is `1.18.13`
- [x] `docs/DOCUMENTATION_INDEX.md` references documented version `1.18.13`

### 1.2 Release Documentation
- [x] `docs/releases/RELEASE_NOTES_v1.18.13.md` prepared
- [x] `docs/releases/GITHUB_RELEASE_v1.18.13.md` prepared
- [x] `.github/RELEASE_NOTES_v1.18.13.md` prepared
- [x] `docs/releases/RELEASE_MANIFEST_v1.18.13.md` prepared
- [x] This checklist prepared

### 1.3 Quality Gates
- [x] `scripts/VERIFY_VERSION.ps1 -CheckOnly` — pass
- [x] `COMMIT_READY.ps1 -Quick -Snapshot` — pass (`artifacts/state/STATE_2026-03-17_095642.md`)
- [x] Scope-appropriate tests executed and output reviewed (`RUN_TESTS_BATCH.ps1`: 21/21 batches passed; frontend quick Vitest pass)

### 1.4 Local Artifact Verification
- [x] Local installer build completed for `SMS_Installer_1.18.13.exe`
- [x] Authenticode signing verified (`AUT MIEEK`)
- [x] Installer smoke validation passed
- [x] Local SHA256 recorded: `E1D41BC9C25E1D4B0DABC53B25F25D83381604BD8576660645DA1E71B148D872`

---

## Phase 2: Tag & Release

### 2.1 Create Tag
- [ ] Create tag `v1.18.13`
- [ ] Push tag to `origin`

### 2.2 Monitor Workflows
- [ ] `Create GitHub Release on tag` — success
- [ ] `Release - Build & Upload Installer with SHA256` — success
- [ ] `Release Asset Sanitizer` — success

### 2.3 Verify Release Page
- [ ] Release page exists at `/releases/tag/v1.18.13`
- [ ] Release is non-draft and intended publication state is correct

---

## Phase 3: Artifact Verification

### 3.1 Installer Assets
- [ ] `SMS_Installer_1.18.13.exe` present in release assets
- [ ] No non-allowlisted assets present
- [ ] GitHub digest metadata visible for installer asset

### 3.2 Signature Verification
- [ ] Downloaded installer signature status is `Valid`
- [ ] Signer certificate subject matches `AUT MIEEK`

### 3.3 Digest Verification
- [ ] Local SHA256 hash matches release digest metadata

---

## Phase 4: Post-Release Documentation

- [ ] `CHANGELOG.md` updated for released `1.18.13`
- [ ] `docs/plans/UNIFIED_WORK_PLAN.md` release status updated
- [ ] `docs/DOCUMENTATION_INDEX.md` publication state reviewed
