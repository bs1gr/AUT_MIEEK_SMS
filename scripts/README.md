# Scripts Directory

This directory contains management scripts for the Student Management System.

## 📂 Directory Structure

```
scripts/
├── README.md                    # This file
├── SETUP.ps1/.bat              # Initial setup scripts
├── STOP.ps1/.bat               # Emergency stop scripts
├── internal/                   # Internal utility scripts
├── docker/                     # Docker-specific scripts
└── legacy/                     # Legacy/superseded scripts
```

## 🎯 Main Scripts (For End Users)

### Quick Start
- **Location:** `../QUICKSTART.ps1` (in project root)
- **Purpose:** Simple one-command launcher to start the application
- **Usage:** `.\QUICKSTART.ps1`
- **When to use:** Every time you want to start the app

### Unified Management Interface ⭐ RECOMMENDED
- **Location:** `../SMS.ps1` (in project root)
- **Purpose:** Interactive menu-driven management interface for all operations
- **Usage:** `.\SMS.ps1`
- **Features:**
  - Start/Stop/Restart application (Docker or Native mode)
  - System diagnostics and troubleshooting
  - Database backup and restore
  - View logs and environment info
  - Port conflict detection
  - Advanced developer tools access
- **Why use this:** All-in-one interface, supersedes most individual scripts

### Emergency Stop
- **Script:** `STOP.ps1` / `STOP.bat`
- **Purpose:** Stop all running services (Docker containers or native processes)
- **Usage:** `.\scripts\STOP.ps1`
- **When to use:** When you need to quickly stop everything

## 🔧 Setup & Installation

### Initial Setup
- **Script:** `SETUP.ps1` / `SETUP.bat`
- **Purpose:** First-time installation of dependencies
- **Usage:** `.\scripts\SETUP.ps1`
- **Installs:**
  - Python virtual environment
  - Python packages
  - Node.js dependencies

---

## 📁 Subdirectories

### `internal/` - Internal Utility Scripts

These scripts are used internally by SMS.ps1 or for specialized maintenance tasks. Most users won't need to run these directly.

**Diagnostics & Debugging:**
- `DEBUG_PORTS.ps1/.bat` - Show processes using ports 8000, 5173, 8080
- `DIAGNOSE_FRONTEND.ps1/.bat` - Frontend-specific diagnostics
- `DIAGNOSE_STATE.ps1` - Comprehensive system state analysis

**Maintenance & Cleanup:**
- `CLEANUP.ps1/.bat` - Clean temporary files and caches
- `CLEANUP_COMPREHENSIVE.ps1` - Thorough cleanup (temp files, logs, build artifacts)
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
- `DOCKER_FULLSTACK_UP.ps1` - Start fullstack container (single container mode)
- `DOCKER_FULLSTACK_DOWN.ps1` - Stop fullstack container
- `DOCKER_FULLSTACK_REFRESH.ps1` - Rebuild fullstack container
- `DOCKER_RUN.ps1` - Advanced Docker startup with mode selection

**Volume Management:**
- `DOCKER_UPDATE_VOLUME.ps1` - Migrate data between volume configurations

### `legacy/` - Legacy Scripts (Superseded)

These scripts are kept for compatibility but are superseded by SMS.ps1 unified interface.

- `RUN.ps1/.bat` - Start application in native mode (use SMS.ps1 or QUICKSTART.ps1 instead)
- `INSTALL.ps1/.bat` - Install dependencies (use SMS.ps1 Setup menu instead)

---

## 🎯 Decision Tree: Which Script Should I Use?

**Starting the application?**
→ Use `QUICKSTART.ps1` (simple) or `SMS.ps1` (full control)

**Need to stop everything?**
→ Use `STOP.ps1` or SMS.ps1 menu

**First time setup?**
→ Use `SETUP.ps1` or SMS.ps1 Setup menu

**Troubleshooting issues?**
→ Use `SMS.ps1` → Option 6 (Diagnostics)

**Database backup/restore?**
→ Use `SMS.ps1` → Option 4 (Database Management)

**Port conflicts?**
→ Use `SMS.ps1` → Option 7 (Debug Ports) or `internal/DEBUG_PORTS.ps1`

**Docker operations?**
→ Use `SMS.ps1` → Option 5 (Docker Management) or `docker/` scripts

**Advanced development tasks?**
→ Use `internal/DEVTOOLS.ps1` or SMS.ps1 menu

---

## 🔧 Script Reference (Alphabetical)

### Main User-Facing Scripts (Root & scripts/)

| Script | Location | Purpose |
|--------|----------|---------|
| QUICKSTART.ps1 | Root | Simple launcher to start application |
| SMS.ps1 | Root | Unified management interface (recommended) |
| SETUP.ps1/.bat | scripts/ | Initial setup and dependency installation |
| STOP.ps1/.bat | scripts/ | Emergency stop for all services |

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
| DOCKER_FULLSTACK_DOWN.ps1 | Stop fullstack container |
| DOCKER_FULLSTACK_REFRESH.ps1 | Rebuild fullstack container |
| DOCKER_FULLSTACK_UP.ps1 | Start fullstack container |
| DOCKER_REFRESH.ps1 | Rebuild Docker Compose |
| DOCKER_RUN.ps1 | Advanced Docker startup |
| DOCKER_SMOKE.ps1 | Docker health check |
| DOCKER_UP.ps1 | Start Docker Compose |
| DOCKER_UPDATE_VOLUME.ps1 | Migrate volume data |

### Legacy Scripts (scripts/legacy/)

| Script | Purpose | Use Instead |
|--------|---------|-------------|
| INSTALL.ps1/.bat | Install dependencies | SMS.ps1 Setup menu |
| RUN.ps1/.bat | Start in native mode | QUICKSTART.ps1 or SMS.ps1 |

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
.\QUICKSTART.ps1    # Automatically runs setup if needed
```

### Daily Usage
```powershell
# Start
.\QUICKSTART.ps1

# Stop
.\scripts\STOP.ps1

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
# Access all tools
.\scripts\DEVTOOLS.ps1
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
- `../docs/QUICKSTART.md` - Quick start guide
- `../docs/DOCKER.md` - Docker deployment guide
- `../docs/TROUBLESHOOTING.md` - Common issues and solutions

## 🔐 Safety Notes

- **STOP.ps1**: Safe - stops services cleanly
- **CLEANUP.ps1**: Safe - only removes build artifacts
- **KILL_FRONTEND_NOW.ps1**: ⚠️ **DANGEROUS** - kills ALL Node.js processes
- **DOCKER_DOWN.ps1**: Safe - stops containers but preserves data
- **DEVTOOLS.ps1 → Reset Database**: ⚠️ **DESTRUCTIVE** - deletes all data

## 💡 Tips

1. **Use QUICKSTART.ps1** for simplicity - it handles everything automatically
2. **Use SMS.ps1** for interactive management - menu-driven, can't go wrong
3. **Use DIAGNOSE_STATE.ps1** when confused - shows current state and next steps
4. **Backup before resetting** - Use SMS.ps1 → Backup before destructive operations
5. **Check logs** - SMS.ps1 → Option 9 shows application logs

---

**Need Help?** Run `.\SMS.ps1` and select option 'H' for help, or see `README.md`
