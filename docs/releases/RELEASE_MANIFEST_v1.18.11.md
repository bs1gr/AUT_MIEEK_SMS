# Release Manifest - Version 1.18.11

**Release Date**: March 9, 2026
**Tag**: v1.18.11
**Branch**: main
**Previous Release**: v1.18.10 (release page published, installer assets missing)

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.11.exe` | Windows installer (Inno Setup) |
| Checksum | `SMS_Installer_1.18.11.exe.sha256` | SHA256 hash sidecar |

### Asset Allowlist (Policy 9)

Only the following assets are permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`
- `SMS_Installer_<version>.exe.sha256`

The release-asset-sanitizer workflow enforces this policy automatically.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `v1.18.11` |
| `frontend/package.json` | `"version": "1.18.11"` |
| `backend/main.py` | `Version: 1.18.11` |
| `INSTALLER_BUILDER.ps1` | `Version: 1.18.11` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.11` |

---

## 📋 Commit Range

**Base**: v1.18.10
**Head**: v1.18.11 corrective release prep (`main` HEAD at release cut)

### Commit Categories

| Category | Count | Scope |
|----------|-------|-------|
| Installer CI Fix | 1 | Greek tracked asset references for release builds |
| Release Prep | 1 | version bump and corrective release docs |

---

## ✅ Validation Gates

### Pre-Release Checks

- [ ] `VERSION` file contains `v1.18.11`
- [ ] `frontend/package.json` version is `1.18.11`
- [ ] `backend/main.py` version header is `1.18.11`
- [ ] `CHANGELOG.md` has `[1.18.11]` section
- [ ] `git status` is clean before tag creation
- [ ] Version verification script passes
- [ ] COMMIT_READY quick validation passes

### Post-Release Checks

- [ ] GitHub Release page published at `/releases/tag/v1.18.11`
- [ ] Installer workflow completed successfully
- [ ] Release-asset-sanitizer workflow passed
- [ ] `SMS_Installer_1.18.11.exe` present in release assets
- [ ] `SMS_Installer_1.18.11.exe.sha256` present in release assets
- [ ] SHA256 checksum matches downloaded installer
- [ ] Authenticode signature valid (AUT MIEEK certificate)
