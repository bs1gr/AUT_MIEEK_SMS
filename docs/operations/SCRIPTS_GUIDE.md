# Scripts Organization Guide

**Last Updated**: December 2025 | **Version**: 1.9.7

This document describes the complete script organization for the Student Management System, including the purpose, audience, and usage of all operational scripts.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Root-Level Scripts](#root-level-scripts)
- [Developer Scripts (`scripts/dev/`)](#developer-scripts-scriptsdev)
- [Deployment Scripts (`scripts/deploy/`)](#deployment-scripts-scriptsdeploy)
- [Release Compliance Scripts (`scripts/ops/`)](#release-compliance-scripts-scriptsops)
- [Common Usage Patterns](#common-usage-patterns)
- [Linux Helpers](#linux-helpers)
- [Migration Notes](#migration-notes)

## Overview

The project's operational scripts have been consolidated into two primary entry points:

1. **Docker Deployment** (`DOCKER.ps1`) - For Docker-based deployment, management, and production operations
2. **Native Development** (`NATIVE.ps1`) - For local development with hot reload

> **Note:** As of 1.9.7, all legacy scripts (`RUN.ps1`, `INSTALL.ps1`, `SMS.ps1`, `scripts/dev/run-native.ps1`) have been consolidated into `DOCKER.ps1` and `NATIVE.ps1`. See `archive/pre-1.9.7/SCRIPTS_CONSOLIDATION_GUIDE.md` for migration details.

This consolidation ensures:

- Clear responsibility boundaries
- Easier onboarding for different user types
- Reduced risk of accidental production operations during development
- Better documentation and discoverability

## Directory Structure

```text
student-management-system/
├── DOCKER.ps1                     # Canonical Docker entry point (v2.0)
├── NATIVE.ps1                     # Canonical native dev entry point (v2.0)
├── scripts/
│   ├── dev/                       # DEVELOPER scripts
│   │   ├── README.md              # Developer documentation
│   │   ├── CLEANUP.bat            # Clean build artifacts
│   │   ├── SMOKE_TEST.ps1         # Quick health test
│   │   ├── debug_import_control.py # Debug imports
│   │   └── internal/              # Internal dev tools
│   │       ├── DEBUG_PORTS.ps1/.bat
│   │       ├── DIAGNOSE_STATE.ps1
│   │       ├── DIAGNOSE_FRONTEND.ps1/.bat
│   │       ├── CLEANUP_*.ps1
│   │       ├── DEVTOOLS.ps1/.bat
│   │       ├── TEST_TERMINAL.ps1
│   │       └── VERIFY_LOCALIZATION.ps1
│   │
│   ├── deploy/                    # END-USER/DEVOPS scripts
│   │   ├── README.md              # Deployment documentation
│   │   ├── CHECK_VOLUME_VERSION.ps1
│   │   ├── set-docker-metadata.ps1
│   │   ├── docker/                # Docker operations (archived - use DOCKER.ps1)
│   │   │   └── (scripts moved to archive/pre-1.9.7-docker-scripts/)
│   │   └── internal/              # Packaging tools
│   │       ├── CREATE_PACKAGE.ps1/.bat
│   │       ├── CREATE_DEPLOYMENT_PACKAGE.ps1/.bat
│   │       └── INSTALLER.ps1/.bat
│   │
│   ├── ops/                       # Release automation + compliance helpers
│   │   ├── archive-releases.ps1
│   │   ├── remove-legacy-packages.ps1
│   │   └── samples/
│   │       ├── releases.sample.json
│   │       └── package-versions.sample.json
│   │
│   ├── operator/                  # Operator-only helpers (kill frontend, stop monitor, etc.)
│   └── reorganize_scripts.py      # Reorganization utility
│
├── archive/                       # Deprecated wrappers retained for history
│   ├── README.md
│   └── scripts/...
│
└── docs/
    ├── SCRIPTS_GUIDE.md           # This file
    └── ...

```text
## Root-Level Scripts

### For End-Users

#### `DOCKER.ps1` (root)

Canonical Docker deployment and management script (v2.0)

```powershell
.\DOCKER.ps1 -Start        # Start application
.\DOCKER.ps1 -Stop         # Stop application
.\DOCKER.ps1 -Status       # Check status
.\DOCKER.ps1 -Update       # Update with backup
.\DOCKER.ps1 -Logs         # View logs
.\DOCKER.ps1 -Help         # Show all commands

```text
#### `NATIVE.ps1` (root)

Native development mode with hot reload (v2.0)

```powershell
.\NATIVE.ps1 -Setup        # Install dependencies (first time)
.\NATIVE.ps1 -Start        # Start backend + frontend
.\NATIVE.ps1 -Stop         # Stop all processes
.\NATIVE.ps1 -Help         # Show all commands

```text
## Developer Scripts (`scripts/dev/`)

Scripts for active development work. See [scripts/dev/README.md](../scripts/dev/README.md) for detailed documentation.

### Core Development Tools

Use `.\NATIVE.ps1 -Start` for native development mode with hot reload.

#### `debug_import_control.py`

Debug Python import issues.

```powershell
python scripts\dev\debug_import_control.py

```text
### Diagnostic Tools (`scripts/dev/internal/`)

#### `DEBUG_PORTS.ps1/.bat`

Check and debug port conflicts.

```powershell
scripts\dev\internal\DEBUG_PORTS.ps1

```text
Shows what's using ports 8000, 5173, 8080.

#### `DIAGNOSE_STATE.ps1`

Comprehensive system diagnostics.

```powershell
scripts\dev\internal\DIAGNOSE_STATE.ps1

```text
Checks:

- Docker status
- Python/Node.js versions
- Running processes
- Port availability
- Database state
- Configuration files

#### `DIAGNOSE_FRONTEND.ps1/.bat`

Frontend-specific diagnostics.

```powershell
scripts\dev\internal\DIAGNOSE_FRONTEND.ps1

```text
#### `DEVTOOLS.ps1/.bat`

Advanced developer tools menu.

```powershell
scripts\dev\internal\DEVTOOLS.ps1

```text
Provides access to:

- Code analysis tools
- Performance profiling
- Log viewing
- Configuration management

### Cleanup Tools

#### `CLEANUP.bat`

Quick, non-destructive cleanup.

```batch
scripts\dev\CLEANUP.bat

```text
Removes:

- Python `__pycache__`
- Frontend `dist/` builds
- Backend logs
- Temporary files

Preserves:

- Database
- Docker volumes
- node_modules
- venv

#### Deep Cleanup (DOCKER.ps1 -DeepClean)

Full workspace cleanup with Docker artifacts removal.

```powershell
.\DOCKER.ps1 -DeepClean

```text
Removes everything including Docker caches, with automatic backup creation.

> **Note:** Legacy `SUPER_CLEAN_AND_DEPLOY.ps1` was archived in v2.0. Use `DOCKER.ps1 -DeepClean` instead.

#### `CLEANUP_OBSOLETE_FILES.ps1`

Remove deprecated/obsolete files.

```powershell
scripts\dev\internal\CLEANUP_OBSOLETE_FILES.ps1

```text
### Utility Scripts

#### `KILL_FRONTEND_NOW.ps1/.bat`

Force-kill frontend processes.

```powershell
scripts\dev\internal\KILL_FRONTEND_NOW.ps1

```text
Use when frontend is stuck or won't stop normally.

#### `TEST_TERMINAL.ps1`

Test PowerShell environment.

```powershell
scripts\dev\internal\TEST_TERMINAL.ps1

```text
#### `VERIFY_LOCALIZATION.ps1`

Verify localization files.

```powershell
scripts\dev\internal\VERIFY_LOCALIZATION.ps1

```text
## Deployment Scripts (`scripts/deploy/`)

Scripts for deployment and production operations. See [scripts/deploy/README.md](../scripts/deploy/README.md) for detailed documentation.

### Primary Entry Points (1.9.7+)

As of 1.9.7, use the consolidated root-level scripts:

- `.\DOCKER.ps1` - All Docker operations
- `.\NATIVE.ps1` - All native development operations

### Docker Operations (`scripts/deploy/docker/`)

> **Note:** For Docker operations, use `.\DOCKER.ps1` which provides comprehensive functionality including build, start, stop, restart, update, monitoring, backup, and cleanup operations. Legacy helper scripts have been archived to `archive/pre-1.9.7-docker-scripts/` as of 1.9.7.

### Volume Management

#### `CHECK_VOLUME_VERSION.ps1`

Check Docker volume schema version.

```powershell
scripts\deploy\CHECK_VOLUME_VERSION.ps1
scripts\deploy\CHECK_VOLUME_VERSION.ps1 -AutoMigrate

```text
Detects schema mismatches between native DB and Docker volumes, offers migration.

#### `set-docker-metadata.ps1`

Set Docker image metadata.

```powershell
scripts\deploy\set-docker-metadata.ps1

```text
Tags images with version and metadata.

### Packaging Tools (`scripts/deploy/internal/`)

#### `CREATE_DEPLOYMENT_PACKAGE.ps1/.bat`

Create deployment-ready package.

```powershell
scripts\deploy\internal\CREATE_DEPLOYMENT_PACKAGE.ps1

```text
Creates a ZIP with:

- Source code
- Configuration templates
- Installation scripts
- Documentation

#### `CREATE_PACKAGE.ps1/.bat`

Create distribution package.

```powershell
scripts\deploy\internal\CREATE_PACKAGE.ps1

```text
#### `INSTALLER.ps1/.bat`

Packaged installer for distribution.

```powershell
scripts\deploy\internal\INSTALLER.ps1

```text
## Release Compliance Scripts (`scripts/ops/`)

Purpose-built PowerShell helpers that keep GitHub releases, GHCR packages, and compliance records in sync every time you cut a tag. Use these scripts (or their GitHub Actions wrapper) before publishing a new release so legacy assets are clearly marked and stale containers are removed.

### `archive-releases.ps1`

- Location: `scripts/ops/archive-releases.ps1`
- Arguments: `-Repo`, `-ThresholdTag`, `-DryRun`, `-SkipPrereleaseToggle`, `-ReleasesJsonPath`, `-GhPath`
- Behavior: Fetches every release ≤ `ThresholdTag`, prepends the ARCHIVED banner that points to `archive/README.md`, and optionally toggles the prerelease flag. Use `-ReleasesJsonPath` (for example `scripts/ops/samples/releases.sample.json`) to simulate the GitHub API response without network access.
- Usage:

    ```powershell
    # Live data via gh
    pwsh -NoProfile -File scripts/ops/archive-releases.ps1 -Repo bs1gr/AUT_MIEEK_SMS -ThresholdTag 1.9.7 -DryRun

    # Offline simulation/local CI (no gh calls)
    pwsh -NoProfile -File scripts/ops/archive-releases.ps1 -ThresholdTag 1.9.7 -DryRun `
        -ReleasesJsonPath scripts/ops/samples/releases.sample.json
    ```

### `remove-legacy-packages.ps1`

- Location: `scripts/ops/remove-legacy-packages.ps1`
- Arguments: `-Org`, `-Packages`, `-DryRun`, `-Privatize`, `-PackageDataPath`, `-GhPath`
- Behavior: Enumerates or deletes GHCR image versions for `sms-backend`, `sms-frontend`, `sms-fullstack`. Use `-Privatize` when you prefer to retain the blobs but hide them from automation. Supply `-PackageDataPath scripts/ops/samples/package-versions.sample.json` for offline dry-runs when `gh` is unavailable.
- Usage:

    ```powershell
    # Preview live GHCR data
    pwsh -NoProfile -File scripts/ops/remove-legacy-packages.ps1 -DryRun

    # Offline dry-run (uses sample payload)
    pwsh -NoProfile -File scripts/ops/remove-legacy-packages.ps1 -DryRun `
        -PackageDataPath scripts/ops/samples/package-versions.sample.json
    ```

### GitHub Actions Wrapper

- Workflow: [`.github/workflows/archive-legacy-releases.yml`](../.github/workflows/archive-legacy-releases.yml)
- Trigger: `workflow_dispatch` (Actions tab) with inputs for `threshold_tag` and `dry_run`.
- What it does: Checks out `main`, runs the archival script with the provided inputs, and publishes the log so auditors can verify what changed.

📌 **Reference**: [docs/DEPLOYMENT_ASSET_TRACKER.md](DEPLOYMENT_ASSET_TRACKER.md) tracks ownership, run cadence, and prerequisites for every deployment helper.

## Common Usage Patterns

### For Developers

#### Starting Development

```powershell
# Native development mode (v2.0)

.\NATIVE.ps1 -Start

```text
#### Running Tests

```powershell
# Quick smoke test

scripts\dev\SMOKE_TEST.ps1

# Full test suite

cd backend
python -m pytest

```text
#### Debugging Issues

```powershell
# Check system state

scripts\dev\internal\DIAGNOSE_STATE.ps1

# Check port conflicts

scripts\dev\internal\DEBUG_PORTS.ps1

# Frontend-specific issues

scripts\dev\internal\DIAGNOSE_FRONTEND.ps1

```text
#### Cleanup After Development

```powershell
# Quick cleanup (preserves data)

scripts\dev\CLEANUP.bat

# Deep cleanup

scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1

```text
### For End-Users/DevOps

#### Fullstack Docker (Recommended)

```powershell
# Start (v2.0)

.\DOCKER.ps1 -Start

```text
#### Maintenance

```powershell
# Backup database

.\DOCKER.ps1 -Backup

# Check volume version

scripts\deploy\CHECK_VOLUME_VERSION.ps1

# Stop services

.\DOCKER.ps1 -Stop

```text
#### Updating/Upgrading

```powershell
# Update with automatic backup

.\DOCKER.ps1 -Update

# Or manually:

.\DOCKER.ps1 -Stop
git pull
scripts\deploy\CHECK_VOLUME_VERSION.ps1 -AutoMigrate
.\DOCKER.ps1 -Start

```text
### GitHub Release Maintenance

- `scripts/ops/archive-releases.ps1` — PowerShell helper that marks historical GitHub releases as archived/pre-release and injects the standard warning banner. Supports `-DryRun`, custom repository/owner overrides, offline fixtures via `-ReleasesJsonPath` (see `scripts/ops/samples/releases.sample.json`), and optional body suffixes so you can verify the exact markdown that will be pushed before touching production releases. Run it from the repo root (`pwsh -NoProfile -File scripts/ops/archive-releases.ps1 -DryRun`) to audit the changes, then rerun without `-DryRun` when ready.
- `.github/workflows/archive-legacy-releases.yml` — Manual GitHub Actions workflow that wraps the helper above so Release Engineering can run the archival pass directly from the Actions tab. Provide a `threshold_tag` (defaults to `1.9.7`) and keep `dry_run=true` for verification before re-running live.
- `scripts/ops/remove-legacy-packages.ps1` — Companion script that iterates over GHCR container packages (defaults to `sms-backend`, `sms-frontend`, `sms-fullstack`) and either deletes every version or switches visibility to private. Supports `-DryRun`, `-Privatize`, offline fixtures via `-PackageDataPath` (example: `scripts/ops/samples/package-versions.sample.json`), and custom organization/package overrides.

## Linux Helpers

For Linux environments, a few helper scripts improve onboarding and consistency:

- `scripts/linux_env_check.sh` — Validate Linux prerequisites (Docker engine access, Python>=3.11, Node>=18, PowerShell 7+), verify `.env` files and writable directories. Use `--fix` to auto-create safe items (folders and `.env` from `.env.example`).
- Native development: Use `pwsh ./NATIVE.ps1 -Start` or run backend/frontend manually.
- Docker deployment: Use `pwsh ./DOCKER.ps1 -Start` or `docker compose up -d --build`.

See also: Linux Quick Start in the main [README](../README.md#-linux-quick-start).

## Migration Notes

### From Previous Versions

If you're upgrading from a version before the script consolidation (1.9.7):

**Old scripts → New commands (v2.0)**:

| Old Script | New Command |
|-----------|-------------|
| `RUN.ps1` | `.\DOCKER.ps1 -Start` |
| `RUN.ps1 -Stop` | `.\DOCKER.ps1 -Stop` |
| `RUN.ps1 -Update` | `.\DOCKER.ps1 -Update` |
| `INSTALL.ps1` | `.\DOCKER.ps1 -Install` |
| `SMS.ps1` | `.\DOCKER.ps1 -Help` |
| `scripts/dev/run-native.ps1` | `.\NATIVE.ps1 -Start` |

**Other location changes**:

- `CLEANUP.bat` (root) → `.\scripts\dev\CLEANUP.bat`
- `.\scripts\SMOKE_TEST.ps1` → `.\scripts\dev\SMOKE_TEST.ps1`
- `scripts/internal/*` → Split between `scripts/dev/internal/` and `scripts/deploy/internal/`
- `scripts/docker/*` → `scripts/deploy/docker/`

**Recommended workflow (1.9.7+)**:

1. Use `DOCKER.ps1` (Docker) or `NATIVE.ps1` (native dev) as your entry point
2. Use `-Help` flag to see all available commands
3. Developers: Bookmark `scripts/dev/` scripts
4. DevOps: Bookmark `scripts/deploy/` scripts

### Breaking Changes

All legacy scripts are consolidated in $11.9.7. Use only the canonical entry points (`DOCKER.ps1`, `NATIVE.ps1`).

### Benefits of New Organization

1. **Clarity**: Clear separation of concerns
2. **Safety**: Reduced risk of accidental production operations
3. **Discoverability**: Easier to find the right script
4. **Documentation**: Each category has focused README
5. **Maintainability**: Easier to maintain and extend

## Getting Help

- **Root scripts**: `.\DOCKER.ps1 -Help` or `.\NATIVE.ps1 -Help`
- **Developer scripts**: Read [scripts/dev/README.md](../scripts/dev/README.md)
- **Deployment scripts**: Read [scripts/deploy/README.md](../scripts/deploy/README.md)
- **Main documentation**: [README.md](../README.md)
- **Troubleshooting**: `.\DOCKER.ps1 -Status` for Docker status

## Version History

- **$11.9.7** (January 2025): Scripts consolidated to DOCKER.ps1 and NATIVE.ps1
- **$11.9.7** (November 2025): Legacy scripts archived
- **$11.9.7+** (October 2025): Scripts reorganized into dev/ and deploy/
- **$11.9.7** (September 2025): Introduced SMART_SETUP.ps1 and SMS.ps1
- **$11.9.7** (August 2025): Added Docker volume versioning
- **$11.9.7** (July 2025): Initial release

## Contributing

When adding new scripts:

1. Determine the target audience (Developer vs End-User/DevOps)
2. Place in appropriate directory (`scripts/dev/` or `scripts/deploy/`)
3. Update the relevant README.md
4. Update this guide if adding a new category or major feature
5. Use clear, descriptive names
6. Include help text and examples in script headers

---

**Questions or Issues?**

- File an issue: <https://github.com/bs1gr/AUT_MIEEK_SMS/issues>
- Read main README: [README.md](../README.md)
- Check status: `.\DOCKER.ps1 -Status`

