# Release Manifest - Version 1.18.7

**Release Date**: March 5, 2026
**Tag**: v1.18.7
**Branch**: main
**Previous Release**: v1.18.6 (March 2, 2026)

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.7.exe` | Windows installer (Inno Setup) |
| Checksum | `SMS_Installer_1.18.7.exe.sha256` | SHA256 hash sidecar |

### Asset Allowlist (Policy 9)

Only the following assets are permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`
- `SMS_Installer_<version>.exe.sha256`

The release-asset-sanitizer workflow enforces this policy automatically.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `v1.18.7` |
| `frontend/package.json` | `"version": "1.18.7"` |
| `backend/main.py` | `Version: 1.18.7` |
| `COMMIT_READY.ps1` | `Version: v1.18.7` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.7` |

---

## 📋 Commit Range

**Base**: v1.18.6 (`e1d83fe2a`)
**Head**: v1.18.7 (current `main` HEAD)
**Total Commits**: 18

### Commit Categories

| Category | Count | Scope |
|----------|-------|-------|
| Features | 4 | auto-updater, offline sync, health diagnostics, QNAP ARMv7 |
| Bug Fixes | 9 | subprocess, runtime, OpenAPI, types, tests |
| CI/CD | 5 | version normalization, release hardening |
| Documentation | 5 | release docs, work plan, QNAP guide |
| Style | 1 | UpdatesPanel UI polish |

---

## ✅ Validation Gates

### Pre-Release Checks

- [ ] `VERSION` file contains `v1.18.7`
- [ ] `frontend/package.json` version is `1.18.7`
- [ ] `backend/main.py` version header is `1.18.7`
- [ ] `CHANGELOG.md` has `[1.18.7]` section
- [ ] `git status` is clean
- [ ] ESLint: 0 errors
- [ ] Ruff: 0 errors

### Post-Release Checks

- [ ] GitHub Release page published at `/releases/tag/v1.18.7`
- [ ] Installer workflow completed successfully
- [ ] Release-asset-sanitizer workflow passed
- [ ] `SMS_Installer_1.18.7.exe` present in release assets
- [ ] `SMS_Installer_1.18.7.exe.sha256` present in release assets
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
| Files changed | 80+ |
| Lines added | 4,500+ |
| New features | 4 |
| Bug fixes | 9 |
| CI/CD improvements | 5 |
| New test files | 6 |
| Translation keys added | 50+ |
| Breaking changes | 0 |
