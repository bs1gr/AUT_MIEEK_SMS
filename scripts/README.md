# Scripts Directory
.
.\NATIVE.ps1 -Start           # Start both backend + frontend

This directory contains management scripts for the Student Management System.

## 🚀 Quick Start - v2.0

**Use these main entry points:**

- **Production/Docker:** `.\DOCKER.ps1` (from repository root)
- **Development/Native:** `.\NATIVE.ps1` (from repository root)

> **Note:** Legacy scripts were consolidated into DOCKER.ps1 and NATIVE.ps1 in v2.0. See archive/pre-v1.9.1/ for historical reference.

## 📂 Directory Structure

```text
scripts/
├── README.md                      # This file
├── VERIFY_VERSION.ps1             # ✅ Version management automation
├── SMOKE_TEST.ps1                 # ✅ Quick health check
├── CHECK_VOLUME_VERSION.ps1       # ✅ DB schema version check
├── VERIFY_WORKSPACE.ps1           # ✅ Workspace integrity check
├── dev/                           # 💻 Development tools
├── deploy/                        # 🚀 Deployment scripts
│   └── docker/                    # 🐳 Docker helpers
├── ops/                           # 🛠️  Operations (releases, packages)
├── maintenance/                   # 🔧 Maintenance tasks
├── operator/                      # 👤 Operator-only (destructive)
├── docs/                          # 📚 Documentation automation
└── ci/                            # 🤖 CI/CD scripts
```

## 🎯 Main Scripts (v2.0)

## 🎯 Main Scripts (v2.0)

### 🐳 DOCKER.ps1 - Docker Deployment & Operations

**Location:** `..\DOCKER.ps1` (repository root)

**Purpose:** Complete Docker lifecycle management

**Common Commands:**

```powershell
.\DOCKER.ps1 -Install         # First-time installation
.\DOCKER.ps1 -Start           # Start application (default)
.\DOCKER.ps1 -Stop            # Stop application
.\DOCKER.ps1 -Restart         # Restart application
.\DOCKER.ps1 -Update          # Fast update (cached build + backup)
.\DOCKER.ps1 -UpdateClean     # Clean update (no-cache + backup)
.\DOCKER.ps1 -Status          # Check application status
.\DOCKER.ps1 -Logs            # Show logs (follow mode)
.\DOCKER.ps1 -Backup          # Manual database backup
.\DOCKER.ps1 -WithMonitoring  # Start with Grafana/Prometheus
.\DOCKER.ps1 -StopMonitoring  # Stop monitoring stack only
.\DOCKER.ps1 -Prune           # Prune Docker caches (safe)
.\DOCKER.ps1 -PruneAll        # Aggressive prune (dangling images)
.\DOCKER.ps1 -DeepClean       # Nuclear cleanup (volumes too)
.\DOCKER.ps1 -Shell           # Enter container shell
.\DOCKER.ps1 -Help            # Show all options
```

### 💻 NATIVE.ps1 - Native Development Mode

**Location:** `..\NATIVE.ps1` (repository root)

**Purpose:** Backend (FastAPI) + Frontend (Vite) with hot-reload

**Common Commands:**

```powershell
.\NATIVE.ps1 -Setup           # Install/update dependencies
.\NATIVE.ps1 -Start           # Start both backend + frontend
 

.\NATIVE.ps1 -Backend         # Backend only (uvicorn --reload)
.\NATIVE.ps1 -Frontend        # Frontend only (Vite HMR)
.\NATIVE.ps1 -Stop            # Stop all processes
.\NATIVE.ps1 -Status          # Show running processes
.\NATIVE.ps1 -Clean           # Clean artifacts (node_modules, .venv, caches)
.\NATIVE.ps1 -Help            # Show all options
```

Note: DEV_EASE is reserved for the pre-commit tool `COMMIT_READY.ps1` only and must not be used to change runtime behavior when starting backend or frontend. To allow local pre-commit skips (tests/cleanup/fixes) set the environment variable `DEV_EASE=true` before running `COMMIT_READY.ps1`.

