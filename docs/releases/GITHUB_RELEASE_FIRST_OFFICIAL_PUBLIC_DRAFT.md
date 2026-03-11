# First Official Public Release - v1.18.12 Draft Metadata & Release Body

**Status**: Executed publication draft on 2026-03-11
**Purpose**: Recorded release metadata/body source used to designate `v1.18.12` as the first official public release
**Current Release Posture**: `v1.18.12` is latest/official; earlier `v1.18.x` releases remain archived as prereleases

---

## Metadata Checklist

This path reuses the already-verified `v1.18.12` tag instead of minting a new version.

- **Tag**: `v1.18.12`
- **Release Title**: `v1.18.12 - First Official Public Release`
- **Release Type**: Official Public Release
- **Target Branch**: `main`
- **Baseline Candidate**: `v1.18.12`
- **Previous Published Prerelease Reference**: `v1.18.12`
- **Asset Policy**: Installer-only (`SMS_Installer_1.18.12.exe`)
- **Digest Source**: GitHub release asset digest metadata
- **Publication Action**: Completed — existing GitHub release for `v1.18.12` promoted from prerelease → official/latest

## Required Evidence Before Publication

- `VERSION` file remains `v1.18.12`
- `frontend/package.json` remains `1.18.12`
- `scripts/VERIFY_VERSION.ps1 -CheckOnly` passes
- `COMMIT_READY.ps1 -Quick -Snapshot` passes
- Scope-appropriate backend/frontend tests pass with output reviewed
- Local installer build, signing, and smoke verification pass
- Archived prerelease state remains intact for historical tags
- Release body was updated to remove the archival banner from `v1.18.12`
- GitHub release is now marked latest/non-prerelease

## Verified Evidence Already Recorded

- Focused backend verification passed: `20 passed`
  - `backend/tests/test_control_maintenance.py`
  - `backend/tests/test_database_manager_security.py`
- `COMMIT_READY.ps1 -Quick -Snapshot` passed
- Fresh state snapshot recorded: `artifacts/state/STATE_2026-03-10_101933.md`
- Additional verification snapshot recorded: `artifacts/state/STATE_2026-03-11_231419.md`
- Local installer verification passed for `v1.18.12`
  - built artifact: `dist/SMS_Installer_1.18.12.exe`
  - Authenticode signing succeeded (`AUT MIEEK`)
  - installer smoke validation passed
- GitHub installer asset digest metadata:
  - `sha256:5a6e9a5ec5380ed5884ec6e455ba09156d2382282918c8ba10801e8b4d2b1fb1`

---

## Draft GitHub Release Body

## 🎉 First Official Public Release: `v1.18.12`

This release is the **first official public release** of the Student Management System.

All earlier `v1.18.x` GitHub releases were retained as **archived prereleases** to preserve the historical corrective and candidate lineage while keeping this publication as the first intentionally designated public release.

### ✅ Public Release Baseline

- Built from the corrected current lineage on `main`
- Uses the exact verified `v1.18.12` candidate scope without introducing a new tag/version
- Publishes only installer allowlisted assets for release consistency

### 🔒 Stability & Release Integrity

- Installer release path validated on corrected lineage
- Release assets constrained to installer-only policy
- GitHub digest metadata used as the authoritative SHA256 source
- Historical prerelease lineage retained for audit/reference

### ✅ Validation

- Version consistency verification passed
- Pre-commit quick snapshot passed
- Focused backend verification passed (`20 passed`)
- Local installer build, signing, and smoke validation passed
- Installer asset digest metadata verified on GitHub

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.12.exe` from the release assets
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`

### ✅ Publication Execution Record

Executed release-state changes:

- removed the `ARCHIVED` banner from the `v1.18.12` GitHub release body
- replaced the prerelease notes with the official public release body
- marked `v1.18.12` as non-prerelease/latest
- left `v1.18.0` through `v1.18.11` archived as prereleases
