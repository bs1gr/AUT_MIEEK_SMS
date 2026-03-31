# Release Notes - v1.18.16

**Version**: 1.18.16
**Release Date**: 2026-03-31
**Type**: Maintenance / Security / Installer Alignment Patch
**Branch**: `main`
**Status**: ✅ PREPARED - locally validated, commit gate passed, awaiting tag push and publication

---

## Summary

v1.18.16 packages the QNAP/PostgreSQL defaulting work, closes the installer credential-file parsing gap for `.env` and `.txt` inputs, records the latest dependency security updates, and keeps the reduced CI cadence introduced during this release window. No breaking changes are intended; this is a drop-in upgrade from v1.18.15.

---

## What's New

### Installer & QNAP Alignment

- **Fresh-install default profile**: new installer flows now default to the shared QNAP PostgreSQL profile, while keeping local SQLite available as the explicit fallback path.
- **Credential-file parity**: `.json`, `.env`, and `.txt` credential imports are now described consistently in the installer, and `.env` / `.txt` files accept both flat keys (`host`, `port`, `dbname`, `user`, `password`, `sslmode`) and `POSTGRES_*` keys.
- **Bilingual copy alignment**: English and Greek installer text now match the actual supported credential-file formats and recovery guidance.

### Security & Dependencies

- **Python crypto stack**: updated `cryptography` to `46.0.6`.
- **Frontend serialization dependency**: updated `serialize-javascript` to `7.0.5`.

### CI / Release Operations

- **Release sanitizer cadence**: `release-asset-sanitizer` now runs daily instead of hourly.
- **Manual-only scheduled workflows**: production health-check and load-testing workflows remain manual-dispatch only for this release line.

### Documentation & Runbooks

- **User guide rendering fix**: the Database Configuration guidance in the user guide now renders as normal prose instead of inside a stray fenced block.
- **QNAP deployment guidance**: centralized PostgreSQL and reconciliation runbooks are now documented alongside the installer guidance.

### Release Hygiene

- **Repository cleanup**: removed tracked run-log artifacts from the release tree before tagging:
  - `ci_pipeline_23534452328.log`
  - `docs_audit_23534452333.log`
  - `sanitizer_23534806307.log`

---

## Files Changed (release prep highlights)

**Installer / Scripts:**
- `installer/SMS_Installer.iss` - credential-file parsing parity for `.env` / `.txt`; copy updates
- `installer/Greek.isl` - Greek copy alignment for `.json` / `.env` / `.txt`
- `INSTALLER_BUILDER.ps1` - version bump to 1.18.16
- `installer/installer_welcome_el.rtf`, `installer/installer_complete_el.rtf` - regenerated for 1.18.16

**Versioning / Metadata:**
- `VERSION` -> `v1.18.16`
- `frontend/package.json` -> `1.18.16`
- `frontend/package-lock.json` - lockfile refreshed
- `backend/main.py` - version docstring
- `CHANGELOG.md` - new `[1.18.16]` section

**Documentation / Plans:**
- `docs/plans/UNIFIED_WORK_PLAN.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/user/USER_GUIDE_COMPLETE.md`
- `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- `docs/releases/*v1.18.16*`
- `.github/RELEASE_NOTES_v1.18.16.md`

---

## Installer Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.16.exe` |
| **Size** | 27,568,856 bytes (~26.29 MB) |
| **SHA256 (local build)** | `6FA36356C80A69BB1E43A11851B0E2EEFB9B31AA0726C7C5493E3A9FE13A12C4` |
| **Signature** | Valid |
| **Signer** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Build** | Inno Setup + Authenticode (DigiCert live timestamp) |
| **Smoke test** | Passed |

> **Note**: SHA256 may differ from the GitHub release digest after CI upload because live timestamping produces a distinct signed binary. The GitHub release asset digest is the authoritative post-upload hash.

---

## Validation Evidence

- ✅ `scripts/VERIFY_VERSION.ps1 -CheckOnly` - passed
- ✅ `COMMIT_READY.ps1 -Quick -Snapshot` - passed (`artifacts/state/STATE_2026-03-31_145504.md`)
- ✅ Backend batch validation - `21/21` batches passed during commit gate (`backend/test-results/backend_batch_run_20260331_145047.txt`)
- ✅ Frontend production build - passed
- ✅ Frontend Vitest - `112` files / `1900` tests passed
- ✅ Native development smoke - backend `/health` returned HTTP 200 and frontend returned HTTP 200 after `.\NATIVE.ps1 -Start`
- ✅ Docker production smoke - `.\DOCKER.ps1 -Start` returned healthy container state and `/health` returned HTTP 200
- ✅ Installer build - `dist/SMS_Installer_1.18.16.exe` built successfully
- ✅ Authenticode signature - `Valid`
- ✅ Installer smoke test - passed

---

## Upgrade Notes

- Drop-in upgrade from v1.18.15. No database migration is required for this release.
- QNAP / PostgreSQL deployments can continue using centralized credential files; `.env` and `.txt` inputs now accept either flat keys or `POSTGRES_*` keys.
- Fresh installer flows now prefer the shared QNAP PostgreSQL profile; local SQLite remains available as the explicit fallback path.

---

## Previous Release

- [v1.18.15 Release Notes](RELEASE_NOTES_v1.18.15.md)
