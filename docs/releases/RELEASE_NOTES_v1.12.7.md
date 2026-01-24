# Release Notes: $11.12.7

**Release Date:** December 24, 2025
**Release Type:** Patch Release
**Focus:** CI/CD Workflow Cleanup & Pre-commit Hook Fixes

## 📝 Overview

This patch release addresses local development friction regarding pre-commit hooks and introduces automated maintenance for GitHub Actions workflow history to optimize storage usage.

## 🚀 New Features

### CI/CD Maintenance

- **Workflow Cleanup Automation**: Added `cleanup-workflow-runs.yml` to automatically delete old workflow runs.
  - Runs weekly (Sundays at midnight UTC).
  - Configurable retention count (default: 5).
  - Supports manual dispatch with dry-run capability.

## 🐛 Bug Fixes

### Developer Experience

- **Pre-commit Hook Logic**: Fixed an issue where pre-commit hooks in `COMMIT_READY.ps1` were running unconditionally, causing friction during local development iterations.
- **Reset Scripts**: Enhanced safety checks in system reset scripts to prevent accidental data loss or misconfiguration.

## 🔧 Technical Details

- **Version**: 1.12.7
- **Documentation**: Updated `CHANGELOG.md`, `COMMIT_READY.ps1`, and `DOCUMENTATION_INDEX.md` to reflect version changes.

## 📦 Upgrade Instructions

No special upgrade steps required.
- **Developers**: Pull the latest changes to ensure `COMMIT_READY.ps1` behaves correctly locally.
- **DevOps**: The new cleanup workflow will be enabled automatically on the default branch.

---

*Generated for Student Management System $11.12.7*

