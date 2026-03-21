## v1.18.15 — Maintenance & Hardening Patch

**Release Date**: March 21, 2026  
**Type**: Maintenance patch — installer/QNAP hardening, RBAC guardrail, Trivy CI pin

### What's Changed

- **Installer/QNAP**: SQLite/QNAP DB selection, forward declaration fix, PostgreSQL auth-drift recovery
- **CI**: Trivy action pinned to `v0.35.0` (resolves unresolvable-tag scan errors)
- **RBAC**: `user_permissions` table existence guardrail
- **Tooling**: Installer validation and batch retest hardening
- **Cleanup**: Root DOCUMENTATION_INDEX.md duplicate ignored via `.gitignore`

### Installer

| Property | Value |
|---|---|
| File | `SMS_Installer_1.18.15.exe` |
| SHA256 | `E7428BC4CD1924FB912DE59E0056D9109673572667B13C7849C8E5455BEA80CE` |
| Signature | Valid — `CN=AUT MIEEK` |

Drop-in upgrade from v1.18.14. No migration required.

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.14...v1.18.15
