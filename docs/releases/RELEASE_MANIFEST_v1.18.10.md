# Release Manifest - Version 1.18.10

**Release Date**: March 9, 2026
**Tag**: vv1.18.21
**Branch**: main
**Previous Release**: vv1.18.21 (March 9, 2026)

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.10.exe` | Windows installer (Inno Setup) |
| Checksum | `SMS_Installer_1.18.10.exe.sha256` | SHA256 hash sidecar |

### Asset Allowlist (Policy 9)

Only the following assets are permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`
- `SMS_Installer_<version>.exe.sha256`

The release-asset-sanitizer workflow enforces this policy automatically.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `vv1.18.21` |
| `frontend/package.json` | `"version": "1.18.10"` |
| `backend/main.py` | `Version: 1.18.10` |
| `INSTALLER_BUILDER.ps1` | `Version: 1.18.10` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.10` |

---

## 📋 Commit Range

**Base**: vv1.18.21 (`42230fe78`)
**Head**: vv1.18.21 release prep (`main` HEAD at release cut)
**Total Commits**: 5 post-release commits + version/release prep

### Commit Categories

| Category | Count | Scope |
|----------|-------|-------|
| Installer / Runtime Fixes | 2 | profile-drift prevention, env repair helper |
| Documentation | 2 | test runners guide, workspace cleanup summary |
| Maintenance / Cleanup | 1 | archived deprecated scripts and lint reports |
| Formatting | 1 | release notes and CSV newline normalization |
| Release Prep | 1 | version bump and release docs |

---

## ✅ Validation Gates

### Pre-Release Checks

- [ ] `VERSION` file contains `vv1.18.21`
- [ ] `frontend/package.json` version is `1.18.10`
- [ ] `backend/main.py` version header is `1.18.10`
- [ ] `CHANGELOG.md` has `[1.18.10]` section
- [ ] `git status` is clean before tag creation
- [ ] Version verification script passes
- [ ] COMMIT_READY quick validation passes

### Post-Release Checks

- [ ] GitHub Release page published at `/releases/tag/vv1.18.21`
- [ ] Installer workflow completed successfully
- [ ] Release-asset-sanitizer workflow passed
- [ ] `SMS_Installer_1.18.10.exe` present in release assets
- [ ] `SMS_Installer_1.18.10.exe.sha256` present in release assets
- [ ] SHA256 checksum matches downloaded installer
- [ ] Authenticode signature valid (AUT MIEEK certificate)

---

## 🔄 Workflow Chain

1. **Create GitHub Release on tag** (`release-on-tag.yml`) — Creates release page
2. **Build & Upload Installer with SHA256** (`release-installer-with-sha.yml`) — Builds, signs, uploads
3. **Release Asset Sanitizer** (`release-asset-sanitizer.yml`) — Enforces installer-only policy

---

## 📊 Impact Summary

| Metric | Value |
|--------|-------|
| Files changed since `vv1.18.21` | 15+ |
| Release-scope commits | 5 |
| Runtime fixes | 2 |
| New recovery scripts | 1 |
| New release docs | 4 |
| Breaking changes | 0 |
