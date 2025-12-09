# SMS.ps1 Meta-Wrapper Implementation Plan

## Purpose

Create a unified entry point for all SMS management scripts to improve UX and
provide centralized help system.

## Proposed Usage

\\\powershell

# Show help

.\SMS.ps1 -Help

# Docker operations

.\SMS.ps1 -Docker -Install
.\SMS.ps1 -Docker -Start
.\SMS.ps1 -Docker -Stop

# Native development

.\SMS.ps1 -Native -Setup
.\SMS.ps1 -Native -Start
.\SMS.ps1 -Native -Backend

# Pre-commit quality gates

.\SMS.ps1 -CommitReady -Quick
.\SMS.ps1 -CommitReady -Full

# Build operations

.\SMS.ps1 -Installer -Build
.\SMS.ps1 -Installer -Sign

# Version management

.\SMS.ps1 -Version -Check
.\SMS.ps1 -Version -Update "1.11.0"
.\SMS.ps1 -Version -Report

# Workspace verification

.\SMS.ps1 -Verify -Workspace
.\SMS.ps1 -Verify -Health
\\\

## Implementation Structure

\\\powershell
SMS.ps1 (main router)
├── Validate parameters
├── Route to:
│   ├── DOCKER.ps1
│   ├── NATIVE.ps1
│   ├── COMMIT_READY.ps1
│   ├── INSTALLER_BUILDER.ps1
│   ├── scripts/VERIFY_VERSION.ps1
│   ├── scripts/SMOKE_TEST.ps1
│   └── scripts/VERIFY_WORKSPACE.ps1
└── Generate unified help
\\\

## Benefits

✅ Single entry point for new users  
✅ Unified help system  
✅ Cleaner root directory (conceptually)  
✅ Easier CI/CD integration  
✅ Backward compatible (old scripts still work)  
✅ Extensible (easy to add new commands)

## Implementation Status

- [ ] Create SMS.ps1 template
- [ ] Implement parameter routing
- [ ] Test all delegated commands
- [ ] Create help system
- [ ] Add to documentation
- [ ] Integration testing

---
Generated: 2025-12-09
Status: Plan created, implementation pending
