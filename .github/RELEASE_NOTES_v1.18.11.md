## What's New in v1.18.11

### 🔧 Corrective Release Build Fix

- Fixed the GitHub release installer workflow to use tracked Greek `.rtf` installer info files.
- Eliminated the CI compile failure that left `v1.18.10` without uploaded installer assets.
- Preserved the installer/runtime behavior introduced in the prior profile-drift patch scope.

### ✅ Validation

- Verified root cause from GitHub Actions failure logs
- Rebuilt, signed, and smoke-tested the installer locally after the fix
- Prepared corrective version metadata for `v1.18.11`
