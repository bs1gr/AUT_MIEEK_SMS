# SMS $11.12.2 Release Notes

**Release Version**: 1.12.2  
**Release Date**: December 13, 2025  
**Status**: ✅ Production Ready  
**Previous**: $11.12.2 (December 12, 2025)

---

## 🎯 Overview

$11.12.2 is a focused patch release that hardens the release automation pipeline and keeps the bilingual installer assets perfectly in sync with every build. The update makes the Greek-language installer regeneration fully deterministic in CI, removes a Windows-only tooling dependency that previously broke `npm ci` on Linux/macOS runners, and refreshes the localized installer assets for this release.

---

## 🔄 Pipeline & Tooling Improvements

- **CI/CD Linting Workflow**: `.github/workflows/ci-cd-pipeline.yml` now runs `fix_greek_encoding_permanent.py` before ESLint so that CP1253 installer text files are regenerated during every automated lint run. This prevents stale encoding artifacts from leaking into commits or causing lint noise.
- **Commit-Ready Smoke Tests**: `commit-ready-smoke.yml` executes the same encoding script with `DEV_EASE=1`, ensuring the quick smoke path matches the release pipeline’s behaviour.
- **Cross-Platform Frontend Installs**: Removed the `@rollup/rollup-win32-x64-msvc` dev dependency from `frontend/package.json`, allowing `npm ci` to succeed on Ubuntu and macOS runners without optional binary downloads.

---

## 🎨 Installer Asset Refresh

- Re-generated `installer_welcome_el.txt`, `installer_complete_el.txt`, and the wizard imagery via `fix_greek_encoding_permanent.py` so Greek-language screens display correct version metadata and fonts in the bundled installer.
- Regeneration occurs automatically during CI and release builds, eliminating the need for manual encoding adjustments.

---

## ✅ Validation Summary

| Check | Result |
|-------|--------|
| COMMIT_READY quick (-SkipTests -SkipCleanup) | ✅ Pass |
| ESLint (`npm run lint`) | ✅ Warnings only (expected, no regressions) |
| TypeScript (`npx tsc --noEmit`) | ✅ Pass |
| `npm ci` (frontend) | ✅ Pass on Windows & Linux |

---

## 🚀 Upgrade Instructions

Follow the standard deployment flow:

### Docker
```powershell
./DOCKER.ps1 -Stop
./DOCKER.ps1 -Update
./DOCKER.ps1 -Start
```

### Native
```powershell
./NATIVE.ps1 -Stop
./NATIVE.ps1 -Setup
./NATIVE.ps1 -Start
```

No manual database migrations or environment changes are required. The release is fully backward compatible.

---

## 🔍 Verification Tips

- To manually confirm the installer localization step, run `python fix_greek_encoding_permanent.py` from the repository root and verify that `installer/installer_welcome_el.txt` and `installer/installer_complete_el.txt` update their timestamps.
- The automated workflows handle this conversion every time they run, so no further action is needed unless you edit the Greek text templates.

---

**Prepared by**: GitHub Copilot Automation Team  
**Last Updated**: 2025-12-13

