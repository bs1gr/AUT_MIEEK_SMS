## What's New in v1.18.11

### 🔧 Corrective Release Build Fix

- Fixed the GitHub release installer workflow to use tracked Greek `.rtf` installer info files.
- Eliminated the CI compile failure that left `v1.18.10` without uploaded installer assets.
- Preserved the installer/runtime behavior introduced in the prior profile-drift patch scope.

### ✅ Validation

- Verified the root cause from GitHub Actions failure logs
- Rebuilt, signed, and smoke-tested the installer locally after the fix
- Prepared a clean corrective patch release path for installer asset publication

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.11.exe` from release assets.
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`