### Git hooks (optional)

We provide a sample Git pre-commit hook that runs `COMMIT_READY.ps1 -Mode quick` automatically before commits.

- Sample hook: `.githooks/commit-ready-precommit.sample`
- Install manually by copying to `.git/hooks/pre-commit` and making it executable:

  ```bash
  cp .githooks/commit-ready-precommit.sample .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  ```

- Or use the helper scripts in `scripts/` to install hooks across platforms:


- PowerShell (Windows):

  ```powershell
  pwsh ./scripts/install-git-hooks.ps1
  ```

- POSIX (Linux/macOS):

  ```bash
  ./scripts/install-git-hooks.sh
  ```

On Windows you may prefer a PowerShell hook variant which invokes `pwsh -NoProfile -ExecutionPolicy Bypass -File ./COMMIT_READY.ps1 -Mode quick`.

This hook helps catch lint/test issues early. If you intentionally want to skip steps that require DEV_EASE (SkipTests, SkipCleanup or AutoFix), set `DEV_EASE=true` in your shell before running `COMMIT_READY.ps1`.

### 🔍 SMOKE_TEST.ps1 - Quick Health Check

**Location:** `.\scripts\SMOKE_TEST.ps1`

**Purpose:** Probe health endpoints & basic availability

```powershell
.\scripts\SMOKE_TEST.ps1      # Run health checks
```

### 📋 VERIFY_VERSION.ps1 - Version Management

**Location:** `.\scripts\VERIFY_VERSION.ps1`

**Purpose:** Automated version consistency checking and updating

```powershell
.\scripts\VERIFY_VERSION.ps1              # Check only
.\scripts\VERIFY_VERSION.ps1 -Update      # Update all files
.\scripts\VERIFY_VERSION.ps1 -Report      # Generate report
```

**Documentation:** `docs/development/VERSION_MANAGEMENT_GUIDE.md`

### 🗄️ CHECK_VOLUME_VERSION.ps1 - Database Schema Check

**Location:** `.\scripts\CHECK_VOLUME_VERSION.ps1`

**Purpose:** Check DB schema version consistency between Docker volume and codebase

```powershell
.\scripts\CHECK_VOLUME_VERSION.ps1              # Check version
.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate # Auto-migrate if mismatch
```

---

## 🗂️ Subdirectories

## 🗂️ Subdirectories

### `dev/internal/` - Internal Utilities (Advanced Users)

Specialized maintenance and diagnostic tools. Most users won't need these directly under v2.0.

**Active Scripts:**

- `DEBUG_PORTS.ps1` - Show processes using ports 8000, 5173, 8080
- `DIAGNOSE_FRONTEND.ps1` - Frontend-specific diagnostics
- `DIAGNOSE_STATE.ps1` - Comprehensive system state analysis
- `DEVTOOLS.ps1` - Development tooling utilities
- `CLEANUP_COMPREHENSIVE.ps1` - Master cleanup script (removes obsolete files, cache, build artifacts)
- `VERIFY_LOCALIZATION.ps1` - Translation key parity checker
- `TEST_TERMINAL.ps1` - Terminal configuration tester

**Deprecated Scripts:**

- `KILL_FRONTEND_NOW.ps1` - ⚠️ Moved to `operator/` → Use `NATIVE.ps1 -Stop`
- `CLEANUP_OBSOLETE_FILES.ps1` - ⚠️ Consolidated into `CLEANUP_COMPREHENSIVE.ps1`
- `CLEANUP_DOCS.ps1` - ⚠️ Removed (empty file)

### `docker/` - Docker Helpers (Mostly Deprecated)

Low-level Docker scripts, mostly replaced by `DOCKER.ps1`.

**Status:** Most scripts deprecated and show migration messages. Use `DOCKER.ps1` instead.

