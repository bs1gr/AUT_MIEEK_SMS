# Scripts Directory

This directory contains management scripts for the Student Management System.

**Canonical entry points (v1.5.0+):** Use `..\RUN.ps1` (Docker, one-click) or `scripts/dev/run-native.ps1` (native dev only). Use `..\SMS.ps1` for Docker management. All other scripts are deprecated or internal.

## 📂 Directory Structure

```text
scripts/
├── README.md                  # This file
├── CLEANUP.bat               # Non-destructive cleanup
├── CLEANUP_COMPREHENSIVE.ps1 # Deep cleanup
├── SMOKE_TEST.ps1            # Quick health validation
├── internal/                 # Internal utility scripts (advanced)
└── docker/                   # Docker-specific scripts
```

## 🎯 Main Scripts (For End Users)


### Fullstack Docker Start (Recommended)

- **Location:** `..\RUN.ps1` (in project root)
- **Purpose:** One-command launcher for fullstack Docker deployment
- **Usage:** `.\RUN.ps1`
- **When to use:** Always use this for production, end-user, or test deployments (v1.5.0+)

### Native Development Start

- **Location:** `scripts/dev/run-native.ps1`
- **Purpose:** Start backend and frontend in native development mode (hot reload)
- **Usage:** `pwsh -NoProfile -File scripts/dev/run-native.ps1`
- **When to use:** For local development and debugging (only supported native entry point as of v1.5.0)

### Unified Management Interface ⭐ RECOMMENDED

- **Location:** `..\SMS.ps1` (in project root)
- **Purpose:** Interactive menu-driven management interface for Docker containers
- **Usage:** `.\SMS.ps1`
- **Features:**
  - Start/Stop/Restart Docker containers
  - System diagnostics and troubleshooting
  - Database backup and restore
  - View logs and environment info
  - Port conflict detection
  - Advanced developer tools access
- **Why use this:** All-in-one interface, supersedes most individual scripts. Use for all Docker management.

### Emergency Stop (deprecated)

- **Script:** `STOP.ps1` / `STOP.bat` (deprecated)
- **Purpose:** Deprecated. Use `.\SMS.ps1 -Stop` instead. All direct stop scripts are removed in v1.5.0+.

## 🔧 Setup & Installation



### Initial Setup

> **Note:** As of v1.5.0, all setup is handled automatically by `RUN.ps1` (Docker) or `scripts/dev/run-native.ps1` (native). All other setup scripts are deprecated.

---

## 📁 Subdirectories

### `internal/` - Internal Utility Scripts

These scripts are used internally by SMS.ps1 or for specialized maintenance tasks. Most users won't need to run these directly.


**Diagnostics & Debugging:**
  - `DEBUG_PORTS.ps1/.bat` - Show processes using ports 8000, 5173, 8080
  - `DIAGNOSE_FRONTEND.ps1/.bat` - Frontend-specific diagnostics
  - `DIAGNOSE_STATE.ps1` - Comprehensive system state analysis

**Maintenance & Cleanup:**
  - `CLEANUP.bat` - Non-destructive cleanup
  - `CLEANUP_COMPREHENSIVE.ps1` - Deep cleanup (temp files, logs, build artifacts)
  - `CLEANUP_DOCS.ps1` - Clean documentation artifacts
  - `CLEANUP_OBSOLETE_FILES.ps1` - Remove obsolete files

**Development Tools:**

- `DEVTOOLS.ps1/.bat` - Advanced developer operations menu
- `CREATE_PACKAGE.ps1/.bat` - Package application for distribution
- `VERIFY_LOCALIZATION.ps1` - Verify translation completeness

**Emergency:**

- `KILL_FRONTEND_NOW.ps1/.bat` - Force kill frontend process

### `docker/` - Docker-Specific Scripts

Docker deployment and management scripts. Use SMS.ps1 for interactive Docker operations.

**Compose Operations:**

- `DOCKER_UP.ps1` - Start Docker Compose services
- `DOCKER_DOWN.ps1` - Stop and remove Docker Compose services
- `DOCKER_REFRESH.ps1` - Rebuild and restart Docker Compose
- `DOCKER_SMOKE.ps1` - Quick health check for Docker deployment

**Fullstack Container:**

Use the canonical one-click launcher `..\RUN.ps1` to start a single fullstack Docker container. The `RUN.ps1` script wraps and replaces older `DOCKER_FULLSTACK_*` helpers and provides a stable, documented entry point for production-style execution.

If you need lower-level control during development, use the Docker Compose helpers in `scripts/docker/` or run `docker compose` directly.

**Volume Management:**

- `DOCKER_UPDATE_VOLUME.ps1` - Migrate data between volume configurations

<!-- Note: All legacy/ and setup/stop scripts removed or deprecated in v1.5.0. Use only RUN.ps1, scripts/dev/run-native.ps1, and SMS.ps1. -->

---

## 🎯 Decision Tree: Which Script Should I Use?


**Starting the application?**
→ Use `RUN.ps1` (Docker, one-click) or `scripts/dev/run-native.ps1` (native dev only)


**Need to stop everything?**
→ Use `SMS.ps1 -Stop` or SMS.ps1 menu


**First time setup?**
→ Use `RUN.ps1` (Docker) or `scripts/dev/run-native.ps1` (native)

**Troubleshooting issues?**
→ Use `SMS.ps1` → Option 6 (Diagnostics)

**Database backup/restore?**
→ Use `SMS.ps1` → Option 4 (Database Management)

**Port conflicts?**
→ Use `SMS.ps1` → Option 7 (Debug Ports) or `.\scripts\internal\DEBUG_PORTS.ps1`

