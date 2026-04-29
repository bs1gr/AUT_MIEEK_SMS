# Release Notes - Version 1.18.7

**Release Date**: March 5, 2026
**Release Type**: Feature Release
**Focus**: Control Panel Auto-Updater, Offline Sync, Health Diagnostics, and Infrastructure Hardening

---

## 🎉 Overview

Version 1.18.7 delivers three major feature additions and significant infrastructure hardening since the vv1.18.21 analytics release. Key additions include an in-app auto-update system with SHA256 verification, offline queue support for attendance/grades/student edits, and enhanced health diagnostics with remote PostgreSQL evidence.

**Key Highlights**:
- ✅ **Auto-Updater System**: In-app update checking, download, verification, and installer launch
- ✅ **Offline Sync Queues**: Queue attendance, grades, and student updates for automatic reconnect sync
- ✅ **Health Diagnostics**: Surface remote DB evidence and correct PostgreSQL diagnostics
- ✅ **QNAP ARMv7 Support**: Postgres-only deployment artifacts for ARM-based NAS devices
- ✅ **Windows Subprocess Stability**: Fixed `0xc0000142` crashes across all control panel modules
- ✅ **CI/CD Hardening**: Normalize-version policy gate enforced across all workflows
- ✅ **18 commits**, multiple new test suites, complete bilingual i18n
- ✅ **Version format compliance**: VERSION file now uses `v1.x.x` format per Policy 2

---

## 🚀 New Features

### Control Panel Auto-Updater

**In-App Update System** (`5dd528648`):
- Auto-update job system with threaded download, SHA256 verification, and installer launch
- Separate Check and Update buttons — Update disabled until an update is detected
- Release channel support (stable / preview) via `release_channel` field
- Notification bell integration: update-available badge via localStorage + CustomEvent bridge
- Update-available card in NotificationDropdown with version display and navigate-to-update action
- Backend: `AutoUpdateRequest`, `AutoUpdateStatusResponse`, `_run_auto_update_job`, `_launch_installer`
- Frontend: Expanded `UpdatesPanel.tsx` (346+ lines), bilingual translations (22 keys EN/EL)
- Tests: `test_control_maintenance.py` (118 lines)

**Files**: 21 changed, 1,375 insertions

### Offline Sync Queues

**Automatic Reconnect Sync** (`5710829bb`):
- Queue attendance records during network outages for automatic sync on reconnect
- Queue grade submissions with retry logic and conflict detection
- Queue student profile updates with offline storage
- Three dedicated queue modules:
  - `offlineAttendanceQueue.ts` (87 lines) with test suite (67 lines)
  - `offlineGradesQueue.ts` (76 lines) with test suite (46 lines)
  - `offlineStudentUpdateQueue.ts` (74 lines) with test suite (33 lines)
- Enhanced `useStudentsQuery.ts` hook with offline queue integration (101+ lines)
- Bilingual translations for offline sync status (EN/EL)

**Files**: 14 changed, 937 insertions

### Health Diagnostics Enhancement

**Remote DB Evidence** (`1bf53438f`):
- Surface remote PostgreSQL connection evidence in `/health` endpoint
- Correct PostgreSQL diagnostics (distinguish local vs remote DB)
- Frontend `ServerControl` component enhanced with DB evidence display
- New bilingual control panel translations for health diagnostics
- Tests: `test_control_endpoints.py` (37 lines), `test_health.py` updates

**Files**: 8 changed, 198 insertions

### QNAP ARMv7 Deployment

**Postgres-Only Deployment** (`6fcfe5220`):
- `docker-compose.qnap.postgres-only.yml` — ARMv7-optimized compose file
- `install-qnap-postgres-only.sh` — Automated installation script
- `manage-qnap-postgres-only.sh` — Lifecycle management script
- `.env.qnap.postgres-only.example` — Example environment configuration

**Files**: 5 new files, 319 insertions

---

## 🐛 Bug Fixes

### Windows Subprocess Stability (Critical)
- **Fixed `docker.exe 0xc0000142` crash** (`5dd528648`): Replaced `CREATE_NO_WINDOW` with `STARTUPINFO(dwFlags=STARTF_USESHOWWINDOW, wShowWindow=SW_HIDE)` across all control panel modules
- Added `_hidden_window_kwargs()` helper for safe subprocess creation on Windows
- Added passive binary probe functions to avoid launching external binaries on status calls

