# Scripts Directory

This directory contains management scripts for the Student Management System.

**Canonical entry points (v2.0+):** Use `..\DOCKER.ps1` (Docker deployment & operations) or `..\NATIVE.ps1` (native development mode). All former entry points (`RUN.ps1`, `SMS.ps1`, `INSTALL.ps1`, `scripts/dev/run-native.ps1`) are archived under `archive/deprecated/scripts_consolidation_2025-11-21/`.

## 📂 Directory Structure

```text
scripts/
├── README.md                  # This file
├── CLEANUP.bat                # Non-destructive cleanup
├── SMOKE_TEST.ps1             # Quick health validation
├── (Archived) SUPER_CLEAN_AND_DEPLOY.ps1 → replaced by DOCKER.ps1 flags
├── internal/                 # Internal utility scripts (advanced)
└── docker/                   # Docker-specific scripts
```

## 🎯 Main Scripts (Active)

### Docker Deployment & Operations (Production / Staging)

- **Location:** `..\DOCKER.ps1`
- **Purpose:** Consolidated Docker lifecycle (install, start/stop, update, monitoring, backups, logs, cleanup)
- **Usage Examples:**
  - Install: `.\DOCKER.ps1 -Install`
  - Start: `.\DOCKER.ps1 -Start`
  - Update (fast): `.\DOCKER.ps1 -Update`
  - Update (clean): `.\DOCKER.ps1 -UpdateClean`
  - Monitoring: `.\DOCKER.ps1 -WithMonitoring`
  - Backup: `.\DOCKER.ps1 -Backup`
  - Cleanup: `.\DOCKER.ps1 -Prune` / `-PruneAll` / `-DeepClean`
  - Status: `.\DOCKER.ps1 -Status`

### Native Development (Hot Reload)

- **Location:** `..\NATIVE.ps1`
- **Purpose:** Backend (uvicorn --reload) + frontend (Vite HMR) orchestration
- **Usage Examples:**
  - Setup deps: `.\NATIVE.ps1 -Setup`
  - Start full dev: `.\NATIVE.ps1 -Start`
  - Backend only: `.\NATIVE.ps1 -Backend`
  - Frontend only: `.\NATIVE.ps1 -Frontend`
  - Stop: `.\NATIVE.ps1 -Stop`
  - Clean artifacts: `.\NATIVE.ps1 -Clean`
  - Status: `.\NATIVE.ps1 -Status`

### Quick Health Check

- **Script:** `SMOKE_TEST.ps1`
- **Purpose:** Probe health endpoints & basic availability
- **Usage:** `.\SMOKE_TEST.ps1`

### Version Verification & Management

- **Script:** `VERIFY_VERSION.ps1`
- **Purpose:** Automated version consistency checking and updating across all project files
- **Documentation:** `docs/VERSION_AUTOMATION_GUIDE.md`
- **CI/CD Integration:** Runs in `version-verification` job of CI/CD pipeline (`ci-cd-pipeline.yml`)
- **Usage Examples:**
  - Check only: `.\VERIFY_VERSION.ps1`
  - Update all: `.\VERIFY_VERSION.ps1 -Update`
  - Generate report: `.\VERIFY_VERSION.ps1 -Report`
  - Specific version: `.\VERIFY_VERSION.ps1 -Version "1.9.0" -Update`
- **Exit Codes:**
  - `0`: Success (all consistent) ✅
  - `1`: Critical failure (blocks CI/CD) ❌
  - `2`: Inconsistencies found (blocks CI/CD) ⚠️

### Non-Destructive Cleanup

- **Script:** `CLEANUP.bat`
- **Purpose:** Remove caches, build artifacts (preserves data volumes & DB)
- **Usage:** `.\CLEANUP.bat`

## 🔧 Setup & Installation



### Initial Setup

> **Note:** As of v2.0, use `DOCKER.ps1 -Install` for first-time Docker setup and `NATIVE.ps1 -Setup` for developer environments. All prior setup scripts are archived.

---

## 📁 Subdirectories

### `internal/` - Internal Utility Scripts

These scripts were historically orchestrated by the legacy menu script `SMS.ps1` (now archived). They remain available for specialized maintenance or diagnostic tasks; most users won't need to run them directly under the consolidated v2.0 workflow.


**Diagnostics & Debugging:**

- `DEBUG_PORTS.ps1/.bat` - Show processes using ports 8000, 5173, 8080
- `DIAGNOSE_FRONTEND.ps1/.bat` - Frontend-specific diagnostics
- `DIAGNOSE_STATE.ps1` - Comprehensive system state analysis

**Maintenance & Cleanup:**

- `CLEANUP.bat` - Non-destructive cleanup
- `SUPER_CLEAN_AND_DEPLOY.ps1` - Full cleanup (temp files, logs, build artifacts, containers)
- `CLEANUP_DOCS.ps1` - Clean documentation artifacts
- `CLEANUP_OBSOLETE_FILES.ps1` - Remove obsolete files

**Development Tools:**

- `DEVTOOLS.ps1/.bat` - Advanced developer operations menu
- `CREATE_PACKAGE.ps1/.bat` - Package application for distribution
- `VERIFY_LOCALIZATION.ps1` - Verify translation completeness

**Emergency:**

- `KILL_FRONTEND_NOW.ps1/.bat` - Force kill frontend process

### `docker/` - Docker-Specific Scripts

Docker deployment and management helper scripts. Prefer `DOCKER.ps1` for consolidated operations; use these only for lower-level or experimental tasks.

