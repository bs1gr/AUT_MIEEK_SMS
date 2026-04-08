## v1.18.17 - Remote PostgreSQL Recovery and Installer Hardening Patch

**Release Date**: April 8, 2026
**Type**: Maintenance patch
**Installer**: `SMS_Installer_1.18.17.exe`

---

### What's Changed

- **Docker single-image recovery** now detects stale remote PostgreSQL runtime drift and recreates the running `sms-app` container when the active remote profile no longer matches the intended environment.
- **Remote-mode cleanup** removes obsolete bundled-postgres containers, empty legacy volumes, and stale network resources when QNAP/remote PostgreSQL is the active deployment path.
- **Installer/database packaging** now excludes local DB artifacts from release payloads, requires complete remote credentials, supports more credential-key aliases, preserves `sslmode`, and distinguishes auth failures from TCP connectivity failures during setup.
- **Frontend dependencies** were refreshed for the current Dependabot window: Vite `7.3.2` and the patched lodash override are now in the release tree.

### Installer

| Property | Value |
|---|---|
| File | `SMS_Installer_1.18.17.exe` |
| Local SHA256 | `D181AD51D75CD7618E0B4CDD7C38EBB59C773C00B6182F8EBCA5A4D9E3E59E68` |
| Signature | Valid - `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |

> **Upgrade**: Drop-in from `v1.18.16`. No migration steps are required.

### More Details

- Release notes: https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/releases/RELEASE_NOTES_v1.18.17.md
- Full changelog: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.16...v1.18.17