**Docker operations?**
→ Use `SMS.ps1` → Option 5 (Docker Management) or `docker/` scripts

**Advanced development tasks?**
→ Use `.\scripts\internal\DEVTOOLS.ps1` or SMS.ps1 menu

---

## 🔧 Script Reference (Alphabetical)


### Main User-Facing Scripts (Root & scripts/)

| Script | Location | Purpose |
|--------|----------|---------|
| RUN.ps1 | Root | Canonical Docker entry point (one-click) |
| scripts/dev/run-native.ps1 | scripts/dev/ | Canonical native entry point (dev only) |
| SMS.ps1 | Root | Unified management interface (recommended) |
| CLEANUP.bat | scripts/ | Non-destructive cleanup |
| CLEANUP_COMPREHENSIVE.ps1 | scripts/ | Deep cleanup |

### Internal Utility Scripts (scripts/internal/)

| Script | Purpose |
|--------|---------|
| CLEANUP.ps1/.bat | Clean temporary files |
| CLEANUP_COMPREHENSIVE.ps1 | Thorough system cleanup |
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
| DOCKER_FULLSTACK_DOWN.ps1 | Stop fullstack container (legacy) |
| DOCKER_FULLSTACK_REFRESH.ps1 | Rebuild fullstack container (legacy) |
| DOCKER_FULLSTACK_UP.ps1 | Start fullstack container (legacy) |
| DOCKER_REFRESH.ps1 | Rebuild Docker Compose |
| DOCKER_RUN.ps1 | Advanced Docker startup |
| DOCKER_SMOKE.ps1 | Docker health check |
| DOCKER_UP.ps1 | Start Docker Compose |
| DOCKER_UPDATE_VOLUME.ps1 | Migrate volume data |

<!-- Legacy table removed. All legacy scripts are deprecated/removed in v1.5.0. Use only RUN.ps1, scripts/dev/run-native.ps1, and SMS.ps1. -->

---

## ⚠️ Safety Notes

- **STOP.ps1** - Safe to use anytime, cleanly stops all services
- **KILL_FRONTEND_NOW.ps1** - ⚠️ Emergency only! Kills ALL Node.js processes system-wide
- **CLEANUP_COMPREHENSIVE.ps1** - Deletes temporary files, use with caution
- **Docker scripts** - Some operations may require admin privileges

---

## 🚀 Recommended Workflow


### First Time Setup

```powershell
.\RUN.ps1    # One-click Docker setup and start (recommended)
pwsh -NoProfile -File scripts/dev/run-native.ps1   # Native dev only
```

### Daily Usage

```powershell
# Start
.\RUN.ps1

# Stop (preferred)
.\SMS.ps1 -Stop

# Manage
.\SMS.ps1
```

### Troubleshooting

```powershell
# Check what's wrong
.\scripts\DIAGNOSE_STATE.ps1

# Detailed port analysis
.\scripts\DEBUG_PORTS.ps1

# Full management interface
.\SMS.ps1    # Select diagnostics options
```


### Development

```powershell
# Native dev mode (hot reload)
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

## 📝 Legacy Scripts

Some scripts have `.bat` equivalents - these simply call the `.ps1` versions.
The `.ps1` versions are the canonical implementation.

## 🆘 Quick Help

**Application won't start?**

```powershell
.\scripts\DIAGNOSE_STATE.ps1    # See what's wrong
.\SMS.ps1                       # Use menu option 6 or 8
```

**Port already in use?**

```powershell
.\scripts\DEBUG_PORTS.ps1       # See what's using ports
.\scripts\STOP.ps1              # Stop conflicts
```

**Want to reset everything?**

```powershell
.\scripts\STOP.ps1              # Stop all services
.\scripts\CLEANUP.ps1           # Clean temporary files
.\scripts\SETUP.ps1             # Reinstall dependencies
```

**Need database backup?**

```powershell
.\SMS.ps1                       # Select option 'B'
```

## 📚 Documentation

For more detailed documentation, see:

- `../README.md` - Main project documentation
- `../docs/QUICK_START_GUIDE.md` - Quick start guide
- `../DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `../docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md` - Fresh deployment troubleshooting
- `../docs/REBUILD_TROUBLESHOOTING.md` - Rebuild troubleshooting

### 🐧 Linux Helpers

- `../scripts/linux_env_check.sh` — Validate Linux environment (Docker, Python, Node, pwsh, .env files); use `--fix` to auto-create safe items
- `./dev/run-native.sh` — Start in native development mode (delegates to SMART_SETUP.ps1)
- `./deploy/run-docker-release.sh` — Start in Docker release mode (delegates to SMART_SETUP.ps1)

## 🔐 Safety Notes

- **STOP.ps1**: Safe - stops services cleanly
- **CLEANUP.ps1**: Safe - only removes build artifacts
- **KILL_FRONTEND_NOW.ps1**: ⚠️ **DANGEROUS** - kills ALL Node.js processes
- **DOCKER_DOWN.ps1**: Safe - stops containers but preserves data
- **DEVTOOLS.ps1 → Reset Database**: ⚠️ **DESTRUCTIVE** - deletes all data

## 💡 Tips

1. **Use RUN.ps1** for simplicity - it handles everything automatically
2. **Use SMS.ps1** for interactive management - menu-driven, can't go wrong
3. **Use DIAGNOSE_STATE.ps1** when confused - shows current state and next steps
4. **Backup before resetting** - Use SMS.ps1 → Backup before destructive operations
5. **Check logs** - SMS.ps1 → Option 9 shows application logs

---

**Need Help?** Run `.\SMS.ps1` and select option 'H' for help, or see `README.md`
