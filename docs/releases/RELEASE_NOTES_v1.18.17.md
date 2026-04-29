# Release Notes - vv1.18.21

**Version**: 1.18.17
**Release Date**: 2026-04-08
**Type**: Maintenance / Runtime Recovery / Installer Hardening Patch
**Branch**: `main`
**Status**: ✅ PUBLISHED + VERIFIED

---

## Summary

vv1.18.21 packages the remote PostgreSQL runtime recovery work for Docker single-image deployments, hardens installer/database credential packaging so workstation-only database artifacts cannot leak into release payloads, and refreshes the frontend dependency baseline for the current Dependabot window. No breaking changes are intended; this is a drop-in upgrade from vv1.18.21.

---

## What's New

### Docker / Remote PostgreSQL Recovery

- **Single-image self-healing**: `DOCKER.ps1` now detects stale remote PostgreSQL runtime drift in single-image mode and recreates the running `sms-app` container when the active environment no longer matches the intended remote profile.
- **Remote-profile preservation**: remote PostgreSQL startup now keeps `SMS_DATABASE_PROFILE=remote`, `DATABASE_ENGINE=postgresql`, and an `sslmode`-aware `DATABASE_URL` aligned with the active environment values.
- **Obsolete bundled-postgres cleanup**: when remote QNAP PostgreSQL is active, the Docker flow removes leftover internal-postgres containers, empty legacy volumes, and stale single-image network resources that are no longer part of the chosen runtime.

### Installer / Database Packaging

- **Safer release payloads**: the installer now excludes local runtime/test database files, SQLite artifacts, and backup directories from packaged backend/docker payloads.
- **Stricter credential validation**: installer credential-file imports now require the full remote PostgreSQL tuple: `host`, `port`, `dbname`, `user`, and `password`.
- **Broader key compatibility**: credential parsing now accepts additional aliases such as `hostname`, `server`, `database`, `db`, `username`, `pass`, and matching `POSTGRES_*` keys.
- **Pre-install connectivity checks**: remote PostgreSQL validation now distinguishes authentication failures from TCP reachability failures and prompts with clearer guidance before continuing.
- **Saved runtime parity**: installer-generated `DATABASE_URL` values now persist `sslmode`, matching the runtime/authentication checks used during installation.

### Frontend Dependencies

- **Vite**: upgraded to `7.3.2`.
- **Lodash override**: added the Dependabot-driven override so the lockfile resolves to the patched lodash release line.

### Documentation / Release Hygiene

- **Post-release status cleanup**: closed the outstanding follow-up status note after `vv1.18.21` publication evidence landed.

---

## Files Changed (release scope highlights)

**Runtime / Docker**
- `DOCKER.ps1`

**Installer / Backend / Validation**
- `installer/SMS_Installer.iss`
- `installer/Greek.isl`
- `backend/routers/control/database.py`
- `backend/tests/test_control_database_credentials.py`
- `scripts/validate_installer_release_inputs.ps1`

**Frontend**
- `frontend/package.json`
- `frontend/package-lock.json`

---

## Installer Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.17.exe` |
| **Size** | `26,949,008` bytes (~25.70 MB) |
| **SHA256 (local build)** | `D181AD51D75CD7618E0B4CDD7C38EBB59C773C00B6182F8EBCA5A4D9E3E59E68` |
| **Signature** | Valid |
| **Signer** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Signer Thumbprint** | `2693C1B15C8A8E5E45614308489DC6F4268B075D` |
| **Smoke test** | Passed |
| **GitHub asset digest** | `sha256:71c15e3bdc910f379b23bc73cb67aeec1f6a8efaebad98f85e47910676d8481a` |

> **Note**: GitHub release digest metadata becomes the authoritative post-publication hash after the installer upload workflow completes.

---

## Local Verification Evidence

- ✅ Version alignment updated to `vv1.18.21` across canonical files (`VERSION`, `frontend/package.json`, `frontend/package-lock.json`, `backend/main.py`, docs indexes/guides, installer builder header)
- ✅ Installer build completed locally via `.\INSTALLER_BUILDER.ps1 -Action build -Version 1.18.17 -AutoFix`
- ✅ Authenticode signature verified as `Valid`
- ✅ Installer smoke test passed
- ✅ Native development smoke passed: backend `/health` returned HTTP 200 on port `8000` and frontend returned HTTP 200 on port `5173`
- ✅ Docker production smoke passed via `.\DOCKER.ps1 -Start`: container became healthy and `/health` returned HTTP 200 on port `8080`
- ✅ `COMMIT_READY.ps1 -Quick -Snapshot` passed (`artifacts/state/STATE_2026-04-08_175612.md`)
- ✅ Backend batch validation passed (`21/21` batches; `backend/test-results/backend_batch_run_20260408_175209.txt`)
- ✅ GitHub release workflow succeeded (`24142472615`)
- ✅ GitHub installer upload workflow succeeded (`24142499707`)
- ✅ Downloaded published installer hash matched the GitHub digest and signature verified as `Valid`

---

## Upgrade Notes

- Drop-in upgrade from `vv1.18.21`. No database migration is required for this release.
- Remote QNAP PostgreSQL installs should retain the shared-database profile more reliably during single-image restarts and updates.
- Installer credential files may continue using `.json`, `.env`, or `.txt`; remote setup now rejects incomplete credentials earlier and preserves the selected `sslmode`.

---

## Compare Link

- **Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/vv1.18.21...vv1.18.21
