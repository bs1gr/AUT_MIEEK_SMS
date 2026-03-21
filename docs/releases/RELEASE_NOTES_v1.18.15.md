# Release Notes - v1.18.15

**Version**: 1.18.15  
**Release Date**: 2026-03-21  
**Type**: Maintenance / Hardening Patch  
**Branch**: `main`  
**Status**: ✅ PREPARED — Installer built, signed, and validated

---

## Summary

v1.18.15 is a maintenance patch that packages the installer/QNAP hardening fixes, RBAC permissions-table guardrail, Trivy CI pin, and validation tooling improvements accumulated since the v1.18.14 release. No breaking changes — this is a drop-in upgrade from v1.18.14.

---

## What's New

### Installer & QNAP Hardening

- **SQLite / QNAP DB selection**: Added explicit SQLite database selection and QNAP deployment path support in the installer startup logic, preventing silent fallback to wrong database engine on NAS deployments.
- **Forward declaration fix**: Added missing forward declaration for database profile defaults, eliminating startup ordering errors in single-mode configurations.
- **PostgreSQL auth-drift recovery**: Installer now detects and recovers from PostgreSQL authentication drift during single-mode startup, preventing silent connection failures after OS reboots or credential rotation.

### CI / Security

- **Trivy action version pin**: Updated `trivy-action` from unpinned `0.20.0` to `v0.35.0` to resolve unresolvable-tag failures in the security-scanning workflow.

### RBAC

- **User permissions table guardrail**: The RBAC subsystem now ensures the `user_permissions` table exists before attempting permission lookups, preventing startup errors on fresh installations or after schema resets.

### Validation Tooling

- **Installer tooling hardening**: Batch retest infrastructure and installer input validation hardened to reduce false negatives from intermittent timing issues.

### Repository Cleanup

- **Gitignore dedup**: Root-level `DOCUMENTATION_INDEX.md` duplicate is now ignored via `.gitignore`, preventing redundant file tracking.

---

## Files Changed (since v1.18.14)

**Backend:**
- `backend/rbac.py` — user permissions table existence guard

**Installer / Scripts:**
- `installer/SMS_Installer.iss` — SQLite/QNAP db selection, profile defaults, auth drift recovery
- `INSTALLER_BUILDER.ps1` — version bump to 1.18.15; tooling hardening

**CI:**
- `.github/workflows/trivy-scan.yml` — trivy-action pin to v0.35.0

**Documentation / Config:**
- `VERSION` → `v1.18.15`
- `frontend/package.json` → `1.18.15`
- `backend/main.py` — version docstring
- `CHANGELOG.md` — new [1.18.15] section
- `docs/DOCUMENTATION_INDEX.md`, `DOCUMENTATION_INDEX.md` — version fields
- `docs/user/USER_GUIDE_COMPLETE.md`, `docs/development/DEVELOPER_GUIDE_COMPLETE.md` — version refs
- `installer/installer_welcome_el.rtf`, `installer/installer_complete_el.rtf` — regenerated
- `.gitignore` — ignore root DOCUMENTATION_INDEX.md duplicate

---

## Installer Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.15.exe` |
| **Size** | ~27 MB |
| **SHA256** | `E7428BC4CD1924FB912DE59E0056D9109673572667B13C7849C8E5455BEA80CE` |
| **Signature** | Valid |
| **Signer** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Build** | Inno Setup + Authenticode (DigiCert live timestamp) |
| **Smoke test** | Passed |

> **Note**: SHA256 may differ from GitHub release digest due to DigiCert live timestamping. The GitHub release asset digest is the authoritative post-upload hash.

---

## Validation Evidence

- ✅ `scripts/VERIFY_VERSION.ps1 -CheckOnly` — 8/8 required checks passed
- ✅ Installer build + smoke test passed
- ✅ Backend Ruff (linting) — clean
- ✅ Backend MyPy (type checking) — clean
- ✅ Frontend ESLint — clean
- ✅ Markdown lint — clean
- ✅ TypeScript — clean
- ✅ Translation integrity — verified
- ✅ Backend pytest — 102 test files, all passing (after root DOCUMENTATION_INDEX.md fix)
- ✅ Frontend Vitest — passed

---

## Upgrade Notes

- Drop-in upgrade from v1.18.14. No migration steps required.
- If upgrading a QNAP/NAS deployment: the new installer SQLite/QNAP detection path activates automatically.
- PostgreSQL auth-drift recovery is passive — no action needed unless connection failures were occurring.

---

## Previous Release

- [v1.18.14 Release Notes](RELEASE_NOTES_v1.18.14.md)