### `dev/` - Development Tools

Development-specific utilities and helpers.

**Active:**

- `upgrade-pip.ps1` - Upgrade pip in Python environments
- `SMOKE_TEST.ps1` - Development smoke tests
- `internal/` - Dev-specific utilities (similar to main internal/)

### `deploy/` - Deployment Scripts

Deployment automation and packaging tools.

**Active:**

- `set-docker-metadata.ps1` - Set Docker image metadata
- `run-docker-release.ps1` - Run release Docker image
- `CHECK_VOLUME_VERSION.ps1` - Version checking for deployment
- `internal/CREATE_DEPLOYMENT_PACKAGE.ps1` - Package creation (comprehensive, includes Docker image support)

**Deprecated:**

- `internal/CREATE_PACKAGE.ps1` - ⚠️ Consolidated into `CREATE_DEPLOYMENT_PACKAGE.ps1` (more comprehensive)
- `STOP.ps1` - ⚠️ Use `DOCKER.ps1 -Stop`

### `ops/` - Operations Scripts

GitHub releases, package management, and operational automation.

**Active:**

- `archive-releases.ps1` - Archive legacy GitHub releases
- `remove-legacy-packages.ps1` - GHCR cleanup helper

**Documentation:** See script headers for detailed usage

### `maintenance/` - Maintenance Tasks

System maintenance utilities.

**Active:**

- `stop_frontend_safe.ps1` - Safe frontend shutdown

### `operator/` - Operator-Only Scripts (Destructive)

Scripts requiring explicit operator intervention. **Use with caution.**

**Active:**

- `stop_monitor.ps1` - Stop monitoring services
- `KILL_FRONTEND_NOW.ps1` - Emergency frontend killer (requires `-Confirm`)

### `docs/` - Documentation Automation

Documentation validation and auditing.

**Active:**

- `audit-docs.ps1` - Document status auditing

### `ci/` - CI/CD Scripts

Continuous integration and deployment automation.

**Active:**

- `native-safety.ps1` - Safety checks for native builds

---

## ⚠️ Deprecated Scripts & Migration Guide

### v1.9.7+ Script Consolidation

The following scripts have been **archived** and replaced by unified scripts:

#### Pre-v1.9.1 Scripts (Archived to `archive/pre-v1.9.1/`)

| Deprecated Script | Replacement | Status |
|-------------------|-------------|--------|
| `RUN.ps1` | `.\DOCKER.ps1 -Start` | ✅ Archived |
| `INSTALL.ps1` | `.\DOCKER.ps1 -Install` | ✅ Archived |
| `SMS.ps1` | `.\DOCKER.ps1 -Help` | ✅ Archived |
| `run-native.ps1` | `.\NATIVE.ps1 -Start` | ✅ Archived |

#### Pre-v1.9.7 Docker Scripts (Archived to `archive/pre-v1.9.7-docker-scripts/`)

| Deprecated Script | Replacement | Status |
|-------------------|-------------|--------|
| `DOCKER_UP.ps1` | `.\DOCKER.ps1 -Start` | ✅ Archived |
| `DOCKER_DOWN.ps1` | `.\DOCKER.ps1 -Stop` | ✅ Archived |
| `DOCKER_REFRESH.ps1` | `.\DOCKER.ps1 -UpdateClean` | ✅ Archived |
| `DOCKER_RUN.ps1` | `.\DOCKER.ps1 -Start` | ✅ Archived |
| `DOCKER_SMOKE.ps1` | `.\scripts\SMOKE_TEST.ps1` | ✅ Archived |
| `DOCKER_UPDATE_VOLUME.ps1` | `.\DOCKER.ps1 -Update` | ✅ Archived |

**Migration Note:** All deprecated functionality is preserved in `DOCKER.ps1` (v2.0). See archived scripts for migration notes.

### Root-level Deprecated Scripts

