# Release Notes - Version 1.18.12

**Release Date**: 2026-03-10
**Previous Tag**: v1.18.11
**Previous Live Release**: v1.18.9
**Release Type**: Corrective Patch Release

## Summary

Version 1.18.12 is the clean corrective release after the exact-tag cleanup that archived `v1.18.10` and `v1.18.11` as prereleases. This release restores a reliable installer publication path, hardens security-sensitive maintenance and backup path handling, and aligns update metadata with installer-only GitHub releases that rely on GitHub digest metadata instead of `.sha256` sidecars.

## 🔧 Installer Build & Release Corrections

- Restored generated Greek `.rtf` installer assets in the local and CI build pipeline.
- Reintroduced a root-level Greek RTF generator so installer pages stay version-aware and encoding-safe for Inno Setup.
- Updated the Greek encoding audit to validate generated `.rtf` assets rather than deleted legacy `.txt` files.
- Fixed installer builder validation to trust the wizard image `.version_cache` instead of stale timestamp heuristics.
- Kept installer release input validation aligned with generated assets and blocked local-only installer references before publication.

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
- Fresh local installer verification for `v1.18.12` completed successfully:
  - local build produced `dist/SMS_Installer_1.18.12.exe`
  - Authenticode signing succeeded (`AUT MIEEK`)
  - installer smoke validation passed

## Commits in Scope

- `fix(release): prepare verified v1.18.12 corrective candidate`
- `docs(release): record installer guardrails`
- `build(release): add installer tracked-input guardrails`
- `docs(release): record v1.18.11 publication status`
