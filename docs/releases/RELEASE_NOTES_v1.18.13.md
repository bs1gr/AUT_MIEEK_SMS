# Release Notes - Version 1.18.13

**Status**: Release preparation in progress
**Release Date (target)**: 2026-03-17
**Previous Version**: vv1.18.21
**Scope Baseline**: `vv1.18.21..HEAD`

---

## Scope Summary

- **Commits reviewed**: 34
- **Files changed**: 192
- **Diff footprint**: 6057 insertions / 5620 deletions
- **Code-heavy touchpoints**: backend (15 files), frontend (17 files)

---

## Included Changes

### Reports & exports hardening
- Added grouped custom-report support (including GPA-related grouping fields/labels)
- Fixed empty-cell report data pipeline behavior
- Expanded nested data loading for course breakdown reporting
- Improved PDF/CSV export behavior including course notes coverage
- Aligned report payload typing and test expectations (mypy + CSV header assertions)

### Native/runtime reliability
- Hardened fallback-port and proxy-port routing logic in native startup flows
- Reduced false startup-block conditions when backend health is already valid

### Security & path handling
- Tightened backup path containment checks
- Reduced sensitive backup metadata exposure in operational flows

### QNAP PostgreSQL-only deployment
- Strengthened preflight validation in QNAP install/manage scripts
- Hardened backup handling and aligned env/docs guidance to canonical PostgreSQL path

### Tooling and script consolidation
- Added canonical frontend test wrapper: `RUN_FRONTEND_TESTS.ps1`
- Archived duplicate wrappers and obsolete one-off scripts

---

## Verification Status (pre-release)

- [x] Release scope reviewed against `vv1.18.21..HEAD`
- [x] Version metadata aligned to `vv1.18.21` (`VERSION`, `frontend/package.json`, doc indexes, key script headers)
- [x] Release-note artifacts generated for vv1.18.21
- [x] `scripts/VERIFY_VERSION.ps1 -CheckOnly` passed
- [x] `COMMIT_READY.ps1 -Quick -Snapshot` passed (`artifacts/state/STATE_2026-03-17_095642.md`)
- [x] Scope-appropriate validation completed (`RUN_TESTS_BATCH.ps1`: 21/21 batches passed; frontend quick Vitest pass in COMMIT_READY)
- [x] Installer build/sign/smoke validation passed for `SMS_Installer_1.18.13.exe`
  - Signature: `Valid` (`CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`)
  - SHA256: `E1D41BC9C25E1D4B0DABC53B25F25D83381604BD8576660645DA1E71B148D872`
- [ ] Tag creation and release workflow execution
