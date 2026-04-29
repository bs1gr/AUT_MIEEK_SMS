## What's New in vv1.18.21

### Highlights

- Hardened custom reports pipeline (group-by/GPA support, data loading, export fixes)
- Improved native startup reliability (fallback/proxy port routing and health-based startup guard behavior)
- Tightened backup path and metadata security handling
- Strengthened QNAP PostgreSQL-only deployment scripts and guidance
- Consolidated frontend test runner workflows (`RUN_FRONTEND_TESTS.ps1`)

### Scope

- Baseline: `vv1.18.21..HEAD`
- 34 commits reviewed
- 192 files changed

### Installation

Windows installer asset: `SMS_Installer_1.18.13.exe`

Docker update path: `./DOCKER.ps1 -Update`

Native development path: `./NATIVE.ps1 -Start`

### Documentation

- `CHANGELOG.md`
- `docs/releases/RELEASE_NOTES_vv1.18.21.md`
- `docs/releases/RELEASE_MANIFEST_vv1.18.21.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_vv1.18.21.md`
