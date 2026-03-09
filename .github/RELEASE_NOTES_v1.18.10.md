## What's New in v1.18.10

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
- Normalized release-note and CSV formatting drift after `v1.18.9`.

### ✅ Validation

- Reviewed commit scope from `v1.18.9..HEAD`
- Confirmed installer rebuild commit was outside prior release tag lineage
- Prepared version metadata for `v1.18.10`
