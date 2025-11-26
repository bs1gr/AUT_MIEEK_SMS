# Archived Assets

**Last Updated**: 2025-11-26

This directory contains deprecated content from versions prior to v1.9.1.

---

## Contents

### `pre-v1.9.1/` - All Legacy Content (Archived 2025-11-26)

All pre-v1.9.1 artifacts have been consolidated into the `pre-v1.9.1/` subdirectory:

- **Release Notes**: v1.6.x, v1.8.x release documentation
- **Session Logs**: Development session documentation from November 2025
- **Deprecated Scripts**: Legacy scripts replaced by DOCKER.ps1/NATIVE.ps1
- **Consolidation Guides**: Migration documentation for script consolidation
- **Installer Docs**: Old installer documentation referencing deprecated scripts

See `pre-v1.9.1/README.md` for complete inventory.

---

## Current Architecture (v1.9.1+)

The current codebase uses a simplified, consolidated structure:

| Component | Purpose |
|-----------|---------|
| `DOCKER.ps1` | All Docker deployment operations |
| `NATIVE.ps1` | All native development operations |
| Port `8080` | Standard Docker port (not 8082) |

---

## Policy

- Files in this archive are for **historical reference only**
- Do not reference archived content for current development
- New deprecations should be placed in version-specific subdirectories
| `PR_DRAFT.md` | Historical | PR description (startup hardening) |
| `REMOVED_DOCS_SUMMARY.md` | 2025-11-04 | Summary of removed docs |
| `ROUTER_REFACTORING_STATUS.md` | 2025-11-06 | Router refactoring (COMPLETE) |
| `SECURITY_AUDIT.md` | 2025 | Security audit findings (stale) |
| `TERMINAL_BEST_PRACTICES.md` | 2025-10-29 | Terminal best practices |
| `V1.2.0_IMPROVEMENTS.md` | Historical | Version 1.2.0 improvements |

---

## Usage Guidance

Archived scripts should **not** be executed. Documents are preserved for historical reference, audit trail, and decision context.

For all supported operations, use canonical entry points documented in:

- `README.md`
- `docs/SCRIPTS_GUIDE.md`
- `docs/DOCUMENTATION_INDEX.md`

---

## Archive Policy

Files are archived when:

- Scripts superseded by new tooling
- Analyses completed and findings integrated
- Status reports superseded by current state
- Documentation becomes stale (>180 days)

---

## Retrieving Archived Content

All files remain in Git history. To access:

```powershell
# List archive contents
Get-ChildItem archive -Recurse -File

# Read archived document
Get-Content archive/CODE_REVIEW_FINDINGS.md

# Search archives
Get-ChildItem archive -Recurse | Select-String "pattern"
```

---

**Maintained by**: Development Team  
**Archive Policy**: See `docs/DOCUMENTATION_INDEX.md`
