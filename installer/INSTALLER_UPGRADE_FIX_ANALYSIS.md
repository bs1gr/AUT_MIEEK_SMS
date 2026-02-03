# SMS Installer Upgrade Fix - Analysis & Solutions

**Date**: February 3, 2026
**Issue**: Installer creates parallel installations instead of upgrading in-place
**Severity**: 🔴 CRITICAL - Affects production deployment and data integrity
**Status**: PLANNING - Comprehensive fix to be implemented

---

## Problem Analysis

### 1. **Parallel Installations (PRIMARY ISSUE)**

**Symptoms**:
- Multiple SMS installations in `Program Files/SMS`, `Program Files/SMS-1.17.6`, `Program Files/SMS-1.17.7`, etc.
- Multiple Docker containers (sms-app, sms-app-1, sms-app-2, etc.)
- Multiple Docker volumes (sms-data-v1, sms-data-v2, etc.)
- Confusing UX with multiple shortcuts and uninstallers

**Root Causes**:
1. **Installation directory detection is weak**:
   - Uses `{autopf}\{#MyAppShortName}` (hardcoded default path)
   - Only checks registry for previous version
   - If registry missing/corrupt, creates new installation in new directory

2. **Upgrade logic doesn't enforce same directory**:
   - `UsePreviousAppDir=yes` allows directory change in wizard
   - No validation that new version installs to SAME directory as old

3. **Docker volume naming is version-specific**:
   - No `docker volume` created - relies on default `sms-app-data`
   - But container name `sms-app` conflicts if multiple instances running
   - No cleanup of orphaned volumes from failed upgrades

### 2. **Data Preservation Issues**

**Symptoms**:
- Backup created but not reliably restored
- `.env` files lost during upgrade
- Database (SQLite) lost if kept in wrong location
- Configuration settings reset

**Root Causes**:
1. **Backup logic only runs with `keepdata` task**:
   - User might uncheck it
   - No default backup on every upgrade
   - Backup path includes version number (fragile)

2. **Data directory detection is unclear**:
   - `{app}\data` is default, but not documented
   - No migration path if user moved database elsewhere
   - SQLite `.db` files might be in subdirectories

3. **Env file preservation incomplete**:
   - Only backs up `backend/.env` and `frontend/.env`
   - Doesn't restore them after upgrade
   - Root `.env` for Docker not preserved

### 3. **Docker Volume/Container Conflicts**

**Symptoms**:
- Multiple containers trying to use same port (8080)
- Data loss if old container removed
- Volume orphaning when installation fails
- Network bridge conflicts

**Root Causes**:
1. **Container name collision**:
   - All instances named `sms-app` (hardcoded in `docker-compose.yml`)
   - No version-specific or installation-id naming
   - Only one instance can run at a time

2. **Volume not explicitly managed**:
   - Default `sms-app_sms-data` volume auto-created
   - No cleanup on uninstall (volumes persist)
   - No version tracking for volumes

3. **Port binding conflicts**:
   - All instances want port 8080
   - No dynamic port allocation
   - No detection of port conflicts

### 4. **Uninstallation Issues**

**Symptoms**:
- Uninstalling one version breaks others
- Shared Docker image deleted when one instance removed
- Shortcuts removed even if other instances exist
- Registry entries deleted for all instances

**Root Causes**:
1. **No multi-instance tracking**:
   - Registry only tracks ONE installation
   - Uninstaller assumes it's removing the only instance
   - Doesn't check if other instances exist

2. **Aggressive cleanup**:
   - Removes Docker images without checking dependencies
   - Deletes shared volumes
   - Clears Start Menu entirely

3. **Uninstaller file handling**:
   - Renamed to `unins{version}.exe` for uniqueness
   - But only last uninstaller in registry is active
   - Other uninstallers become orphaned

---

## Solution Architecture

### Strategy: "Single Active Installation" Model

