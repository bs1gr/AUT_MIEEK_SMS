# Deployment Checklist - Version 1.18.14

**Release Date (target)**: March 19, 2026
**Tag**: v1.18.14
**Previous Tag**: v1.18.13

---

## Phase 1: Pre-Release Validation

### 1.1 Version Consistency
- [x] `VERSION` file reads `v1.18.14`
- [x] `frontend/package.json` version is `1.18.14`
- [x] `backend/main.py` version header is `1.18.14`
- [x] `INSTALLER_BUILDER.ps1` version reference is `1.18.14`
- [x] `docs/DOCUMENTATION_INDEX.md` references documented version `1.18.14`

### 1.2 Release Documentation
- [x] `docs/releases/RELEASE_NOTES_v1.18.14.md` prepared
- [x] `docs/releases/GITHUB_RELEASE_v1.18.14.md` prepared
- [x] `.github/RELEASE_NOTES_v1.18.14.md` prepared
- [x] `docs/releases/RELEASE_MANIFEST_v1.18.14.md` prepared
- [x] This checklist prepared

### 1.3 Quality Gates
- [x] Backend focused security tests passed (`25 passed`)
- [x] Backend batch validation passed (`34/34 batches`)
- [x] Frontend full Vitest passed (`112 files`, `1900 tests`)
- [x] `npm audit` reports `0` vulnerabilities
- [x] `pip_audit` reports no known vulnerabilities in the verified environment
- [x] State snapshot recorded (`artifacts/state/STATE_2026-03-19_204251.md`)

### 1.4 Local Artifact Verification
- [x] Local installer build completed for `SMS_Installer_1.18.14.exe`
- [x] Authenticode signing verified (`AUT MIEEK`)
- [x] Installer smoke validation passed
- [x] Local SHA256 captured for release record

**Installer-first evidence:**
- Path: `dist/SMS_Installer_1.18.14.exe`
- Signature status: `Valid`
- Signer: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
- SHA256: `78B10CA0D5A4F9E8C2A46C29ADBC4210BF66C275165E0678DC44CA55C898E9D6`

---

## Phase 2: Tag & Release

### 2.1 Create Tag
- [ ] Create tag `v1.18.14`
- [ ] Push tag to `origin`

### 2.2 Monitor Workflows
- [ ] `Create GitHub Release on tag` — success
- [ ] `Release - Build & Upload Installer with SHA256` — success
- [ ] `Release Asset Sanitizer` — success

### 2.3 Verify Release Page
- [ ] Release page exists at `/releases/tag/v1.18.14`
- [ ] Release is non-draft and intended publication state is correct

---

## Phase 3: Artifact Verification

### 3.1 Installer Assets
- [ ] `SMS_Installer_1.18.14.exe` present in release assets
- [ ] No non-allowlisted assets present
- [ ] GitHub digest metadata visible for installer asset

### 3.2 Signature Verification
- [ ] Downloaded installer signature status is `Valid`
- [ ] Signer certificate subject matches `AUT MIEEK`

### 3.3 Digest Verification
- [ ] Local SHA256 hash matches release digest metadata

---

## Phase 4: Post-Release Documentation

- [ ] `CHANGELOG.md` released-state review completed for `1.18.14`
- [ ] `docs/plans/UNIFIED_WORK_PLAN.md` release status updated
- [ ] `docs/DOCUMENTATION_INDEX.md` publication-state references reviewed
