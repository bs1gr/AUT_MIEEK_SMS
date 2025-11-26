# Deprecated Documentation - Archived 2025-11-22

This directory contains documentation and scripts that were deprecated during the v1.8.6.4 consolidation effort.

## Archived Files

### Root Documentation
- **CLEAN_INSTALL_GUIDE.md** - Superseded by docs/deployment/ guides
- **DEPLOY_ON_NEW_PC.md** - Consolidated into docs/deployment/DEPLOYMENT_GUIDE.md
- **DEPLOY_TO_OTHER_PC.txt** - Consolidated into deployment docs
- **DEPLOYMENT_CHECKLIST.md** - Moved to docs/deployment/RELEASE_CHECKLIST.md
- **DEPLOYMENT_GUIDE.md** - Consolidated into docs/deployment/DEPLOYMENT_GUIDE.md
- **DOCUMENTATION_CONSOLIDATION_SUMMARY.md** - Historical consolidation notes
- **INSTALL.md** - Installation now uses DOCKER.ps1 -Install or NATIVE.ps1 -Setup
- **QNAP_DEPLOYMENT_PLAN.md** - Specific deployment moved to docs/deployment/qnap/

### Scripts
- **EXPORT_DOCKER_IMAGE.ps1** - Docker operations now in DOCKER.ps1
- **CREATE_DEPLOYMENT_PACKAGE.ps1** - Replaced by installer suite under 	ools/installer/

## Replacement References

All operational commands now use:
- **DOCKER.ps1** for production/Docker deployment
- **NATIVE.ps1** for native development mode

See SCRIPTS_CONSOLIDATION_GUIDE.md for full migration matrix.

## Archival Reason

These files were made redundant by:
1. Script consolidation (v2.0) reducing 100+ scripts to 2 primary entry points
2. Documentation reorganization into structured docs/ hierarchy
3. Installer suite introduction providing GUI-based installation

Preserved for historical reference and potential content extraction.