Instead of supporting multiple parallel installations, enforce:
- **One active SMS installation per machine** (at `{autopf}\SMS`)
- **Automatic upgrade in-place** (preserve all data by default)
- **Optional: Store installation ID + metadata** (for future multi-instance support)
- **Docker volume explicit naming** (tied to installation, not version)
- **Safe uninstall** (backup data before removal)

### Key Changes

#### 1. **Strict Installation Directory Enforcement**

```inno
; CHANGE: Force installation to SAME directory, ALWAYS
DefaultDirName={autopf}\{#MyAppShortName}
DisableDirPage=yes  ; Hide directory selection page

; If previous installation exists, MUST upgrade in-place
; No exceptions for version changes
```

**Benefits**:
- No parallel installations possible
- User can't select different directory
- Simpler registry tracking
- Cleaner Docker setup

#### 2. **Robust Upgrade Detection**

```inno
; NEW: Check multiple sources for existing installation
- Registry (HKLM, HKCU)
- File existence (docker_manager.bat, DOCKER.ps1)
- Docker container existence
- Docker volume existence

; Result: ALWAYS find existing installation, if any
```

**Benefits**:
- Catches installations with corrupted registry
- Detects partial/failed upgrades
- Clear upgrade vs. fresh install decision

#### 3. **Automatic Data Backup Before Upgrade**

```inno
; CHANGE: Always backup data on upgrade, no option to skip
; Backup stored: {app}\backups\pre_upgrade_YYYY-MM-DD_HHMMSS

Data directories:
- {app}\data\*
- {app}\backend\.env
- {app}\frontend\.env
- {app}\.env
- {app}\config\lang.txt
- {app}\backups\* (optional, user might want to clean)

Logs:
- {app}\logs\* (optional - not critical)
- {app}\backend\logs\* (optional)
```

**Benefits**:
- User can always rollback if needed
- No data loss on upgrade failures
- Timestamped backups allow multiple rollback points
- Clear audit trail of what was backed up

#### 4. **Docker Container Version Tracking**

```inno
; NEW: Store installation metadata
{app}\install_metadata.txt
  installation_id=<uuid>
  installed_version=1.17.7
  installed_date=2026-02-03T12:00:00Z
  data_directory={app}\data
  docker_container=sms-app
  docker_volume=sms-data

; Use metadata to:
- Validate upgrade path (1.17.6 -> 1.17.7 OK, not 1.17.7 -> 1.17.6)
- Track installation history
- Manage Docker resources specifically for this installation
```

**Benefits**:
- Clear version history
- Detects downgrades (prevent)
- Links installation to Docker resources
- Enables cleanup without breaking others

#### 5. **Explicit Docker Volume Management**

```bash
# CHANGE: Explicitly create named volume in docker-compose.yml
volumes:
  sms_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: "{app}\data"

services:
  app:
    volumes:
      - sms_data:/app/data
```

**Benefits**:
- No orphaned volumes
- Data directory clearly linked
- Easier cleanup
- Supports future multi-instance by using different paths

#### 6. **Unified Backup/Restore on Uninstall**

```inno
; CHANGE: On uninstall, backup data to removable location
; Ask user: Keep data, Backup to USB, or Delete

if user selects "Backup to USB":
  - Create backup at user-specified location
  - Verify backup integrity
  - Then delete app folder
  - Backup location is relocatable (important!)

if user selects "Keep data":
  - Leave {app}\data intact
  - Remove only code folders (backend, frontend, docker, scripts)
  - Allow easy reinstall without data loss

if user selects "Delete everything":
  - Delete entire {app} folder
  - Remove Docker container + volume
  - Clear registry
```

**Benefits**:
- Users never lose data accidentally
- Backup portable to new machine
- Clear recovery path
- Respects user choice

---

## Implementation Plan

### Phase 1: Installer Script Fixes (Critical)

**Priority 1: Installation Directory Enforcement**
- [ ] Set `DisableDirPage=yes` (force `{autopf}\SMS`)
- [ ] Add explicit directory validation in `InitializeSetup`
- [ ] Prevent directory selection override

