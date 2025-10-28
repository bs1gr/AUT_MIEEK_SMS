# Scripts Directory

This directory contains management scripts for the Student Management System.

## 🎯 Main Scripts (For End Users)

### Quick Start
- **Location:** `../QUICKSTART.ps1` (in project root)
- **Purpose:** Simple one-command launcher to start the application
- **Usage:** `.\QUICKSTART.ps1`
- **When to use:** Every time you want to start the app

### Unified Management Interface
- **Location:** `../SMS.ps1` (in project root)
- **Purpose:** Interactive menu-driven management interface for all operations
- **Usage:** `.\SMS.ps1`
- **Features:**
  - Start/Stop/Restart application (Docker or Native mode)
  - System diagnostics and troubleshooting
  - Database backup and restore
  - View logs
  - Port conflict detection
  - Advanced developer tools access

### Stop Application
- **Script:** `STOP.ps1`
- **Purpose:** Stop all running services (Docker containers or native processes)
- **Usage:** `.\scripts\STOP.ps1`

### System Diagnostics
- **Script:** `DIAGNOSE_STATE.ps1`
- **Purpose:** Comprehensive system state analysis with actionable recommendations
- **Usage:** `.\scripts\DIAGNOSE_STATE.ps1`
- **Shows:**
  - Current deployment mode (Docker/Native/Not Running)
  - Docker availability and container status
  - Native process detection
  - Environment verification
  - Recommended next actions

## 🔧 Setup & Installation

### Initial Setup
- **Script:** `SETUP.ps1`
- **Purpose:** First-time installation of dependencies
- **Usage:** `.\scripts\SETUP.ps1`
- **Installs:**
  - Python virtual environment
  - Python packages
  - Node.js dependencies

### Run Application (Native Mode)
- **Script:** `RUN.ps1`
- **Purpose:** Start application in native mode (Python + Node.js directly)
- **Usage:** `.\scripts\RUN.ps1`
- **Note:** Automatically runs setup if needed

## 🐳 Docker Scripts

### Docker Compose Operations
- **DOCKER_UP.ps1** - Start Docker Compose services
- **DOCKER_DOWN.ps1** - Stop and remove Docker Compose services
- **DOCKER_REFRESH.ps1** - Rebuild and restart Docker Compose
- **DOCKER_SMOKE.ps1** - Quick health check for Docker deployment

### Fullstack Container (Advanced)
- **DOCKER_FULLSTACK_UP.ps1** - Start fullstack container (single container mode)
- **DOCKER_FULLSTACK_DOWN.ps1** - Stop fullstack container
- **DOCKER_FULLSTACK_REFRESH.ps1** - Rebuild fullstack container
- **DOCKER_RUN.ps1** - Advanced Docker startup with mode selection

### Volume Management
- **DOCKER_UPDATE_VOLUME.ps1** - Migrate data between volume configurations

## 🔍 Diagnostic Tools

### Port Debugging
- **Script:** `DEBUG_PORTS.ps1`
- **Purpose:** Show what processes are using ports 8000, 5173, 8080
- **Usage:** `.\scripts\DEBUG_PORTS.ps1`
- **When to use:** Port conflict errors

### Frontend Diagnostics
- **Script:** `DIAGNOSE_FRONTEND.ps1`
- **Purpose:** Diagnose frontend-specific issues
- **Usage:** `.\scripts\DIAGNOSE_FRONTEND.ps1`

## 🛠️ Developer Tools

### Advanced Developer Menu
- **Script:** `DEVTOOLS.ps1`
- **Purpose:** Interactive menu with advanced operations
- **Usage:** `.\scripts\DEVTOOLS.ps1`
- **Features:**
  - Docker operations (build, logs, shell access)
  - Database management (backup, restore, reset)
  - Volume management
  - Native mode controls
  - System diagnostics

### Package Creation
- **Script:** `CREATE_PACKAGE.ps1`
- **Purpose:** Create deployment package/release
- **Usage:** `.\scripts\CREATE_PACKAGE.ps1`

## 🧹 Maintenance Scripts

### Cleanup Operations
- **CLEANUP.ps1** - Clean build artifacts and temporary files
- **CLEANUP_DOCS.ps1** - Clean documentation artifacts
- **CLEANUP_OBSOLETE_FILES.ps1** - Remove obsolete/unused files
- **CLEANUP_COMPREHENSIVE.ps1** - Full cleanup (all of the above)

### Emergency Stop
- **Script:** `KILL_FRONTEND_NOW.ps1`
- **Purpose:** Force-kill all Node.js processes (emergency use only)
- **Usage:** `.\scripts\KILL_FRONTEND_NOW.ps1`
- **Warning:** ⚠️ This kills ALL Node.js processes system-wide!

## 📊 Script Decision Tree

```
Need to start the app?
├─→ Just want it running? → Use QUICKSTART.ps1
├─→ Want control/options? → Use SMS.ps1 (menu interface)
└─→ Advanced user? → Use DOCKER_UP.ps1 or RUN.ps1 directly

App not working?
├─→ Want diagnosis? → Use DIAGNOSE_STATE.ps1
├─→ Port conflicts? → Use DEBUG_PORTS.ps1
└─→ Docker issues? → Use DEVTOOLS.ps1 → Option 6

Need to stop?
└─→ Use STOP.ps1 (stops everything cleanly)

Database tasks?
├─→ Backup/Restore? → Use SMS.ps1 → Database Management
└─→ Advanced ops? → Use DEVTOOLS.ps1 → Database Management

Development work?
└─→ Use DEVTOOLS.ps1 (has everything)
```

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
