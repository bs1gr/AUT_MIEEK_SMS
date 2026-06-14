# Release Notes - Version 1.18.27

**Release Date**: 2026-06-14
**Previous Version**: v1.18.26
**Installer**: SMS_Installer_1.18.27.exe (24.97 MB)
**GitHub Release**: [v1.18.27](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.27)

---

## Summary

Maintenance release focused entirely on the CI/CD installer pipeline. All five stale
post-flatten paths in the release workflows were corrected, a fail-fast version
consistency gate was added to all three installer workflows, and a new
`scripts/bump-version.ps1` script was introduced for atomic version management.

---

## 🐛 Bug Fixes

### CI/CD — Installer Pipeline

- correct installer output path in verify step: `infra\installer\dist\` not root `dist\` [ad4717bd]
- update stale pre-flatten paths in installer workflows (spec + INSTALLER_BUILDER.ps1) [89151b643]
- correct stale path `backend/requirements.txt` → `src/backend/requirements.txt` in release workflow [b232579d]
- fix VERIFY_VERSION.ps1 `-Update` mode writing v-prefixed version string into package.json [9e531ed]
- fix `foreach ($error in ...)` shadowing PowerShell built-in `$error` variable in VERIFY_VERSION.ps1 [9e531ed]

---

## ✨ New

### scripts/bump-version.ps1

Atomic version bump utility — updates all version-bearing files in a single command
and self-verifies via `VERIFY_VERSION.ps1 -CIMode`:

```powershell
.\scripts\bump-version.ps1 -Version 1.18.28
git add -A
git commit -m "chore: bump version to v1.18.28"
git push
# wait for CI green, then:
git tag v1.18.28 && git push origin v1.18.28
```

Files updated atomically: `VERSION`, `src/backend/main.py`,
`src/frontend/package.json`, `src/frontend/package-lock.json`,
`docs/DOCUMENTATION_INDEX.md`, `docs/user/USER_GUIDE_COMPLETE.md`,
`docs/development/DEVELOPER_GUIDE_COMPLETE.md`.

### Fail-fast version gates in all three installer workflows

Each of `.github/workflows/release-on-tag.yml`,
`release-installer-with-sha.yml`, and `installer.yml` now runs
`VERIFY_VERSION.ps1 -CIMode` as **step 2** (immediately after checkout),
blocking the 10–15 min install/build chain if version files are inconsistent.

---

## 🧹 Chores

- bump version to v1.18.27 (via bump-version.ps1) [834bc780]
- sync version to 1.18.26 across all version-bearing files [9e531ed]

---

## Post-flatten path mapping (reference)

| Artifact | Correct post-flatten path |
|---|---|
| Backend requirements | `src/backend/requirements.txt` |
| PyInstaller spec | `src/backend/lite_entrypoint.spec` |
| INSTALLER_BUILDER script | `infra/scripts/release/INSTALLER_BUILDER.ps1` |
| SMS_Lite.exe (PyInstaller output) | `dist/SMS_Lite.exe` (repo root) |
| Final installer output | `infra/installer/dist/SMS_Installer_X.Y.Z.exe` |

---

### 📊 Statistics

- **Total Commits**: 5
- **Files Changed**: 12
- **Contributors**: 1 (Vasilis + Claude Sonnet 4.6)
