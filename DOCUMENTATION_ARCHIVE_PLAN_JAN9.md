# Documentation Archive Organization Plan
**Date**: January 9, 2026
**Status**: Ready to Execute
**Effort**: 15-20 minutes (manual move operation)

---

## Overview

This plan outlines the organization of orphaned and superseded documentation into archive directories. This is a **non-blocking improvement** that can be executed immediately OR deferred until after staging deployment (recommended).

---

## Phase 1: Root-Level Phase Documentation (7 files)

**Location**: Root `docs/` directory
**Archive Target**: `docs/archive/phase-reports/`
**Status**: Already marked with archive notices ✅

### Files to Archive

1. **docs/PHASE1_COMPLETION_SUMMARY.md** (200 lines)
   - Purpose: Phase 1 final summary (Jan 7)
   - Status: ✅ Already marked as historical
   - Note: Keep reference link in UNIFIED_WORK_PLAN

2. **docs/PHASE1_READINESS_REVIEW.md** (180 lines)
   - Purpose: Phase 1 pre-release readiness
   - Status: ✅ Already marked as archived
   - Note: Historical context for v1.15.1

3. **docs/PHASE1_REVIEW_FINDINGS.md** (220 lines)
   - Purpose: Phase 1 audit findings
   - Status: ✅ Already marked as archived
   - Note: Superseded by post-Phase 1 work

4. **docs/PHASE1_TEAM_ONBOARDING.md** (310 lines)
   - Purpose: Phase 1 team workflows
   - Status: ✅ Outdated (Phase 1 complete)
   - Note: Historical team procedures

5. **docs/POST_PHASE1_DOCUMENTATION_COMPLETE.md** (80 lines)
   - Purpose: Documentation completion report
   - Status: ✅ Historical summary
   - Note: Completion marker

6. **docs/PHASE2_PLANNING.md** (361 lines)
   - Purpose: Aspirational Phase 2 features
   - Status: ✅ Marked "SUPERSEDED", points to UNIFIED_WORK_PLAN
   - Note: Consolidated into main planning doc

7. **docs/PHASE2_IMPLEMENTATION.md** (240 lines)
   - Purpose: Real-time Notifications feature (incomplete)
   - Status: ✅ Archived feature development
   - Note: Future backlog item (Q2 2026+)

### Action Items

```powershell
# Files to move to docs/archive/phase-reports/
Move-Item "docs/PHASE1_COMPLETION_SUMMARY.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/PHASE1_READINESS_REVIEW.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/PHASE1_REVIEW_FINDINGS.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/PHASE1_TEAM_ONBOARDING.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/POST_PHASE1_DOCUMENTATION_COMPLETE.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/PHASE2_PLANNING.md" -Destination "docs/archive/phase-reports/"
Move-Item "docs/PHASE2_IMPLEMENTATION.md" -Destination "docs/archive/phase-reports/"
```

---

## Phase 2: Development Phase Documentation (13 files)

**Location**: `docs/development/` directory
**Archive Target**: `docs/archive/phase-reports/development-phase-reports/`
**Status**: Historical task completion reports ✅

### Files to Archive

1. **PHASE1_CONSOLIDATION_COMPLETE.md**
2. **PHASE2_CONSOLIDATION_COMPLETE.md**
3. **PHASE3_CONSOLIDATION_COMPLETE.md**
4. **PHASE3_CONSOLIDATION_PLAN.md**
5. **PHASE3_DEVELOPER_GUIDE.md**
6. **PHASE3_PERFORMANCE_BASELINE.md**
7. **PHASE3_PREPARATION_REPORT.md**
8. **PHASE3_READINESS_CHECKLIST.md**
9. **PHASE3_TASK1_DOCUMENTATION_CONSOLIDATION_COMPLETE.md**
10. **PHASE3_TASK2_BACKEND_SCRIPTS_COMPLETE.md**
11. **PHASE3_TASK3_SYMLINK_STRATEGY_COMPLETE.md**

