# Developer Workbench Scripts

This directory contains scripts for the **development lifecycle**: building, running, debugging, testing, and cleaning during active development.

## Target Audience

Developers actively working on the codebase.

## Scripts

### Core Development

- `SMOKE_TEST.ps1` - Quick smoke test to verify application health
- `debug_import_control.py` - Debug Python import issues

### Diagnostic Tools

- `DEBUG_PORTS.ps1/.bat` - Check and debug port conflicts
- `DIAGNOSE_STATE.ps1` - Comprehensive system state diagnostics
- `DIAGNOSE_FRONTEND.ps1/.bat` - Frontend-specific diagnostics
- `DEVTOOLS.ps1/.bat` - Advanced developer tools menu

### Cleanup Tools

- `CLEANUP.bat` - Clean build artifacts and temp files (non-destructive)
- `../../SUPER_CLEAN_AND_DEPLOY.ps1` - Full cleanup of all artifacts
- `CLEANUP_DOCS.ps1` - Clean documentation artifacts
- `CLEANUP_OBSOLETE_FILES.ps1` - Remove obsolete files
- `KILL_FRONTEND_NOW.ps1/.bat` - Force-kill frontend processes

### Testing & Verification

- `TEST_TERMINAL.ps1` - Test terminal/PowerShell environment
- `VERIFY_LOCALIZATION.ps1` - Verify localization files

## Usage Patterns



### Quick Development Cycle

```powershell
# Start native development mode (v1.5.0+)
pwsh -NoProfile -File run-native.ps1

# Manage Docker containers (if needed)
pwsh -NoProfile -File ..\..\NATIVE.ps1 -Start
```

> **Note:** As of v2.0, use `..\..\NATIVE.ps1` for native development. Legacy `run-native.ps1` was archived. For Docker/production mode, use `..\..\DOCKER.ps1`.

### Cleanup After Development

```powershell
# Quick cleanup (preserves data)
.\CLEANUP.bat

# Deep cleanup
..\..\SUPER_CLEAN_AND_DEPLOY.ps1
```

### Debugging Port Conflicts

```powershell
# Check what's using ports
.\DEBUG_PORTS.ps1

# Force-kill frontend if stuck
.\KILL_FRONTEND_NOW.ps1
```

## Notes

- These scripts assume you're in an active development environment
- Most scripts work with both Docker and native modes
- Use `.bat` versions if you have PowerShell execution policy issues
- For production deployment, use scripts in `../deploy/` instead
