# Installer Changelog

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