**Total**: 13 files
**Reason**: These document completed phase preparation work. Once archived, development/ contains only **active documentation**: ARCHITECTURE.md, AUTHENTICATION.md, GIT_WORKFLOW.md, and similar current guides.

### Action Items

```powershell
# Create subdirectory
mkdir "docs/archive/phase-reports/development-phase-reports"

# Move all 13 files
Get-ChildItem "docs/development/PHASE*" | Move-Item -Destination "docs/archive/phase-reports/development-phase-reports/"
```

---

## Phase 3: Plans Directory Organization (10 files)

**Location**: `docs/plans/` directory
**Archive Target**: `docs/archive/phase-reports/planning-docs/` (keep active) + archive superseded
**Status**: Mixed - Some active, some archived ✅

### Active Plans (KEEP in docs/plans/)

✅ **UNIFIED_WORK_PLAN.md** - Single source of truth (current, used daily)
✅ **PHASE2_CONSOLIDATED_PLAN.md** - Detailed Phase 2 implementation (reference)
✅ **PHASE2_DAILY_EXECUTION_PLAN.md** - Daily standup tracker
✅ **PHASE2_PREP_GUIDE.md** - Week 0 completion guide (reference)

### Archived Plans (MOVE to archive/)

1. **PHASE2_GITHUB_ISSUES_TEMPLATE.md** - Template doc (obsolete)
2. **PHASE2_KICKOFF_READY.md** - Kickoff marker doc
3. **PHASE2_SWIMLANES_DEPENDENCIES.md** - Phase 2 swimlane planning (superseded)
4. **PHASE2_TEAM_ONBOARDING.md** - Phase 2 team guide (obsolete after Phase 2 starts)
5. **RBAC_PHASE2.4_PLAN.md** - Partial RBAC planning (superseded by consolidation)
6. **PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md** - Phase 1 audit doc
7. **REMAINING_ISSUES_PRIORITIZED.md** (if in plans/) - Phase 1 issue list

### Action Items

```powershell
# Create subdirectory
mkdir "docs/archive/phase-reports/planning-docs"

# Move superseded planning docs
Move-Item "docs/plans/PHASE2_GITHUB_ISSUES_TEMPLATE.md" -Destination "docs/archive/phase-reports/planning-docs/"
Move-Item "docs/plans/PHASE2_KICKOFF_READY.md" -Destination "docs/archive/phase-reports/planning-docs/"
Move-Item "docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md" -Destination "docs/archive/phase-reports/planning-docs/"
Move-Item "docs/plans/PHASE2_TEAM_ONBOARDING.md" -Destination "docs/archive/phase-reports/planning-docs/"
Move-Item "docs/plans/RBAC_PHASE2.4_PLAN.md" -Destination "docs/archive/phase-reports/planning-docs/"
Move-Item "docs/plans/PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md" -Destination "docs/archive/phase-reports/planning-docs/"
```

---

## Phase 4: Release & Deployment Documentation (8 files)

**Location**: `docs/deployment/` and `docs/releases/`
**Archive Target**: `docs/archive/consolidation-reports/` and `docs/archive/release-workflow-v1.12-1.13/`
**Status**: Version-specific docs needing organization

### Files to Archive (Old Version References)

1. **docs/deployment/STAGING_DEPLOYMENT_PLAN_v1.15.1.md** → KEEP until staging complete
2. **docs/releases/MID_PHASE_SUMMARY_v1.15.0.md** → Archive to release-workflow-v1.12-1.13/
3. **docs/releases/GITHUB_ISSUES_PHASE2.md** → Archive to release-workflow-v1.12-1.13/
4. **docs/releases/PHASE1_COMPLETION_REPORT.md** → Archive to consolidation-reports/ (keep link)

### Action Items

