# Installer Changelog

## [Unreleased] - v1.12.x

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
