# Release Notes - Version 1.18.12

**Release Date**: 2026-03-10
**Official Public Release Designation**: 2026-03-11
**Previous Tag**: vv1.18.21
**Previous Archived Prerelease Reference**: vv1.18.21
**Release Type**: Corrective Patch Release → First Official Public Release

## Summary

Version 1.18.12 is the clean corrective release after the exact-tag cleanup that archived `vv1.18.21` and `vv1.18.21` as prereleases. It restores a reliable installer publication path, hardens security-sensitive maintenance and backup path handling, and aligns update metadata with installer-only GitHub releases that rely on GitHub digest metadata instead of `.sha256` sidecars. On March 11, 2026, this exact verified tag was promoted to become the **first official public release**.

## 🔧 Installer Build & Release Corrections

- Restored generated Greek `.rtf` installer assets in the local and CI build pipeline.
- Reintroduced a root-level Greek RTF generator so installer pages stay version-aware and encoding-safe for Inno Setup.
- Updated the Greek encoding audit to validate generated `.rtf` assets rather than deleted legacy `.txt` files.
- Fixed installer builder validation to trust the wizard image `.version_cache` instead of stale timestamp heuristics.
- Kept installer release input validation aligned with generated assets and blocked local-only installer references before publication.
- Reused the verified `vv1.18.21` tag as the official public release without minting a new version.

## 🔒 Security Hardening

- Hardened backup filename/path resolution in `backend/services/database_manager.py`.
- Hardened maintenance job-id and status-path handling in `backend/routers/control/maintenance.py`.
- Updated the auto-update flow to use installer digest metadata from GitHub release assets without requiring downloadable checksum sidecars.
- Added focused regression coverage for maintenance path safety and database backup path traversal protections.

## ✅ Verification Scope

- Focused backend verification passed: `20 passed`
  - `backend/tests/test_control_maintenance.py`
  - `backend/tests/test_database_manager_security.py`
- `COMMIT_READY.ps1 -Quick -Snapshot` completed successfully.
- Fresh state snapshot recorded: `artifacts/state/STATE_2026-03-10_101933.md`
- Fresh local installer verification for `vv1.18.21` completed successfully:
  - local build produced `dist/SMS_Installer_1.18.12.exe`
  - Authenticode signing succeeded (`AUT MIEEK`)
  - installer smoke validation passed
- Existing GitHub release was later promoted from prerelease to latest/non-prerelease as the official public release.

## Commits in Scope

- `fix(release): prepare verified vv1.18.21 corrective candidate`
- `docs(release): record installer guardrails`
- `build(release): add installer tracked-input guardrails`
- `docs(release): record vv1.18.21 publication status`
- `docs(release): finalize vv1.18.21 official publication path`
- `docs(release): sync official vv1.18.21 publication state`
