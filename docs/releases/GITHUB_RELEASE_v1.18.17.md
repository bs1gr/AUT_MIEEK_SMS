## vv1.18.21 - Remote PostgreSQL Recovery and Installer Hardening Patch

**Release Date**: April 8, 2026
**Type**: Maintenance patch
**Installer**: `SMS_Installer_1.18.17.exe`

---

### What's Changed

This maintenance release strengthens two operational paths that matter most for deployments:

- **Docker single-image recovery** now detects stale remote PostgreSQL runtime drift, recreates the running `sms-app` container when needed, and cleans obsolete bundled-postgres resources that should not remain in remote QNAP mode.
- **Installer/database packaging** now excludes workstation-only database artifacts from release payloads, requires a complete remote credential set, accepts additional key aliases, preserves `sslmode`, and gives clearer auth vs TCP validation prompts during remote setup.
- **Frontend dependency refresh** upgrades Vite to `7.3.2` and adds the patched lodash override required by the current Dependabot window.

### Installer

| Property | Value |
|---|---|
| File | `SMS_Installer_1.18.17.exe` |
| Local SHA256 | `D181AD51D75CD7618E0B4CDD7C38EBB59C773C00B6182F8EBCA5A4D9E3E59E68` |
| Signature | Valid - `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| GitHub digest | `sha256:71c15e3bdc910f379b23bc73cb67aeec1f6a8efaebad98f85e47910676d8481a` |

> **Upgrade**: Drop-in from `vv1.18.21`. No database migration steps are required.

### Validation

- Local installer build, signature verification, and smoke test passed
- Native smoke passed (`8000` backend / `5173` frontend)
- Docker smoke passed (`sms-app` healthy and `/health` HTTP 200 on `8080`)
- GitHub release workflow `24142472615` and installer workflow `24142499707` both completed successfully

### Full Changelog

- Release notes: https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/releases/RELEASE_NOTES_vv1.18.21.md
- Compare: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/vv1.18.21...vv1.18.21