| Script | Replacement | Status |
|--------|-------------|--------|
| `SETUP.ps1` | `DOCKER.ps1 -Install` or `NATIVE.ps1 -Setup` | Shows deprecation message |
| `STOP.ps1` | `DOCKER.ps1 -Stop` or `NATIVE.ps1 -Stop` | Shows deprecation message |

### Docker Subdirectory Deprecated Scripts

Legacy `scripts/docker/` folder was removed. Docker helpers now live in `scripts/deploy/docker/`.

**Example:**

```powershell
# Old (deprecated)
.\scripts\docker\DOCKER_FULLSTACK_UP.ps1

# New (v2.0)
.\DOCKER.ps1 -Start
```

### PowerShell Installer Wizards (v1.9.7+ Consolidated to Inno Setup)

All PowerShell-based installer wizards in `tools/installer/` have been consolidated into a single Inno Setup-based system (canonical: `installer/SMS_Installer.iss`).

| Deprecated Script | Status | Replacement |
|-------------------|--------|-------------|
| `SMS_INSTALLER_WIZARD.ps1` | ⚠️ Legacy | `installer/SMS_Installer.iss` + `SMS_Installer_{version}.exe` |
| `SMS_UNINSTALLER_WIZARD.ps1` | ⚠️ Legacy | Uninstall_SMS_{version}.exe (created by Inno Setup) |
| `BUILD_SIMPLE.ps1` | ⚠️ Legacy | `.\INSTALLER_BUILDER.ps1` (root level) |
| `BUILD_INSTALLER_EXECUTABLE.ps1` | ⚠️ Legacy | `.\INSTALLER_BUILDER.ps1` (root level) |

**Why:** Inno Setup provides:

- Better Windows integration
- Code signing support
- Native uninstaller generation
- Simpler distribution

**User Impact:** Users should download the .exe installer from GitHub Releases instead of running PowerShell scripts directly.

---

## 🔄 Migration Guide

**See:** [SCRIPTS_CONSOLIDATION_GUIDE.md](../archive/pre-v1.9.1/SCRIPTS_CONSOLIDATION_GUIDE.md) for complete migration instructions (archived).

### Consolidated Commands

All legacy cleanup, deployment, and management scripts have been consolidated:

| Old Script | New Command |
|-----------|-------------|
| `SUPER_CLEAN_AND_DEPLOY.ps1` | `.\DOCKER.ps1 -DeepClean` |
| `DEEP_DOCKER_CLEANUP.ps1` | `.\DOCKER.ps1 -DeepClean` |
| `RUN.ps1` | `.\DOCKER.ps1 -Start` |
| `INSTALL.ps1` | `.\DOCKER.ps1 -Install` |
| `SMS.ps1` | `.\DOCKER.ps1 -Help` |
| `run-native.ps1` | `.\NATIVE.ps1 -Start` |

**Development Tools:**

- `dev/internal/DEVTOOLS.ps1` - Advanced developer operations menu
- `deploy/internal/CREATE_PACKAGE.ps1` - Package application for distribution
- `dev/internal/VERIFY_LOCALIZATION.ps1` - Verify translation completeness

**Emergency:**

- `operator/KILL_FRONTEND_NOW.ps1` - Force kill frontend process (requires `-Confirm`)

### `deploy/docker/` - Docker-Specific Scripts

Docker deployment and management helper scripts. Prefer `DOCKER.ps1` for consolidated operations; use these only for lower-level or experimental tasks.

**Compose Operations:**

- `DOCKER_UP.ps1` - Start Docker Compose services
- `DOCKER_DOWN.ps1` - Stop and remove Docker Compose services
- `DOCKER_REFRESH.ps1` - Rebuild and restart Docker Compose
- `DOCKER_SMOKE.ps1` - Quick health check for Docker deployment

**Fullstack Container:**

Use the consolidated launcher `..\DOCKER.ps1 -Start` to run the fullstack container. Legacy fullstack helpers were archived to `archive/pre-v1.9.1/`.

