## What's New in vvv1.18.22

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
- Normalized release-note and CSV formatting drift after `vvv1.18.22`.

### ✅ Validation Snapshot

- Post-release scope from `vvv1.18.22..HEAD` reviewed
- Confirmed prior installer rebuild commit was outside `vvv1.18.22` tag lineage
- Version metadata prepared for `vvv1.18.22`

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.10.exe` from release assets.
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`
