# Archived Assets

**Last Updated**: 2025-11-16

This directory captures deprecated entry points, operator helpers, historical documentation, and completed analyses retained for reference and audit purposes.

---

## Contents

### Legacy Scripts (v1.6.2 Archival)

Deprecated entry points formally removed from active workspace in v1.6.2 release (2025-11-15):

- `scripts/SETUP.*` – legacy setup wrapper superseded by `RUN.ps1` and `SMART_SETUP.ps1`.
- `scripts/STOP.*` (root + `scripts/deploy/`) – legacy stop helpers replaced by `SMS.ps1 -Stop`.
- `scripts/*/KILL_FRONTEND_NOW.*` – placeholder wrappers now consolidated under `scripts/operator/`.
- `tools/stop_monitor.ps1` – pointer script replaced by `scripts/operator/stop_monitor.ps1`.
- `scripts/stage_and_commit.ps1` - One-time automation for cleanup commit (2025-11-16)
- `scripts/docker/DOCKER_FULLSTACK_*.ps1` + `scripts/deploy/docker/DOCKER_FULLSTACK_*.ps1` – superseded by `RUN.ps1` (fullstack) in v1.8.3

### Historical Documentation (2025-11-16 Archival)

Completed analyses and status reports from October-November 2025:

| File | Original Date | Purpose |
|------|---------------|---------|
| `APP_LIFECYCLE_EVALUATION.md` | 2025-11-06 | Lifecycle evaluation & recommendations |
| `ARTIFACT_STRATEGY.md` | Planning | Artifact management strategy |
| `CI_MONITORING_CHANGES_SUMMARY.md` | 2025-11-11 | CI monitoring change summary |
| `CLEANUP_COMPLETE.md` | 2025-11-16 | Cleanup completion report |
| `CLEANUP_SUMMARY.md` | 2025-11-16 | Technical cleanup summary |
| `CODE_REVIEW_FINDINGS.md` | 2025-10-29 | Comprehensive code review (v1.0) |
| `DEPENDENCY_UPGRADES.md` | 2025 | Dependency upgrade analysis (stale) |
| `DOCUMENTATION_CLEANUP_2025-01-10.md` | 2025-01-10 | Original doc consolidation summary |
| `FRONTEND_ASSESSMENT.md` | 2025 | Frontend assessment (stale) |
| `GITHUB_RELEASE_DRAFT_v1.2.0.md` | Historical | Release draft for v1.2.0 |
| `HISTORY_PURGE_PLAN.md` | Planning | History purge planning |
| `MODE_AWARE_UI_QUICK_REFERENCE.md` | Feature ref | Control panel mode-aware UI reference |
| `NEXT_STEPS.md` | 2025-11-16 | Post-cleanup action items |
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
