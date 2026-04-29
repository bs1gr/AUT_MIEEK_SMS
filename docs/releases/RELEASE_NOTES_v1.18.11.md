# Release Notes - Version 1.18.11

**Release Date**: 2026-03-09
**Previous Version**: vv1.18.21
**Release Type**: Patch Release

## Summary

Version 1.18.11 is a corrective patch release for the `vv1.18.21` publication path. The application/runtime behavior remains aligned with the installer profile-drift fixes shipped in `vv1.18.21`; this patch specifically fixes the GitHub release installer workflow so the Windows installer and checksum assets can be built and published successfully from CI.

## 🔧 Release Build Correction

- Updated `installer/SMS_Installer.iss` to use tracked Greek `.rtf` info files instead of ignored local `.txt` copies.
- Removed the CI-only installer compilation failure that blocked asset upload for `vv1.18.21`.
- Preserved the existing installer runtime behavior introduced in the previous patch release scope.

## ✅ Verification Scope

- Verified the `vv1.18.21` release page existed but had no uploaded installer assets.
- Inspected failed GitHub Actions logs and isolated the exact missing-file cause in the installer workflow.
- Rebuilt the installer locally after the `.rtf` fix.
- Confirmed local compile, Authenticode signing, and smoke-test success for `SMS_Installer_1.18.10.exe` prior to corrective version bump.

## Commits in Scope

- corrective installer asset publication fix in `installer/SMS_Installer.iss`
- `vv1.18.21` version metadata and release documentation alignment
