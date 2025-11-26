# Developer Workbench Scripts

This directory contains scripts for the **development lifecycle**: building, running, debugging, testing, and cleaning during active development.

## Target Audience

Developers actively working on the codebase.

## Quick Start (v2.0)

```powershell
# Native development (backend + frontend with hot-reload)
..\..\NATIVE.ps1 -Start

# Backend only
..\..\NATIVE.ps1 -Backend

# Frontend only  
..\..\NATIVE.ps1 -Frontend

# Stop all
..\..\NATIVE.ps1 -Stop
```

## Scripts

### Core Development

- `SMOKE_TEST.ps1` - Quick smoke test to verify application health
- `debug_import_control.py` - Debug Python import issues

### Diagnostic Tools

- Scripts in `internal/` - Port debugging, state diagnostics, frontend diagnostics

### Cleanup Tools

- `CLEANUP.bat` - Clean build artifacts and temp files (non-destructive)
- `..\..\DOCKER.ps1 -DeepClean` - Full cleanup including Docker artifacts

### Testing & Verification

- `upgrade-pip.ps1` - Update pip in virtual environment

## Usage Patterns

### Quick Development Cycle

```powershell
# Start native development mode
..\..\NATIVE.ps1 -Start

# Or backend only with auto-reload
..\..\NATIVE.ps1 -Backend
```

### Cleanup After Development

```powershell
# Quick cleanup (preserves data)
.\CLEANUP.bat

# Deep cleanup (Docker mode)
..\..\DOCKER.ps1 -DeepClean
```

## Notes

- Use `NATIVE.ps1` (repo root) for all native development operations
- Use `DOCKER.ps1` (repo root) for Docker-based operations
- Legacy scripts (`run-native.ps1`, `SUPER_CLEAN_AND_DEPLOY.ps1`) were archived in v2.0
