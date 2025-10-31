# Scripts Organization Guide

**Last Updated**: October 2025 | **Version**: 1.2.3+

This document describes the complete script organization for the Student Management System, including the purpose, audience, and usage of all operational scripts.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Root-Level Scripts](#root-level-scripts)
- [Developer Scripts (`scripts/dev/`)](#developer-scripts-scriptsdev)
- [Deployment Scripts (`scripts/deploy/`)](#deployment-scripts-scriptsdeploy)
- [Common Usage Patterns](#common-usage-patterns)
- [Migration Notes](#migration-notes)

## Overview

The project's operational scripts have been reorganized into two distinct categories:

1. **Developer Workbench** (`scripts/dev/`) - For active development: build, run, debug, test, clean
2. **End-User/DevOps** (`scripts/deploy/`) - For deployment, Docker operations, and production maintenance

This separation ensures:
- Clear responsibility boundaries
- Easier onboarding for different user types
- Reduced risk of accidental production operations during development
- Better documentation and discoverability

## Directory Structure

```
student-management-system/
├── SMS.ps1                        # Main management interface (END-USER)
├── INSTALL.bat                    # One-click installer (END-USER)
├──scripts/
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
│   │   ├── SMART_SETUP.ps1        # Intelligent setup
│   │   ├── STOP.ps1/.bat          # Stop services
│   │   ├── UNINSTALL.bat          # Uninstall
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
│   ├── SETUP.ps1/.bat             # (Deprecated - forwards to SMART_SETUP)
│   └── reorganize_scripts.py      # Reorganization utility
│
└── docs/
    ├── SCRIPTS_GUIDE.md           # This file
    └── ...
```

## Root-Level Scripts

### For End-Users

#### `SMS.ps1`
**Primary management interface for end-users**

The main control panel for all SMS operations.

```powershell
.\SMS.ps1              # Interactive menu
.\SMS.ps1 -Quick       # Quick start (auto-detects mode)
.\SMS.ps1 -Status      # Show system status
.\SMS.ps1 -Stop        # Stop all services
.\SMS.ps1 -Restart     # Restart services
.\SMS.ps1 -Help        # Show help
```

**Features**:
- Interactive menu with all operations
- Application control (start/stop/restart)
- Database backup/restore
- System diagnostics
- Docker operations
- Automatic mode detection (Docker/Native)

**Target Audience**: End-users, system administrators

#### `INSTALL.bat`
**One-click installer for new deployments**

Simplest way to get started - works on any Windows system.

```batch
INSTALL.bat
```

**Features**:
- No PowerShell execution policy issues
- Auto-detects Python/Docker
- Chooses best deployment mode
- Creates all necessary configurations
- Opens browser automatically

**Target Audience**: First-time users, quick evaluations

## Developer Scripts (`scripts/dev/`)

Scripts for active development work. See [scripts/dev/README.md](../scripts/dev/README.md) for detailed documentation.

### Core Development Tools

#### `SMOKE_TEST.ps1`
Quick health check of running application.

```powershell
scripts\dev\SMOKE_TEST.ps1
scripts\dev\SMOKE_TEST.ps1 -TimeoutSec 5
```

Tests:
- Frontend accessibility
- Backend API health
- Database connectivity
- Core endpoints

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

### Primary Entry Points

#### `SMART_SETUP.ps1`
Intelligent setup and deployment script.

```powershell
scripts\deploy\SMART_SETUP.ps1                  # Auto-detect mode
scripts\deploy\SMART_SETUP.ps1 -PreferDocker    # Prefer Docker
scripts\deploy\SMART_SETUP.ps1 -PreferNative    # Prefer native
scripts\deploy\SMART_SETUP.ps1 -SkipStart       # Setup only, don't start
```

**Features**:
- Auto-detects Docker/Python/Node.js
- Installs dependencies
- Initializes database
- Configures environment
- Starts services

**Replaces**: Old `SETUP.ps1` and `QUICKSTART.ps1`

#### `STOP.ps1/.bat`
Stop all running services.

```powershell
scripts\deploy\STOP.ps1
```

Works with both Docker and native modes.

#### `UNINSTALL.bat`
Complete uninstallation.

```batch
scripts\deploy\UNINSTALL.bat
```

Removes:
- Services
- Dependencies
- Configuration files
- (Optionally) Database

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
# Quick start with auto-detection
.\SMS.ps1 -Quick

# Or use the interactive menu
.\SMS.ps1
# Then select option 1 (Start Application)
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

#### First-Time Installation
```batch
REM Simplest method
INSTALL.bat

REM Or with PowerShell
.\SMS.ps1 -Quick
```

#### Docker Deployment
```powershell
# Setup and start
scripts\deploy\SMART_SETUP.ps1 -PreferDocker

# Or use individual scripts
scripts\deploy\docker\DOCKER_UP.ps1
scripts\deploy\docker\DOCKER_SMOKE.ps1
```

#### Maintenance
```powershell
# Backup database
.\SMS.ps1
# Select option 'B' (Backup Database)

# Check volume version
scripts\deploy\CHECK_VOLUME_VERSION.ps1

# Stop services
scripts\deploy\STOP.ps1
```

#### Updating/Upgrading
```powershell
# Stop services
scripts\deploy\STOP.ps1

# Pull new code
git pull

# Check for volume schema changes
scripts\deploy\CHECK_VOLUME_VERSION.ps1 -AutoMigrate

# Restart with new version
.\SMS.ps1 -Quick
```

## Migration Notes

### From Previous Versions

If you're upgrading from a version before the script reorganization:

**Old locations → New locations**:
- `CLEANUP.bat` (root) → `scripts/dev/CLEANUP.bat`
- `QUICKSTART.ps1` (root) → Use `SMS.ps1 -Quick` or `scripts/deploy/SMART_SETUP.ps1`
- `scripts/SETUP.ps1` → `scripts/deploy/SMART_SETUP.ps1` (or use wrapper)
- `scripts/SMOKE_TEST.ps1` → `scripts/dev/SMOKE_TEST.ps1`
- `scripts/internal/*` → Split between `scripts/dev/internal/` and `scripts/deploy/internal/`
- `scripts/docker/*` → `scripts/deploy/docker/`

**Deprecated scripts** (still work but forward to new locations):
- `scripts/SETUP.ps1` - Forwards to `SMART_SETUP.ps1`
- `scripts/SETUP.bat` - Forwards to `SMART_SETUP.ps1`

**Recommended workflow**:
1. Use `SMS.ps1` as your primary interface
2. Use `INSTALL.bat` for new installations
3. Developers: Bookmark `scripts/dev/` scripts
4. DevOps: Bookmark `scripts/deploy/` scripts

### Breaking Changes

None. All existing workflows continue to work through wrappers and forwards.

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
- File an issue: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- Read main README: [README.md](../README.md)
- Check troubleshooting: `.\SMS.ps1` → Option '8'
