# Internal Utility Scripts

⚠️ **Warning:** These scripts are for developers and advanced users only.

End users should use **`ONE-CLICK.ps1`** in the root directory instead.

## Diagnostics & Debugging

- **DEBUG_PORTS.ps1/.bat** - Show processes using ports 8000, 5173, 8080
- **DIAGNOSE_FRONTEND.ps1/.bat** - Frontend-specific diagnostics
- **DIAGNOSE_STATE.ps1** - Comprehensive system state analysis

## Maintenance & Cleanup

- **CLEANUP.ps1/.bat** - Clean temporary files and caches
- **CLEANUP_COMPREHENSIVE.ps1** - Thorough cleanup (temp files, logs, build artifacts)
- **CLEANUP_DOCS.ps1** - Clean documentation artifacts
- **CLEANUP_OBSOLETE_FILES.ps1** - Remove obsolete files

## Development Tools

- **DEVTOOLS.ps1/.bat** - Advanced developer operations menu
- **CREATE_PACKAGE.ps1/.bat** - Package application for distribution
- **VERIFY_LOCALIZATION.ps1** - Verify translation completeness

## Deployment (Developer Only)

- **CREATE_DEPLOYMENT_PACKAGE.ps1/.bat** - Creates compressed deployment package for distribution
- **INSTALLER.ps1/.bat** - Advanced installation script with customization options

## Emergency

- **KILL_FRONTEND_NOW.ps1/.bat** - Force kill frontend process (⚠️ kills ALL Node.js processes)

---

## For End Users

If you're looking to:

- **Install the system** → Use `ONE-CLICK.ps1` in root
- **Start the application** → Use `ONE-CLICK.ps1` in root  
- **Stop the application** → Use `SMS.ps1 -Stop` in root
- **Run diagnostics** → Use `SMS.ps1 -Diagnostics` in root

---

**Tip:** Use `SMS.ps1` from the root directory for interactive access to most of these features.
