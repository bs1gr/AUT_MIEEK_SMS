## What's New in vv1.18.21

### 🔧 Corrective Release Cleanup

- Publishes the next clean corrective patch after `vv1.18.21` and `vv1.18.21` were archived as prereleases.
- Restores generated Greek `.rtf` installer assets in the release pipeline.
- Fixes installer validation to use the wizard image version cache and keeps generated installer inputs guarded.

### 🔒 Security Hardening

- Hardens maintenance/update path handling against uncontrolled path input.
- Hardens backup file resolution and restore path validation.
- Keeps updater metadata compatible with installer-only GitHub releases that rely on GitHub digest metadata.

### ✅ Validation

- Focused backend verification passed (`20 passed`).
- `COMMIT_READY.ps1 -Quick -Snapshot` passed.
- Fresh local installer build, signing, and smoke verification passed for `SMS_Installer_1.18.12.exe`.

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.12.exe` from the release assets.
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`
