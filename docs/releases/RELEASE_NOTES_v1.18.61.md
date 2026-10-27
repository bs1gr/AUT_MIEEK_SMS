# Release Notes - Version 1.18.61

**Release Date**: 2026-10-27
**Previous Version**: v1.18.60

## 🐛 Bug Fixes

- **android**: exports never downloaded in the Android app. Every export (PDF/Excel/CSV reports, student performance report, custom reports, analytics export, session JSON, calendar ICS/CSV, semester archive, backup downloads — 12 call sites) used `URL.createObjectURL` plus an `<a download>` click, which Android's WebView silently drops. On a native platform the app now writes the file to its cache with `@capacitor/filesystem` and opens the Android share sheet with `@capacitor/share` (open in a viewer, Print, save to Drive/Files, send). A dismissed sheet resolves normally; other share failures propagate to the caller's existing error handling. Web behaviour is unchanged. This had been broken since the Android app existed; it is not a v1.18.60 regression.

## 📱 Android

- New Capacitor plugins: `@capacitor/filesystem` 8.1.5 and `@capacitor/share` 8.0.3 (registered in `capacitor.settings.gradle` / `capacitor.build.gradle`).

## 🛠️ Build System

- **release**: `RELEASE_READY.ps1` now runs `INSTALLER_BUILDER.ps1 -Action test` (Authenticode signature Valid + version resource) right after the installer build and fails the release on a non-zero exit. Phase 2 of the documented release workflow had been silently skipped on every scripted release.

## ✅ Verification

- Backend `RUN_TESTS_BATCH` (via `COMMIT_READY -Quick`): 27/27 batches, 1247 passed.
- Frontend: Vitest, ESLint and `tsc` clean. New unit tests for the download helper cover web, native, dismissed and failed share.
- Android export verified on the `sms_smoke_36` emulator (Android 16, SDK 36): Export Center > Students List > Export to PDF writes `cache/students.pdf` (valid 1-page PDF) and opens the chooser.

---

### 📊 Statistics

- **Total Commits**: 2 (plus the release commit)
- **Contributors**: 2
