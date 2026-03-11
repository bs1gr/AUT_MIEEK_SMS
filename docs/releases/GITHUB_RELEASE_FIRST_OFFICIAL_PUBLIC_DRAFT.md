# First Official Public Release - Draft Metadata & Release Body

**Status**: Draft template prepared on 2026-03-11
**Purpose**: Reusable release metadata/body template for the first official public release
**Current Release Posture**: All existing `v1.18.x` releases are archived as prereleases

---

## Metadata Checklist

Replace the placeholders below only after the owner selects the official public version.

- **Tag**: `<vNEXT>`
- **Release Title**: `<vNEXT> - First Official Public Release`
- **Release Type**: Official Public Release
- **Target Branch**: `main`
- **Baseline Candidate**: `v1.18.12`
- **Previous Published Prerelease Reference**: `v1.18.12`
- **Asset Policy**: Installer-only (`SMS_Installer_<version>.exe`)
- **Digest Source**: GitHub release asset digest metadata

## Required Evidence Before Publication

- `VERSION` file updated to the chosen public tag
- `frontend/package.json` updated to the chosen public version
- `scripts/VERIFY_VERSION.ps1 -CheckOnly` passes
- `COMMIT_READY.ps1 -Quick -Snapshot` passes
- Scope-appropriate backend/frontend tests pass with output reviewed
- Local installer build, signing, and smoke verification pass
- Archived prerelease state remains intact for historical tags

---

## Draft GitHub Release Body

## 🎉 First Official Public Release: `<vNEXT>`

This release is the **first official public release** of the Student Management System.

All earlier `v1.18.x` GitHub releases were retained as **archived prereleases** to preserve the historical corrective and candidate lineage while keeping this publication as the first intentionally designated public release.

### ✅ Public Release Baseline

- Built from the corrected current lineage on `main`
- Based on the verified `v1.18.12` candidate scope, plus any explicitly approved final adjustments
- Publishes only installer allowlisted assets for release consistency

### 🔒 Stability & Release Integrity

- Installer release path validated on corrected lineage
- Release assets constrained to installer-only policy
- GitHub digest metadata used as the authoritative SHA256 source
- Historical prerelease lineage retained for audit/reference

### ✅ Validation

- Version consistency verification passed
- Pre-commit quick snapshot passed
- Scope-appropriate automated tests passed
- Local installer build, signing, and smoke validation passed

### 📦 Installation

- **Windows**: Download `SMS_Installer_<version>.exe` from the release assets
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`

### 📝 Replace Before Publishing

Update these placeholders before use:

- `<vNEXT>`
- `<version>`
- candidate-scope wording if additional fixes are included
- validation bullets with exact evidence
