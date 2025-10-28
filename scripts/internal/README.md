# Internal Utility Scripts

These scripts are used internally by SMS.ps1 or for specialized maintenance tasks. Most users won't need to run these directly.

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

## Emergency

- **KILL_FRONTEND_NOW.ps1/.bat** - Force kill frontend process (⚠️ kills ALL Node.js processes)

---

**Tip:** Use `SMS.ps1` from the root directory for interactive access to most of these features.
