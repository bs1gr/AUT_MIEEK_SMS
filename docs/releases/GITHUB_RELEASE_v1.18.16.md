## v1.18.16 - Maintenance, Security, and Installer Alignment Patch

**Release Date**: March 31, 2026
**Type**: Maintenance patch
**Installer**: `SMS_Installer_1.18.16.exe`

---

### What's Changed

This maintenance release packages the QNAP/PostgreSQL installer defaults, fixes credential-file parsing parity for `.env` and `.txt` imports, records the latest dependency security updates, and keeps the reduced CI cadence for release operations.

#### Installer / QNAP

- **Fresh-install default** - installer now prefers the shared QNAP PostgreSQL profile for new deployments, with local SQLite retained as the explicit fallback path
- **Credential-file parity** - `.env` and `.txt` imports now accept both flat keys (`host`, `port`, `dbname`, `user`, `password`, `sslmode`) and `POSTGRES_*` keys
- **Bilingual copy alignment** - English and Greek installer text now consistently documents `.json`, `.env`, and `.txt` support

#### Security / Dependencies

- **Python** - `cryptography` updated to `46.0.6`
- **Frontend** - `serialize-javascript` updated to `7.0.5`

#### CI / Operations

- **Release sanitizer cadence** - reduced from hourly to daily
- **Scheduled production health-check and load-testing workflows** - remain manual-dispatch only

#### Documentation / Cleanup

- **User guide rendering fix** - Database Configuration section now renders as prose
- **Release hygiene** - removed tracked local run-log artifacts before tagging

---

### Installer

| Property | Value |
|---|---|
| File | `SMS_Installer_1.18.16.exe` |
| SHA256 | `6FA36356C80A69BB1E43A11851B0E2EEFB9B31AA0726C7C5493E3A9FE13A12C4` (local build; GitHub digest becomes authoritative after upload) |
| Signature | Valid - `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |

> **Upgrade**: Drop-in from v1.18.15. No migration steps required.

---

### Full Changelog

See [RELEASE_NOTES_v1.18.16.md](RELEASE_NOTES_v1.18.16.md) for complete details.

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.15...v1.18.16
