## What's New in vv1.18.21

### 🔧 Installer Upgrade Reliability

- Fixed installer upgrade profile drift so existing PostgreSQL deployments are preserved during upgrades.
- Prevented silent fallback from remote PostgreSQL to local SQLite on unattended/repair upgrade paths.
- Refreshed installer metadata and release prep for the corrected installer lineage.

### 🐳 Environment Handling

- `DOCKER.ps1` now infers valid remote profile settings from existing `DATABASE_ENGINE` / `DATABASE_URL` values.
- Added `scripts/ops/REPAIR_LAPTOP_ENV_PROFILE.ps1` for recovery of affected laptop environments.

### 🧹 Maintenance

- Archived deprecated scripts and historical lint report artifacts.
- Added test runner guidance and workspace-cleanup documentation.
- Normalized release-note and CSV formatting drift after `vv1.18.21`.

### ✅ Validation Snapshot

- Post-release scope from `vv1.18.21..HEAD` reviewed
- Confirmed prior installer rebuild commit was outside `vv1.18.21` tag lineage
- Version metadata prepared for `vv1.18.21`

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.10.exe` from release assets.
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`
