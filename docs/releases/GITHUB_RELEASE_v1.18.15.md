## v1.18.15 — Maintenance & Hardening Patch

**Release Date**: March 21, 2026  
**Type**: Maintenance patch  
**Installer**: `SMS_Installer_1.18.15.exe`

---

### What's Changed

This maintenance release packages installer/QNAP hardening, RBAC guardrails, Trivy CI fixes, and validation tooling improvements accumulated since v1.18.14.

#### Installer & QNAP Fixes

- **SQLite / QNAP DB selection** — explicit database engine selection during installer startup; prevents silent fallback to wrong engine on NAS deployments
- **Forward declaration fix** — missing forward declaration for DB profile defaults resolved; eliminates startup ordering errors in single-mode configs
- **PostgreSQL auth-drift recovery** — installer now detects and recovers from PostgreSQL auth drift during single-mode startup

#### CI / Security

- **Trivy action pin** — updated `trivy-action` from `0.20.0` to `v0.35.0` to resolve unresolvable-tag CI failures in security scanning

#### RBAC

- **User permissions table guardrail** — ensures `user_permissions` table exists before permission lookups; prevents startup errors on fresh installs / schema resets

#### Validation & Cleanup

- Installer tooling and batch retest hardening
- Root-level `DOCUMENTATION_INDEX.md` duplicate now ignored via `.gitignore`

---

### Installer

| Property | Value |
|---|---|
| File | `SMS_Installer_1.18.15.exe` |
| SHA256 | `E7428BC4CD1924FB912DE59E0056D9109673572667B13C7849C8E5455BEA80CE` (local build; see GitHub digest for post-upload authoritative hash) |
| Signature | Valid — `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |

> **Upgrade**: Drop-in from v1.18.14. No migration steps required.

---

### Full Changelog

See [RELEASE_NOTES_v1.18.15.md](../../docs/releases/RELEASE_NOTES_v1.18.15.md) for complete details.

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.14...v1.18.15