If you need lower-level control during development, use the Docker Compose helpers in `scripts/deploy/docker/` or run `docker compose` directly.

**Volume Management:**

- `DOCKER_UPDATE_VOLUME.ps1` - Migrate data between volume configurations

<!-- Legacy scripts removed in v2.0. Use only DOCKER.ps1 and NATIVE.ps1. -->

---

## 🎯 Decision Tree: Which Script Should I Use?


**Starting the application?**
→ Docker: `DOCKER.ps1 -Start` | Native: `NATIVE.ps1 -Start`

**Stopping everything?**
→ Docker: `DOCKER.ps1 -Stop` | Native: `NATIVE.ps1 -Stop`

**First-time install?**
→ `DOCKER.ps1 -Install` (Docker) | `NATIVE.ps1 -Setup` (native dev)

**Troubleshooting?**
→ `SMOKE_TEST.ps1` (quick), `internal/DIAGNOSE_STATE.ps1` (deep)

**Database backup?**
→ `DOCKER.ps1 -Backup`

**Port conflicts?**
→ `internal/DEBUG_PORTS.ps1`

**Advanced dev tools?**
→ `internal/DEVTOOLS.ps1`

---

## 🔧 Script Reference (Alphabetical)


### Main User-Facing Scripts (Root & scripts/)

| Script | Location | Purpose |
|--------|----------|---------|
| DOCKER.ps1 | Root | Consolidated Docker lifecycle & ops |
| NATIVE.ps1 | Root | Consolidated native dev lifecycle |
| CLEANUP.bat | scripts/ | Non-destructive cleanup |

### Internal Utility Scripts (scripts/internal/)

| Script | Purpose |
|--------|---------||
| CLEANUP.ps1/.bat | Clean temporary files |
| CLEANUP_DOCS.ps1 | Clean documentation artifacts |
| CLEANUP_OBSOLETE_FILES.ps1 | Remove obsolete files |
| CREATE_PACKAGE.ps1/.bat | Package for distribution |
| DEBUG_PORTS.ps1/.bat | Show port usage |
| DEVTOOLS.ps1/.bat | Advanced developer menu |
| DIAGNOSE_FRONTEND.ps1/.bat | Frontend diagnostics |
| DIAGNOSE_STATE.ps1 | System state analysis |
| KILL_FRONTEND_NOW.ps1/.bat | Force kill frontend |
| VERIFY_LOCALIZATION.ps1 | Check translation completeness |

### Docker Scripts (scripts/docker/)

| Script | Purpose |
|--------|---------|
| DOCKER_DOWN.ps1 | Stop Docker Compose services |
| DOCKER_REFRESH.ps1 | Rebuild Docker Compose |
| DOCKER_SMOKE.ps1 | Docker health check |
| DOCKER_UP.ps1 | Start Docker Compose |
| DOCKER_UPDATE_VOLUME.ps1 | Migrate volume data |

> **Note:** Most Docker scripts deprecated. Use `DOCKER.ps1` for primary operations. See `archive/deprecated/scripts_consolidation_2025-11-21/` for archived scripts.

---

## 📖 Additional Resources

- **Main Repository README:** `../README.md`
- **Scripts Consolidation Guide:** `../archive/pre-v1.9.1/SCRIPTS_CONSOLIDATION_GUIDE.md` (archived)
- **Documentation Index:** `../docs/DOCUMENTATION_INDEX.md`
- **Quick Start Guide:** `../docs/user/QUICK_START_GUIDE.md`
- **Developer Guide:** `../docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- **Deployment Guide:** `../DEPLOYMENT_GUIDE.md`

---

**Last Updated:** November 25, 2025  
**Version:** 2.0  
**Maintained By:** Development Team

**Need Help?** Run `.\DOCKER.ps1 -Help` or `.\NATIVE.ps1 -Help`, or see `README.md`.