**Priority 2: Robust Detection**
- [ ] Enhance `GetPreviousInstallPath()` with file checks
- [ ] Add `DockerContainerExists()` check
- [ ] Add `DockerVolumeExists()` check
- [ ] Return first valid detection source

**Priority 3: Safe Upgrade**
- [ ] Backup data BEFORE any file changes
- [ ] Create `install_metadata.txt` on every install
- [ ] Log upgrade path (old version -> new version)
- [ ] Restore `.env` files after install

**Priority 4: Docker Cleanup**
- [ ] Stop container by name (not hardcoded)
- [ ] Use `docker-compose down` (removes container, keeps volume)
- [ ] Preserve volume explicitly
- [ ] Skip container rebuild if upgrading (unless version-specific changes)

**Priority 5: Safe Uninstall**
- [ ] Backup to `{app}\data-backup-YYYYMMDD_HHMMSS`
- [ ] Ask user: "Keep data for reinstall?" (default YES)
- [ ] Only delete code folders if user confirms
- [ ] Don't touch Docker volume unless user explicitly agrees

### Phase 2: Docker Compose Updates

**Changes to `docker/docker-compose.yml`**:
```yaml
# Named volume instead of anonymous
volumes:
  sms_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_DIR:-./data}

services:
  app:
    volumes:
      - sms_data:/app/data
```

**Changes to `.env` template**:
```
# Installation metadata
INSTALLATION_ID=
INSTALLATION_VERSION=
DATA_DIR=./data
```

### Phase 3: Testing Protocol

**Upgrade Scenarios to Test**:
1. Fresh install v1.17.7
2. Upgrade v1.17.6 -> v1.17.7 (same directory)
3. Upgrade v1.17.5 -> v1.17.7 (skip version)
4. Repair install (same version reinstall)
5. Downgrade attempt (should warn)
6. Uninstall + Keep Data -> Reinstall

**Docker Scenarios**:
1. Container not running (cold install)
2. Container running during upgrade (stop, upgrade, restart)
3. Upgrade with multiple containers (ensure only correct one affected)
4. Volume persistence across upgrades

**Data Preservation**:
1. SQLite database survives upgrade
2. `.env` files preserved
3. Backups created and restorable
4. User can rollback manually

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `installer/SMS_Installer.iss` | Directory enforcement, detection, backup/restore logic | P1 |
| `docker/docker-compose.yml` | Named volume, env var support | P2 |
| `.env.example` | Add installation metadata vars | P3 |
| `installer/run_docker_install.cmd` | Use docker-compose, metadata handling | P2 |
| `installer/README.md` | Document new upgrade/uninstall workflow | P3 |

---

## Success Criteria

✅ **After Implementation**:
- Single installation per machine (no parallel installs)
- Automatic in-place upgrades (no directory changes)
- Data always backed up before changes
- Uninstall asks about data preservation
- Docker container/volume clearly linked to installation
- Multiple uninstallers don't break each other
- User can recover from failed upgrade
- Clear installation metadata for support/debugging

⏱️ **Timeline**: 4-6 hours for full implementation + testing

---

## Rollout Plan

1. **Phase 1** (1-2h): Implement installer script fixes
2. **Phase 2** (30m): Update docker-compose
3. **Phase 3** (30m): Testing & validation
4. **Phase 4** (1h): Build & sign new installer
5. **Phase 5** (1h): Documentation & release notes
6. **Phase 6** (1h): Deploy with migration guide for existing users

**Migration Guide for Existing Users**:
- If have v1.17.6 installed: Just run new installer (upgrade in-place)
- If have multiple instances: This installer will detect and consolidate
- Backup created automatically at `{app}\backups\pre_upgrade_*`
- Data never deleted unless explicitly confirmed

---

**Next Step**: Implement Phase 1 changes to installer script

