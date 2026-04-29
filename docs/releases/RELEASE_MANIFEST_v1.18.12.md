# Release Manifest - Version 1.18.12

**Release Date**: March 10, 2026
**Official Public Release Designation**: March 11, 2026
**Tag**: vv1.18.21
**Branch**: main
**Previous Tag**: vv1.18.21
**Previous Archived Prerelease Reference**: vv1.18.21

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.12.exe` | Windows installer (Inno Setup) |

### Asset Allowlist (Installer-only policy)

Only the following asset is permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`

GitHub release digest metadata is the authoritative SHA256 source for this release line. A downloadable `.sha256` sidecar is no longer required.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `vv1.18.21` |
| `frontend/package.json` | `"version": "1.18.12"` |
| `backend/main.py` | `Version: 1.18.12` |
| `INSTALLER_BUILDER.ps1` | `Version: 1.18.12` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.12` |
| `CHANGELOG.md` | `[1.18.12]` entry present |

---

## 📋 Commit Range

**Base Tag**: vv1.18.21
**Head Commit**: `a2da597da` (`main`)
**Official Release Context**: `vv1.18.21` is now the live/latest first official public release.

### Commit Categories

| Category | Count | Scope |
|----------|-------|-------|
| Corrective Release Prep | 1 | verified `vv1.18.21` release packaging |
| Release Guardrails | 2 | installer tracked-input guardrails + release documentation |
| Release State Recording | 1 | publication, archival cleanup, and official-release promotion |

---

## ✅ Validation Gates

### Pre-Release Checks

- [ ] `VERSION` file contains `vv1.18.21`
- [ ] `frontend/package.json` version is `1.18.12`
- [ ] `backend/main.py` version header is `1.18.12`
- [ ] `INSTALLER_BUILDER.ps1` version header is `1.18.12`
- [ ] `CHANGELOG.md` has `[1.18.12]` section
- [ ] `git status` is clean before tag creation
- [ ] `scripts/VERIFY_VERSION.ps1 -CheckOnly` passes
- [ ] `COMMIT_READY.ps1 -Quick -Snapshot` passes
- [ ] Local installer build/sign/smoke verification completed for `SMS_Installer_1.18.12.exe`

### Post-Release Checks

- [ ] GitHub Release page published at `/releases/tag/vv1.18.21`
- [ ] GitHub release marked latest/non-prerelease
- [ ] `Create GitHub Release on tag` workflow succeeds
- [ ] `Release - Build & Upload Installer with SHA256` workflow succeeds
- [ ] `Release Asset Sanitizer` workflow succeeds
- [ ] `SMS_Installer_1.18.12.exe` present in release assets
- [ ] No non-allowlisted assets present on the release
- [ ] GitHub digest metadata shown for the installer asset
- [ ] Downloaded installer signature is valid (`AUT MIEEK` certificate)
