## What's New in vvv1.18.22

### Highlights

- Hardened custom reports pipeline (group-by/GPA support, data loading, export fixes)
- Improved native startup reliability (fallback/proxy port routing and health-based startup guard behavior)
- Tightened backup path and metadata security handling
- Strengthened QNAP PostgreSQL-only deployment scripts and guidance
- Consolidated frontend test runner workflows (`RUN_FRONTEND_TESTS.ps1`)

### Scope

- Baseline: `vvv1.18.22..HEAD`
- 34 commits reviewed
- 192 files changed

### Installation

Windows installer asset: `SMS_Installer_1.18.13.exe`

Docker update path: `./DOCKER.ps1 -Update`

Native development path: `./NATIVE.ps1 -Start`

### Documentation

- `CHANGELOG.md`
- `docs/releases/RELEASE_NOTES_vvv1.18.22.md`
- `docs/releases/RELEASE_MANIFEST_vvv1.18.22.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_vvv1.18.22.md`