**Compose Operations:**

- `DOCKER_UP.ps1` - Start Docker Compose services
- `DOCKER_DOWN.ps1` - Stop and remove Docker Compose services
- `DOCKER_REFRESH.ps1` - Rebuild and restart Docker Compose
- `DOCKER_SMOKE.ps1` - Quick health check for Docker deployment

**Fullstack Container:**

Use the consolidated launcher `..\DOCKER.ps1 -Start` to run the fullstack container. Legacy fullstack helpers and `RUN.ps1` were archived (see `archive/deprecated/scripts_consolidation_2025-11-21/`).

If you need lower-level control during development, use the Docker Compose helpers in `scripts/docker/` or run `docker compose` directly.

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
| (Archived) DOCKER_RUN.ps1 | Advanced Docker startup (superseded by DOCKER.ps1) |
| DOCKER_SMOKE.ps1 | Docker health check |
| DOCKER_UP.ps1 | Start Docker Compose |
| DOCKER_UPDATE_VOLUME.ps1 | Migrate volume data |

> **Legacy reference:** The removed `DOCKER_FULLSTACK_*` scripts are preserved in `archive/scripts/docker/` (and `archive/scripts/deploy/docker/`) for historical purposes.

<!-- Legacy table removed. All legacy scripts deprecated/removed. Use only DOCKER.ps1 and NATIVE.ps1 (v2.0+). -->

---

## ⚠️ Safety Notes

- **DOCKER.ps1 -Stop / NATIVE.ps1 -Stop** - Safe to use anytime, cleanly stop services/containers
- **KILL_FRONTEND_NOW.ps1** - ⚠️ Emergency only! Kills ALL Node.js processes system-wide
- **SUPER_CLEAN_AND_DEPLOY.ps1** (in root) - Full cleanup with optional rebuild
- **Docker scripts** - Some operations may require admin privileges

---

## 🚀 Recommended Workflow


### First Time Setup

```powershell
.\DOCKER.ps1 -Install   # First-time Docker setup
.\DOCKER.ps1 -Start     # Start fullstack container (auto-build if needed)
.\NATIVE.ps1 -Setup     # Install native dev dependencies
.\NATIVE.ps1 -Start     # Start backend + frontend (hot reload)
```

### Daily Usage

```powershell
# Docker daily
.\DOCKER.ps1 -Start
.\DOCKER.ps1 -Status
.\DOCKER.ps1 -Update      # or -UpdateClean

# Native daily
.\NATIVE.ps1 -Start
.\NATIVE.ps1 -Status
```

### Troubleshooting

```powershell
# Quick health probe
.\SMOKE_TEST.ps1

# Deep diagnostics
.\internal\DIAGNOSE_STATE.ps1

# Port analysis
.\internal\DEBUG_PORTS.ps1
```


### Development

```powershell
# Native dev mode (hot reload)
.\NATIVE.ps1 -Start
```

## 📝 Legacy Scripts

Some scripts have `.bat` equivalents - these simply call the `.ps1` versions.
The `.ps1` versions are the canonical implementation.

## 🆘 Quick Help

**Application won't start?**

```powershell
.\SMOKE_TEST.ps1
.\internal\DIAGNOSE_STATE.ps1
```

**Port already in use?**

```powershell
.\internal\DEBUG_PORTS.ps1
```

**Want to clean artifacts?**

```powershell
.\DOCKER.ps1 -Stop      # (if running)
.\CLEANUP.bat           # Non-destructive cleanup
```

**Need database backup?**

```powershell
.\DOCKER.ps1 -Backup
```

## 📚 Documentation

For more detailed documentation, see:

-- `../README.md` - Main project documentation (consolidation + latest highlights)
-- `../docs/user/QUICK_START_GUIDE.md` - Quick start guide
-- `../DEPLOYMENT_GUIDE.md` - Complete deployment instructions
-- `../docs/DOCUMENTATION_INDEX.md` - Master index (all guides)

### 🐧 Linux Helpers

-- `../scripts/linux_env_check.sh` — Validate Linux environment (Docker, Python, Node, pwsh, .env files); use `--fix` to auto-create safe items
-- `./dev/run-native.sh` — Native development (should mirror NATIVE.ps1 behavior)
-- `./deploy/run-docker-release.sh` — Docker release (should mirror DOCKER.ps1 behavior)

## 🔐 Safety Notes

- **DOCKER.ps1 -Stop / NATIVE.ps1 -Stop**: Safe - stops services cleanly
- **CLEANUP.ps1**: Safe - only removes build artifacts
- **KILL_FRONTEND_NOW.ps1**: ⚠️ **DANGEROUS** - kills ALL Node.js processes
- **DOCKER_DOWN.ps1**: Safe - stops containers but preserves data
- **DEVTOOLS.ps1 → Reset Database**: ⚠️ **DESTRUCTIVE** - deletes all data

## 💡 Tips

1. **Use DOCKER.ps1** for all Docker lifecycle operations (install, start, update, backup, logs, cleanup).
2. **Use NATIVE.ps1** for hot-reload development (backend + frontend).
3. **Use SMOKE_TEST.ps1 / internal diagnostics** for quick or deep troubleshooting.
4. **Backup before cleanup** - `DOCKER.ps1 -Backup` prior to `-DeepClean` or volume changes.
5. **Check logs** - `DOCKER.ps1 -Logs`.

---

**Need Help?** Run `.\DOCKER.ps1 -Help` or `.\NATIVE.ps1 -Help`, or see `README.md`.
