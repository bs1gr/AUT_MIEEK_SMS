# Phase 2: CI/CD Consolidation - In Progress

**Status:** ✅ Consolidation 1 COMPLETE  
**Date:** June 5, 2026  
**Progress:** 1 of 3 consolidations done (33%)

---

## What is Phase 2?

Consolidation of **duplicate workflows** identified in the June 5 deep review.

**Goal:** Reduce 37 workflows → 34 workflows by merging redundant patterns.

**Timeline:** 3-4 days  
**Risk:** Low (all consolidations are independent/scheduled)

---

## Consolidations (3 Total)

### ✅ Consolidation 1: Maintenance Workflows - COMPLETE

**Merged:**
- `maintenance-consolidated.yml` → BEING DELETED
- Integrated into: `orchestrated-maintenance.yml`

**What Changed:**
- Added unified task selection (`task` input)
- Backward compatible with old `cleanup_level` input
- 8 maintenance tasks now in one workflow
- Added `determine-tasks` job for smart routing
- Integrated production health check
- Better manual dispatch UX

**Timeline:** ~2 hours  
**Testing:** Run manual dispatch with different task options

**Status Code:** `consolidation.maintenance.complete`

---

### ⏳ Consolidation 2: Installer Workflows - NEXT

**Target:**
- `sync-installer-artifact.yml` → merge into `installer.yml`

**Plan:**
- Add `output_mode` parameter (release | repo-commit)
- Keep existing release behavior (default)
- Add new repo-commit behavior
- Single workflow for all installer builds

**Timeline:** 2-3 days (needs careful testing)  
**Risk:** Low (both are Windows builds, fully testable)

**Next:** Start after consolidation 1 is merged and tested

---

### ⏳ Consolidation 3: Commit-Ready Workflows - READY

**Target:**
- Consolidate `commit-ready-smoke.yml` + `commit-ready-cleanup-smoke.yml`
- Create single `commit-ready.yml`

**Plan:**
- Add `include_cleanup` parameter (true/false)
- Unified entry point for pre-commit testing
- Delete variant workflows

**Timeline:** ~4 hours  
**Risk:** Low (simple parameter addition)

**Next:** After consolidation 2 completes

---

## How to Proceed

### You Want to Merge Consolidation 1 Now?

1. **Verify changes:**
   ```bash
   # Review the enhanced orchestrated-maintenance.yml
   git diff orchestrated-maintenance.yml
   ```

2. **Delete redundant file:**
   ```bash
   git rm .github/workflows/maintenance-consolidated.yml
   ```

3. **Create feature branch:**
   ```bash
   git checkout -b chore/ci-consolidate-maintenance
   git add .github/workflows/
   git commit -m "chore(ci): consolidate maintenance workflows

   - Merge maintenance-consolidated into orchestrated-maintenance
   - Add unified task selector (task input)
   - Maintain backward compatibility (cleanup_level input)
   - Add determine-tasks job for smart routing
   - Reduces duplicate code and improves UX"
   git push origin chore/ci-consolidate-maintenance
   ```

4. **Create PR and let team review**

5. **After merge, test:**
   - Manually trigger orchestrated-maintenance.yml
   - Select task=stale-cleanup
   - Verify stale job runs
   - Check other tasks are skipped

### You Want to Consolidate More Workflows?

See detailed implementation plans in:
- `memory/phase2_consolidation_analysis.md` (all candidates)
- `memory/phase2_execution_status.md` (current progress)

### You Want to Skip to Phase 3?

Phase 3 is optional (extractions + optimization). Phase 2a (3 consolidations) provides 80% of benefit and should be stable first.

---

## Testing Checklist (Consolidation 1)

Before merging, run these manual tests:

### Scheduled Run (Happens Daily at 2 AM UTC)
- [ ] Monitor GitHub Actions at 2 AM UTC tomorrow
- [ ] Verify all 8 tasks start
- [ ] Check no errors in logs
- [ ] Review summary artifact

### Manual Dispatch Tests
- [ ] task=all → All 8 tasks run
- [ ] task=stale-cleanup → Only stale runs
- [ ] task=workflow-cleanup → Only cleanup runs
- [ ] task=dependencies-check → Only deps run
- [ ] cleanup_level=standard → All run (backward compat)
- [ ] cleanup_level=minimal → Minimal tasks run

### No Side Effects
- [ ] Main branch still works
- [ ] Other workflows unaffected
- [ ] No new errors/warnings

---

## Files Modified in Phase 2a

### Consolidation 1 (Complete)
| File | Change | Status |
|------|--------|--------|
| `orchestrated-maintenance.yml` | Enhanced with task selector | ✅ Ready |
| `maintenance-consolidated.yml` | Delete this file | ⏳ Pending |

### Consolidation 2 (Ready to Start)
| File | Change | Status |
|------|--------|--------|
| `installer.yml` | Add output_mode parameter | ⏳ Not started |
| `sync-installer-artifact.yml` | Delete this file | ⏳ Not started |

### Consolidation 3 (Ready to Start)
| File | Change | Status |
|------|--------|--------|
| `commit-ready-smoke.yml` | Add include_cleanup parameter | ⏳ Not started |
| `commit-ready-cleanup-smoke.yml` | Delete this file | ⏳ Not started |

---

## Reference Documents

**For Deep Understanding:**
- [ORGANIZATION.md](./ORGANIZATION.md) — Complete workflow reference
- [memory/phase2_consolidation_analysis.md](../../memory/phase2_consolidation_analysis.md) — Detailed analysis of all 3 consolidations

**For Implementation:**
- [memory/phase2_execution_status.md](../../memory/phase2_execution_status.md) — Step-by-step execution status

**Quick Reference:**
- [README.md](./README.md) — Developer quick start
- [MAINTENANCE.md](./MAINTENANCE.md) — Operations procedures

---

## Progress Tracking

```
Phase 2 Consolidations Progress
================================

[████████░░░░░░░░░░░░░░░░] 33% (1/3 consolidations complete)

✅ Consolidation 1: Maintenance workflows - COMPLETE
   - Code: ✅ Done
   - Testing: ⏳ Pending (after merge)
   - Status: Ready for PR

⏳ Consolidation 2: Installer workflows - READY
   - Code: ⏳ Not started
   - Testing: ⏳ Not started
   - ETA: Day 2-3

⏳ Consolidation 3: Commit-ready workflows - READY
   - Code: ⏳ Not started
   - Testing: ⏳ Not started
   - ETA: Day 4

Phase 2 Complete When: All 3 consolidations merged + 1 week monitoring
```

---

## What's Next

**Immediate:**
1. Review orchestrated-maintenance.yml changes
2. Delete maintenance-consolidated.yml
3. Create PR for consolidation 1
4. Team review + merge

**Week 2:**
1. Start consolidation 2 (installer)
2. Test both output modes
3. PR + merge

**Week 3:**
1. Start consolidation 3 (commit-ready)
2. PR + merge
3. Monitor all changes stable

**Week 4:**
1. Consider Phase 2b extractions (optional)
2. Update ORGANIZATION.md with final structure
3. Celebrate! 🎉

---

## Questions?

- **About consolidation 1?** See enhanced orchestrated-maintenance.yml
- **About consolidations 2-3?** See phase2_consolidation_analysis.md
- **How to test?** See Testing Checklist above
- **Need detailed analysis?** See ORGANIZATION.md + MAINTENANCE.md

---

**Last Updated:** June 5, 2026 at end of Phase 2a Consolidation 1  
**Next Update:** After consolidation 2 starts
