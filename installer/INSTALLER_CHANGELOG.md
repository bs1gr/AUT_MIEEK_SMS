# Installer Changelog

## [1.18.10] - 2026-03-09

### Changed
- **Version Update:** Installer script header and documentation updated to v1.18.10
- **Database Profile Handling:** Fresh installs remain local-first while existing PostgreSQL settings are preserved during upgrades
- **Release Prep:** Rebuilt installer artifact and staged refreshed release notes for the post-v1.18.9 patch release

### Fixed
- **Upgrade Profile Drift:** Preserved existing PostgreSQL `.env`/profile settings instead of silently switching upgraded installs back to local SQLite
- **Remote Profile Inference:** `DOCKER.ps1` now reuses valid PostgreSQL profile configuration when present

## [1.18.9] - 2026-03-09

### Added
- **Profile-Drift Prevention**: Installer preserves existing PostgreSQL configuration during upgrades
- **Control Panel Auto-Updater**: Threaded download with SHA256 verification and installer launch
- **Database Management Panel**: Backup, diagnostics, and user admin in Control Panel
- **Offline Support**: Centralized network status hook, offline banner, and reconnect sync queues
- **Remote Database Credential Upload**: UI for validating and connecting to remote PostgreSQL
- **SQL Backup Support**: Encrypted and unencrypted backup modes
- **Analytics Dashboard**: Multi-chart visualization, predictive analytics, custom report builder
- **Environment Repair Helper**: `scripts/ops/REPAIR_LAPTOP_ENV_PROFILE.ps1` for profile-drift recovery

### Changed
- **DOCKER.ps1**: Auto-infer remote profile from existing DATABASE_ENGINE/DATABASE_URL
- **Default Profile**: Secure local SQLite by default for fresh installs; existing PostgreSQL preserved on upgrade
- **Release Workflow**: Version normalization enforced in installer CI workflow

### Fixed
- **Upgrade Profile Drift**: Prevented silent switch from PostgreSQL to local SQLite during unattended install
- **Windows Subprocess Crashes**: Resolved `docker.exe 0xc0000142` across all control panel modules
- **Native Runtime**: Fixed uvicorn relative import resolution
- **Auth**: Nullify audit_logs before user delete to prevent FK violation

## [1.18.3] - 2026-02-20

### Changed
- **Version Update:** Installer script header updated to v1.18.3
- **Documentation:** Added RBAC, course auto-activation, and database persistence notes to header
- **Release Lineage:** Refreshed installer artifact for corrected release publication path

## [1.18.2] - 2026-02-20

### Fixed
- **Installer Runtime:** Corrected runtime crash scenarios with proper lineage enforcement
- **Release Integrity:** Added payload floor gates and post-upload digest verification

## [1.18.0-1.18.1] - 2026-02-16 to 2026-02-17

### Added
- **PostgreSQL Deployment:** Default to PostgreSQL for data persistence (SQLite deprecated)
- **SMS_Manager Bundling:** Native runtime included for shortcut/launch operations
- **Database Persistence:** Comprehensive volume persistence with auto-migration
- **Course Auto-Activation:** Scheduled job runs daily at 3:00 AM UTC

### Changed
- **Scripts Deployment:** Only backup-database.sh included (99% size reduction)
- **GitHub Scripts:** `.github/scripts/` bundled for runtime operations
- **Docker Wiring:** PostgreSQL-only enforcement for fresh installs

### Fixed
- **Installer Upgrade:** Recreate shortcuts during updates
- **Launcher Runtime:** Delegate start flow to DOCKER.ps1 with docker probe
- **Legacy Cleanup:** Remove old batch launchers, validate SMS_Manager.exe
- **String Functions:** Replace StringChangeEx with custom StringReplaceAll + forward declarations

### Removed
- **Batch Launcher:** Removed legacy docker_manager.bat/cmd files
- **Development Scripts:** Excluded non-essential tools from production installer

## [1.12.x] - Previous

### Added
- **Progress Bar for Docker Image Installation:**
  - The installer now runs `Show-DockerInstallProgress.ps1` after copying files, displaying a progress bar and blocking until Docker images are fully installed.
  - Users receive clear feedback if installation fails or succeeds.
- **Automatic App Start Option:**
  - After Docker images are installed, the app can be started automatically if the `-StartAfterInstall` flag is set.

### Changed
- **[Files] Section:**
  - Added `Show-DockerInstallProgress.ps1` to the files copied by the installer.
- **[Run] Section:**
  - Replaced direct Docker install calls with a PowerShell script that provides a user-friendly progress window and error handling.

### Fixed
- Ensured installer blocks completion until Docker image installation is finished, preventing premature finish and user confusion.

---

For full details, see the main project `CHANGELOG.md`.