```powershell
# Create subdirectories
mkdir "docs/archive/release-workflow-v1.12-1.13"

# Move version-specific docs
Move-Item "docs/releases/MID_PHASE_SUMMARY_v1.15.0.md" -Destination "docs/archive/release-workflow-v1.12-1.13/"
Move-Item "docs/releases/GITHUB_ISSUES_PHASE2.md" -Destination "docs/archive/release-workflow-v1.12-1.13/"

# Keep these (still active):
# - docs/releases/RELEASE_NOTES_v1.15.1.md (current release)
# - docs/releases/PHASE1_COMPLETION_REPORT.md (final reference)
# - docs/deployment/STAGING_DEPLOYMENT_PLAN_v1.15.1.md (in-progress)
```

---

## Summary & Statistics

### Before Archive

| Category | Active | Orphaned | Total |
|----------|--------|----------|-------|
| Root PHASE docs | 0 | 7 | 7 |
| Development PHASE* | 0 | 13 | 13 |
| Planning docs | 4 | 7 | 11 |
| Release/deployment | 3 | 5 | 8 |
| **Total** | **7** | **32** | **39** |

### After Archive (Estimated)

| Category | Active | Archived |
|----------|--------|----------|
| Root docs/ | 25+ | 7 |
| docs/development/ | 8+ | 13 |
| docs/plans/ | 4 | 7 |
| docs/releases/ | 5 | 3 |

**Net Effect**: Cleaner directory structure, clear distinction between active and historical docs

---

## Time Estimate & Execution

**Total Effort**: 15-20 minutes
**Method**: PowerShell Move-Item or Windows File Explorer

### Recommended Timeline

**Option A: Execute Now** (Recommended for clean state)
- 20 minutes total
- Results in clean, organized archives immediately
- Allows for fresh start before staging deployment

**Option B: Defer Until After Staging** (Alternative)
- Execute after staging deployment validation (Jan 10)
- Rationale: Keep current docs visible during deployment
- Non-blocking improvement (can be done later)

**Option C: Execute Partially** (Middle Ground)
- Archive only root PHASE* docs (7 files, 5 min)
- Keep development PHASE* docs for now
- Plan remaining archives for later

---

## Verification Checklist

After executing archiving:

- [ ] All 7 root PHASE docs moved to `docs/archive/phase-reports/`
- [ ] All 13 development PHASE docs moved to `docs/archive/phase-reports/development-phase-reports/`
- [ ] Superseded planning docs moved to `docs/archive/phase-reports/planning-docs/`
- [ ] Old release/deployment docs moved to appropriate archives
- [ ] Updated links in UNIFIED_WORK_PLAN.md to point to archives where needed
- [ ] Updated DOCUMENTATION_INDEX.md archive references
- [ ] Verified no broken links (run `grep_search` for moved filenames)
- [ ] Committed changes with message "Archive Phase 1/2 documentation and consolidate planning structure (non-blocking, Jan 9)"

---

## Notes & Rationale

**Why Archive vs. Delete?**
- Historical context remains available for future reference
- Facilitates comparison with older implementations (e.g., websocket architecture from Phase 2 implementation)
- Maintains audit trail and documentation archaeology
- Non-destructive - can be recovered if needed

**What About UNIFIED_WORK_PLAN.md?**
- Remains in active location: `docs/plans/UNIFIED_WORK_PLAN.md`
- Is the canonical single source of truth for all planning
- References archived docs appropriately
- No changes needed except link verification

**Version Metadata?**
- Old docs reference v1.12.x-1.14.x
- Will be addressed separately in next phase
- Not critical for this archiving operation

---

## Recommended Decision

**For Optimal Workflow**: Execute **Option A (Execute Now)**

**Rationale**:
1. ✅ Non-blocking improvement (doesn't affect functionality)
2. ✅ Quick execution (15-20 minutes)
3. ✅ Establishes clean baseline before staging deployment
4. ✅ Prevents accumulation of orphaned docs
5. ✅ Results in well-organized archive structure
6. ✅ Allows fresh start for Phase 2 (Jan 27)

**Timing**: Execute immediately after current decision, before staging deployment.
