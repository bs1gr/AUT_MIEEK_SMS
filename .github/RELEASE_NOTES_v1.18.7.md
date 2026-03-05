## 🚀 Control Panel Auto-Updater, Offline Sync & Infrastructure Hardening - v1.18.7

**Release Date**: March 5, 2026

Version 1.18.7 delivers an in-app auto-update system, offline sync queues for attendance/grades/student data, enhanced health diagnostics, and QNAP ARMv7 deployment support. It also includes critical Windows subprocess stability fixes and CI/CD hardening.

---

## ✨ Highlights

- ✅ **In-App Auto-Updater**: Check, download, verify (SHA256), and launch updates from the control panel
- ✅ **Offline Sync Queues**: Queue data during network outages, auto-sync on reconnect
- ✅ **Health Diagnostics**: Surface remote PostgreSQL connection evidence
- ✅ **QNAP ARMv7**: Postgres-only deployment artifacts for ARM-based NAS
- ✅ **Windows Stability**: Fixed `0xc0000142` subprocess crashes
- ✅ **CI/CD Hardening**: Normalize-version policy gate across all workflows
- ✅ **18 commits**, 80+ files, 4,500+ lines added

---

## 🚀 Key Features

### Control Panel Auto-Updater
- In-app update checking with stable/preview release channels
- Threaded download with SHA256 verification
- Automatic installer launch after verification
- Notification bell integration — update-available badge
- Update card in notification dropdown with version display

### Offline Sync Queues
- Queue attendance records during network outages
- Queue grade submissions with retry and conflict detection
- Queue student profile updates with offline storage
- Automatic sync on network reconnection
- Dedicated queue modules with full test coverage

### Health Diagnostics Enhancement
- Remote PostgreSQL connection evidence in `/health` endpoint
- Corrected local vs remote DB diagnostics
- Frontend ServerControl component with DB evidence display

### QNAP ARMv7 Deployment
- Postgres-only Docker Compose for ARMv7 NAS devices
- Automated install and lifecycle management scripts
- Example environment configuration

---

## 🐛 Bug Fixes

- **Windows subprocess**: Fixed `docker.exe 0xc0000142` crash with safe `STARTUPINFO` approach
- **Runtime**: Removed `gh` CLI subprocess dependency from maintenance router
- **Runtime**: Fixed ErrorBoundary i18n namespace and AttendanceView temporal dead zone
- **Backend**: Resolved OpenAPI callable schema issues for auth/analytics endpoints
- **Types**: Fixed MyPy mismatches in analytics export, courses router, path validation
- **Tests**: Stabilized Vitest execution and dashboard mocks

## 🔧 CI/CD Improvements

- Normalize-version composite action enforced as policy gate across 6 workflows
- VERSION file format compliance (`v1.x.x` per Policy 2)
- Release ownership hardening — removed duplicate release jobs
- Installer workflow version normalization inlined

## 🎨 UI Improvements

- UpdatesPanel button contrast and up-to-date card gradient styling

## 🌐 Internationalization

- Bilingual (EN/EL) keys for updater UI, notification alerts, offline sync, health diagnostics

---

## ⬆️ Upgrade

```bash
git pull origin main
.\DOCKER.ps1 -Update      # Production
.\NATIVE.ps1 -Stop; .\NATIVE.ps1 -Start  # Development
```

No breaking changes.

---

**Full Changelog**: [v1.18.6...v1.18.7](https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.6...v1.18.7)
