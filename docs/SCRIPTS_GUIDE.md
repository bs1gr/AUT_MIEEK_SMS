# Scripts Organization Guide

**Last Updated**: November 2025 | **Version**: 1.5.0

This document describes the complete script organization for the Student Management System, including the purpose, audience, and usage of all operational scripts.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Root-Level Scripts](#root-level-scripts)
- [Developer Scripts (`scripts/dev/`)](#developer-scripts-scriptsdev)
- [Deployment Scripts (`scripts/deploy/`)](#deployment-scripts-scriptsdeploy)
- [Common Usage Patterns](#common-usage-patterns)
- [Linux Helpers](#linux-helpers)
- [Migration Notes](#migration-notes)

## Overview

The project's operational scripts have been reorganized into two distinct categories:


1. **Developer Workbench** (`scripts/dev/`) - For active development: build, run, debug, test, clean (use `run-native.ps1` for native mode)
2. **End-User/DevOps** (`scripts/deploy/`) - For deployment, Docker operations, and production maintenance (use `RUN.ps1` for fullstack Docker)

> **Note:** As of v1.5.0, only `RUN.ps1` (Docker), `scripts/dev/run-native.ps1` (native), and `SMS.ps1` (management) are supported entry points. All other setup/start/stop scripts are deprecated or removed.

This separation ensures:

- Clear responsibility boundaries
- Easier onboarding for different user types
- Reduced risk of accidental production operations during development
- Better documentation and discoverability

## Directory Structure

```text
student-management-system/
├── RUN.ps1                        # Canonical Docker entry point (one-click)
├── SMS.ps1                        # Main management interface (END-USER)
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
│   │       ├── KILL_FRONTEND_NOW.ps1/.bat
│   │       ├── CLEANUP_*.ps1
│   │       ├── DEVTOOLS.ps1/.bat
│   │       ├── TEST_TERMINAL.ps1
│   │       └── VERIFY_LOCALIZATION.ps1
│   │
│   ├── deploy/                    # END-USER/DEVOPS scripts
│   │   ├── README.md              # Deployment documentation
│   │   ├── CHECK_VOLUME_VERSION.ps1
│   │   ├── set-docker-metadata.ps1
│   │   ├── docker/                # Docker operations
│   │   │   ├── DOCKER_UP.ps1
│   │   │   ├── DOCKER_DOWN.ps1
│   │   │   ├── DOCKER_REFRESH.ps1
│   │   │   ├── DOCKER_SMOKE.ps1
│   │   │   └── DOCKER_*.ps1
│   │   └── internal/              # Packaging tools
│   │       ├── CREATE_PACKAGE.ps1/.bat
│   │       ├── CREATE_DEPLOYMENT_PACKAGE.ps1/.bat
│   │       └── INSTALLER.ps1/.bat
│   │
│   └── reorganize_scripts.py      # Reorganization utility
│
└── docs/
    ├── SCRIPTS_GUIDE.md           # This file
    └── ...
```

## Root-Level Scripts


### For End-Users


#### `RUN.ps1` (root)

Canonical one-click fullstack Docker deployment (recommended for all users)

```powershell
pwsh -NoProfile -File RUN.ps1
```


#### `SMS.ps1` (root)

Management interface for Docker containers

```powershell
pwsh -NoProfile -File SMS.ps1
```


<!-- INSTALL.bat and all legacy setup scripts are deprecated/removed in v1.5.0. Use RUN.ps1 for all new deployments. -->

## Developer Scripts (`scripts/dev/`)

Scripts for active development work. See [scripts/dev/README.md](../scripts/dev/README.md) for detailed documentation.


### Core Development Tools


#### `run-native.ps1` (scripts/dev/)

Start backend and frontend in native development mode (hot reload)

```powershell
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

#### `debug_import_control.py`

Debug Python import issues.

```powershell
python scripts\dev\debug_import_control.py
```

### Diagnostic Tools (`scripts/dev/internal/`)

#### `DEBUG_PORTS.ps1/.bat`

Check and debug port conflicts.

```powershell
scripts\dev\internal\DEBUG_PORTS.ps1
```

Shows what's using ports 8000, 5173, 8080.

#### `DIAGNOSE_STATE.ps1`

Comprehensive system diagnostics.

```powershell
scripts\dev\internal\DIAGNOSE_STATE.ps1
```

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
```

#### `DEVTOOLS.ps1/.bat`

Advanced developer tools menu.

```powershell
scripts\dev\internal\DEVTOOLS.ps1
```

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
```

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

#### `CLEANUP_COMPREHENSIVE.ps1`

Deep cleanup of all artifacts.

```powershell
scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1
```

Removes everything except source code and database.

#### `CLEANUP_OBSOLETE_FILES.ps1`

Remove deprecated/obsolete files.

```powershell
scripts\dev\internal\CLEANUP_OBSOLETE_FILES.ps1
```

### Utility Scripts

#### `KILL_FRONTEND_NOW.ps1/.bat`

Force-kill frontend processes.

```powershell
scripts\dev\internal\KILL_FRONTEND_NOW.ps1
```

Use when frontend is stuck or won't stop normally.

#### `TEST_TERMINAL.ps1`

Test PowerShell environment.

```powershell
scripts\dev\internal\TEST_TERMINAL.ps1
```

#### `VERIFY_LOCALIZATION.ps1`

Verify localization files.

```powershell
scripts\dev\internal\VERIFY_LOCALIZATION.ps1
```

## Deployment Scripts (`scripts/deploy/`)

Scripts for deployment and production operations. See [scripts/deploy/README.md](../scripts/deploy/README.md) for detailed documentation.


### Primary Entry Points (v1.5.0+)

<!-- All setup/start/stop scripts (SMART_SETUP.ps1, STOP.ps1, UNINSTALL.bat, etc.) are deprecated/removed in v1.5.0. Use only RUN.ps1, scripts/dev/run-native.ps1, and SMS.ps1. -->

### Docker Operations (`scripts/deploy/docker/`)

#### `DOCKER_UP.ps1`

Start Docker containers.

```powershell
scripts\deploy\docker\DOCKER_UP.ps1
```

#### `DOCKER_DOWN.ps1`

Stop Docker containers.

```powershell
scripts\deploy\docker\DOCKER_DOWN.ps1
```

#### `DOCKER_REFRESH.ps1`

Rebuild and restart containers.

```powershell
scripts\deploy\docker\DOCKER_REFRESH.ps1
```

#### `DOCKER_SMOKE.ps1`

Smoke test Docker deployment.

```powershell
scripts\deploy\docker\DOCKER_SMOKE.ps1
```

#### `DOCKER_UPDATE_VOLUME.ps1`

Update or migrate Docker volumes.

```powershell
scripts\deploy\docker\DOCKER_UPDATE_VOLUME.ps1
```

### Volume Management

#### `CHECK_VOLUME_VERSION.ps1`

Check Docker volume schema version.

```powershell
scripts\deploy\CHECK_VOLUME_VERSION.ps1
scripts\deploy\CHECK_VOLUME_VERSION.ps1 -AutoMigrate
```

Detects schema mismatches between native DB and Docker volumes, offers migration.

#### `set-docker-metadata.ps1`

Set Docker image metadata.

```powershell
scripts\deploy\set-docker-metadata.ps1
```

Tags images with version and metadata.

### Packaging Tools (`scripts/deploy/internal/`)

#### `CREATE_DEPLOYMENT_PACKAGE.ps1/.bat`

Create deployment-ready package.

```powershell
scripts\deploy\internal\CREATE_DEPLOYMENT_PACKAGE.ps1
```

Creates a ZIP with:

- Source code
- Configuration templates
- Installation scripts
- Documentation

#### `CREATE_PACKAGE.ps1/.bat`

Create distribution package.

```powershell
scripts\deploy\internal\CREATE_PACKAGE.ps1
```

#### `INSTALLER.ps1/.bat`

Packaged installer for distribution.

```powershell
scripts\deploy\internal\INSTALLER.ps1
```

## Common Usage Patterns


### For Developers

#### Starting Development

```powershell
# Native development mode
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

#### Running Tests

```powershell
# Quick smoke test
scripts\dev\SMOKE_TEST.ps1

# Full test suite
cd backend
python -m pytest
```

#### Debugging Issues

```powershell
# Check system state
scripts\dev\internal\DIAGNOSE_STATE.ps1

# Check port conflicts
scripts\dev\internal\DEBUG_PORTS.ps1

# Frontend-specific issues
scripts\dev\internal\DIAGNOSE_FRONTEND.ps1
```

#### Cleanup After Development

```powershell
# Quick cleanup (preserves data)
scripts\dev\CLEANUP.bat

# Deep cleanup
scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1
```


### For End-Users/DevOps


#### Fullstack Docker (Recommended)

```powershell
# Start (one-click, v1.5.0+)
pwsh -NoProfile -File RUN.ps1
```


<!-- All Docker deployment should use RUN.ps1 as of v1.5.0. All other setup scripts are deprecated/removed. -->


#### Maintenance

```powershell
# Backup database
.\SMS.ps1
# Select option 'B' (Backup Database)

# Check volume version
scripts\deploy\CHECK_VOLUME_VERSION.ps1

# Stop services
.\SMS.ps1 -Stop
```


#### Updating/Upgrading

```powershell
# Stop services
.\SMS.ps1 -Stop

# Pull new code
git pull

# Check for volume schema changes
scripts\deploy\CHECK_VOLUME_VERSION.ps1 -AutoMigrate

# Restart with new version
.\SMS.ps1 -Quick
```

## Linux Helpers

For Linux environments, a few helper scripts improve onboarding and consistency:

- `scripts/linux_env_check.sh` — Validate Linux prerequisites (Docker engine access, Python>=3.11, Node>=18, PowerShell 7+), verify `.env` files and writable directories. Use `--fix` to auto-create safe items (folders and `.env` from `.env.example`).
- `scripts/dev/run-native.sh` — Start native development mode (delegates to `SMART_SETUP.ps1` via pwsh). Sets `SMS_ENV=development`.
- `scripts/deploy/run-docker-release.sh` — Start Docker release mode (delegates to `SMART_SETUP.ps1` via pwsh). Sets `SMS_ENV=production`.

See also: Linux Quick Start in the main [README](../README.md#-linux-quick-start).

## Migration Notes

### From Previous Versions

If you're upgrading from a version before the script reorganization:



**Old locations → New locations**:

- `CLEANUP.bat` (root) → `.\scripts\dev\CLEANUP.bat`
- `QUICKSTART.ps1`, `SETUP.ps1`, `SMART_SETUP.ps1`, `STOP.ps1`, `UNINSTALL.bat` → **Removed** (use `RUN.ps1` or `SMS.ps1`)
- `.\scripts\SMOKE_TEST.ps1` → `.\scripts\dev\SMOKE_TEST.ps1`
- `scripts/internal/*` → Split between `scripts/dev/internal/` and `scripts/deploy/internal/`
- `scripts/docker/*` → `scripts/deploy/docker/`

**Recommended workflow (v1.5.0+)**:

1. Use `RUN.ps1` (Docker) or `scripts/dev/run-native.ps1` (native dev) as your entry point
2. Use `SMS.ps1` for all management/maintenance
3. Developers: Bookmark `scripts/dev/` scripts
4. DevOps: Bookmark `scripts/deploy/` scripts


### Breaking Changes

All legacy setup/start/stop scripts are removed in v1.5.0. Use only the canonical entry points.

### Benefits of New Organization

1. **Clarity**: Clear separation of concerns
2. **Safety**: Reduced risk of accidental production operations
3. **Discoverability**: Easier to find the right script
4. **Documentation**: Each category has focused README
5. **Maintainability**: Easier to maintain and extend

## Getting Help

- **Root scripts**: `.\SMS.ps1 -Help` or `INSTALL.bat` and follow prompts
- **Developer scripts**: Read [scripts/dev/README.md](../scripts/dev/README.md)
- **Deployment scripts**: Read [scripts/deploy/README.md](../scripts/deploy/README.md)
- **Main documentation**: [README.md](../README.md)
- **Troubleshooting**: `.\SMS.ps1` → Option '8' (Full Diagnostics)

## Version History

- **v1.2.3+** (October 2025): Scripts reorganized into dev/ and deploy/
- **v1.2.0** (September 2025): Introduced SMART_SETUP.ps1 and SMS.ps1
- **v1.1.0** (August 2025): Added Docker volume versioning
- **v1.0.0** (July 2025): Initial release

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
- Check troubleshooting: `.\SMS.ps1` → Option '8'