### Runtime Fixes
- **Removed `gh` CLI subprocess** (`050e15fd9`): Eliminated external binary dependency from maintenance router
- **Fixed ErrorBoundary i18n namespace** (`050e15fd9`): Corrected translation namespace resolution
- **Fixed AttendanceView TDZ** (`050e15fd9`): Resolved temporal dead zone caused by variable initialization order
- **Fixed OpenAPI callable schema** (`1012e8817`): Resolved schema generation issues for auth and analytics endpoints
- **Fixed `auth_mode` type narrowing** (`050e15fd9`): Corrected type handling in maintenance router

### Type Safety
- **MyPy fixes** (`c32a38390`): Resolved type mismatches in analytics export service, courses router, and path validation

### Testing
- **Stabilized Vitest execution** (`9a9f087ab`): Fixed dashboard mocks and AnalyticsDashboard test isolation
- **Fixed COMMIT_READY.ps1**: Improved Vitest subprocess handling and timeout management

---

## 🔧 CI/CD Improvements

- **Normalize-version policy gate** (`acd759c1a`): Mandatory composite action enforced across all 6 workflows
- **VERSION format compliance** (`70df1b563`): Added `v` prefix to VERSION file per Policy 2
- **Release ownership hardening** (`3dd667ba5`): Removed duplicate create-release job from docker-publish; hardened CI gating
- **Installer workflow fix** (`eafea850b`): Inlined version normalization to prevent format mismatches
- **Version tooling hardened**: `VERIFY_VERSION.ps1`, `GENERATE_VERSION_REPORT.ps1`, `fix_version_discrepancies.ps1` updated

---

## 🎨 UI Improvements

- **UpdatesPanel styling** (`714efc9ba`): Improved button contrast (gray → indigo), up-to-date card gradient styling, release info fallback display

---

## 🌐 Internationalization

- Bilingual (EN/EL) keys for updater UI and notification bell update alerts
- Offline sync status translations for attendance and grades
- Health diagnostic translations for control panel

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Commits since vv1.18.21 | 18 |
| Files changed | 80+ |
| Lines added | 4,500+ |
| New features | 4 (auto-updater, offline sync, health diagnostics, QNAP ARMv7) |
| Bug fixes | 9 |
| CI/CD improvements | 5 |
| New test files | 6 |
| Translation keys added | 50+ |

---

## ⬆️ Upgrade Instructions

### From vv1.18.21

1. Pull latest code: `git pull origin main`
2. Rebuild Docker: `.\DOCKER.ps1 -Update`
3. Or restart native: `.\NATIVE.ps1 -Stop; .\NATIVE.ps1 -Start`
4. Verify: Check `/health` endpoint returns `200`

### Breaking Changes

None. This is a backward-compatible feature release.

---

## 📋 Full Commit Log

```
714efc9ba style(control-panel): improve UpdatesPanel button contrast and release info fallback
050e15fd9 fix(runtime): remove gh CLI subprocess, fix ErrorBoundary i18n, fix AttendanceView TDZ
b43a085e8 docs: update CHANGELOG and work plan with post-vv1.18.21 development history
5dd528648 feat(control-panel): add auto-updater, fix Windows subprocess crashes, notification bell
5710829bb feat(offline): queue attendance, grades, and student updates for reconnect sync
1bf53438f fix(health): surface remote DB evidence and correct postgres diagnostics
4475b11fe docs(release): update vv1.18.21 release and deployment documentation
6fcfe5220 feat(qnap): add postgres-only ARMv7 deployment artifacts
abe06e4ae docs(release): update vv1.18.21 post-release verification status
eafea850b fix(release): inline version normalization in installer workflow
9a9f087ab fix(tests): stabilize vitest execution and dashboard mocks
1012e8817 fix(backend): resolve OpenAPI callable schema and version consistency tests
acd759c1a ci(version): enforce normalize-version policy gate
70df1b563 fix(version): add v prefix to VERSION file to comply with Policy 2
69314a7e3 docs(work-plan): update status for type-fix and CI/CD hardening completion
3dd667ba5 ci(workflows): harden release ownership and ci gating
c32a38390 fix(types): resolve mypy mismatches in analytics, courses, path validation
bb57c51c2 feat(release): add vv1.18.21 verification script and update work plan
```
