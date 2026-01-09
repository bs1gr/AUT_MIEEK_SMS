# Agent Policy Enforcement - Mandatory Compliance

**Version**: 1.0
**Date**: January 9, 2026
**Status**: ACTIVE - ALL AGENTS MUST COMPLY
**Authority**: Project-wide mandatory policy

---

## 🚨 CRITICAL: This Document is Mandatory for ALL AI Agents

This document establishes **non-negotiable policies** that **EVERY AI agent** working on this project **MUST** follow. These policies exist to prevent system crashes, data loss, and work duplication.

**Violations of these policies cause real harm:**
- ❌ Running tests incorrectly crashes VS Code
- ❌ Creating duplicate plans wastes time and creates confusion
- ❌ Skipping pre-commit checks introduces bugs
- ❌ Editing DB schema directly corrupts data

---

## 📜 Mandatory Policies - Zero Exceptions

### Policy 1: Testing - NEVER Run Full Test Suite Directly

**❌ FORBIDDEN:**
```powershell
# These commands WILL crash VS Code - DO NOT USE
cd backend && pytest -q
cd backend && pytest tests/
python -m pytest
```

**✅ REQUIRED:**
```powershell
# ALWAYS use the batch test runner
.\RUN_TESTS_BATCH.ps1                    # Default: 5 files per batch
.\RUN_TESTS_BATCH.ps1 -BatchSize 3       # Smaller batches
.\RUN_TESTS_BATCH.ps1 -Verbose           # Detailed output
```

**Why This Exists:**
- 490+ test files overload system memory/CPU
- Causes VS Code to freeze or crash completely
- Batch runner prevents system overload
- Documented in: `.github/copilot-instructions.md`, `RUN_TESTS_BATCH.ps1`

**Exception:** Single test files are OK for development:
```powershell
cd backend && pytest tests/test_specific_file.py -v  # OK
```

**Enforcement:** Pre-commit hooks should warn if pytest runs detected in terminal history.

---

### Policy 2: Planning - Single Source of Truth ONLY

**❌ FORBIDDEN:**
- Creating new TODO.md files
- Creating new planning documents
- Creating new status trackers
- Creating parallel plans or roadmaps

**✅ REQUIRED:**
- Update `docs/plans/UNIFIED_WORK_PLAN.md` for ALL planning
- Check work plan BEFORE starting any work
- Update work plan AFTER completing tasks

**Why This Exists:**
- Multiple plans create confusion
- Agents duplicate work when plans diverge
- Single source of truth prevents conflicts
- Documented in: `docs/plans/UNIFIED_WORK_PLAN.md`, `.github/copilot-instructions.md`

**Enforcement:** Documentation audits flag duplicate planning files.

---

### Policy 3: Database - Alembic Migrations ONLY

**❌ FORBIDDEN:**
```python
# NEVER edit DB schema directly
Base.metadata.create_all(engine)
db.execute("ALTER TABLE ...")
```

**✅ REQUIRED:**
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

**Why This Exists:**
- Direct schema changes corrupt data
- Migrations provide version control
- Enables rollback capability
- Documented in: `docs/operations/DATABASE_MIGRATION_GUIDE.md`

**Enforcement:** Pre-commit hooks check for schema changes in models.py.

---

### Policy 4: Frontend - i18n ALWAYS Required

**❌ FORBIDDEN:**
```tsx
// NEVER hardcode strings
<button>Save</button>
<p>Student not found</p>
```

**✅ REQUIRED:**
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;
}
```

**Why This Exists:**
- Bilingual system (EN/EL) requires translations
- Hardcoded strings break Greek users
- Translation integrity tests catch violations
- Documented in: `.github/copilot-instructions.md`

**Enforcement:** ESLint rules + translation integrity tests.

---

### Policy 5: Pre-Commit - Validation ALWAYS Required

**❌ FORBIDDEN:**
- Committing without running pre-commit checks
- Skipping `COMMIT_READY.ps1`
- Bypassing validation with `--no-verify`

**✅ REQUIRED:**
```powershell
# ALWAYS run before commit
.\COMMIT_READY.ps1 -Quick         # Quick validation (2-3 min)
.\COMMIT_READY.ps1 -Standard      # Standard checks (5-8 min)
.\COMMIT_READY.ps1 -Full          # Full validation (15-20 min)
```

**Why This Exists:**
- Prevents broken code from entering codebase
- Auto-fixes formatting issues
- Catches bugs before commit
- Documented in: `docs/development/GIT_WORKFLOW.md`

**Enforcement:** Git pre-commit hooks (configured in `.git/hooks/`).

---

### Policy 6: Documentation - Audit Before Creating

**❌ FORBIDDEN:**
- Creating docs without checking existing structure
- Creating standalone reports without consolidation
- Duplicating information across files

**✅ REQUIRED:**
1. Check `DOCUMENTATION_INDEX.md` first
2. Review existing structure in `/docs/`
3. Consolidate findings into existing framework
4. Update index when adding new docs

**Why This Exists:**
- Prevents documentation sprawl
- Maintains single source of truth
- Easier to find information
- Documented in: `DOCUMENTATION_INDEX.md`

**Enforcement:** Documentation audits (monthly review).

---

## 🔍 How to Verify Compliance

### For Agents Starting Work

**Step 1: Read Entry Points (5 min)**
1. Read `.github/copilot-instructions.md` (primary instructions)
2. Read `docs/AGENT_QUICK_START.md` (onboarding guide)
3. Read `docs/AGENT_COORDINATION_SYSTEM.md` (coordination)

**Step 2: Check Current State (3 min)**
1. Read `docs/plans/UNIFIED_WORK_PLAN.md` (current priorities)
2. Read `docs/ACTIVE_WORK_STATUS.md` (work in progress)

**Step 3: Verify Policies (2 min)**
1. Review this document (`docs/AGENT_POLICY_ENFORCEMENT.md`)
2. Confirm understanding of mandatory policies

**Total Time: 10 minutes** to avoid hours of rework.

---

## ⚖️ Policy Violations - What Happens

### Severity Levels

**🔴 CRITICAL (System Damage)**
- Running full pytest suite → **Crashes VS Code**
- Direct DB schema edits → **Data corruption**
- **Action:** Immediate rollback + documentation update

**🟠 HIGH (Work Duplication)**
- Creating duplicate plans → **Wasted effort**
- Skipping pre-commit checks → **Broken builds**
- **Action:** Revert changes + follow correct process

**🟡 MEDIUM (Quality Issues)**
- Hardcoded strings → **Breaks i18n**
- Missing translations → **Greek users affected**
- **Action:** Fix before merge

**🔵 LOW (Documentation)**
- Creating docs without audit → **Clutter**
- **Action:** Consolidate during review

---

## 📋 Quick Reference - What to Do

| Task | Correct Command | Forbidden |
|------|----------------|-----------|
| **Run backend tests** | `.\RUN_TESTS_BATCH.ps1` | `cd backend && pytest -q` |
| **Update plan** | Edit `UNIFIED_WORK_PLAN.md` | Create new TODO.md |
| **DB migration** | `alembic revision --autogenerate` | `Base.metadata.create_all()` |
| **UI text** | `t('i18n.key')` | `"Hardcoded string"` |
| **Before commit** | `.\COMMIT_READY.ps1 -Quick` | `git commit -m "..."` directly |
| **Add docs** | Check `DOCUMENTATION_INDEX.md` | Create standalone file |

---

## 🛠️ Enforcement Mechanisms

### Automated Checks

1. **Pre-commit Hooks** (`.git/hooks/pre-commit`)
   - Run `COMMIT_READY.ps1 -Quick` automatically
   - Block commits with failures
   - Configured via `.pre-commit-config.yaml`

2. **CI/CD Pipeline** (`.github/workflows/ci-cd-pipeline.yml`)
   - Runs full test suite in batches
   - Verifies translation integrity
   - Blocks merge if tests fail

3. **ESLint Rules** (`frontend/.eslintrc.cjs`)
   - Warns on hardcoded strings
   - Enforces i18n usage
   - Auto-fixable where possible

### Manual Reviews

1. **Documentation Audits** (Monthly)
   - Check for duplicate planning docs
   - Verify index is up-to-date
   - Archive obsolete files

2. **Code Reviews** (Per PR)
   - Verify policies followed
   - Check for direct DB edits
   - Ensure tests run in batches

---

## 📚 Related Documentation

**Primary References:**
- `.github/copilot-instructions.md` - Main agent instructions
- `docs/plans/UNIFIED_WORK_PLAN.md` - Planning single source of truth
- `docs/AGENT_QUICK_START.md` - Agent onboarding
- `docs/AGENT_COORDINATION_SYSTEM.md` - Multi-agent coordination

**Testing Documentation:**
- `RUN_TESTS_BATCH.ps1` - Batch test runner
- `docs/development/TESTING_GUIDE.md` - Testing procedures
- `docs/reports/2026-01/TESTING_COMPLETE_SUMMARY.md` - Test coverage

**Database Documentation:**
- `docs/operations/DATABASE_MIGRATION_GUIDE.md` - Migration procedures
- `backend/migrations/` - Alembic migration files

**Frontend Documentation:**
- `docs/user/LOCALIZATION.md` - i18n setup
- `frontend/src/translations.ts` - Translation structure

---

## 🎯 Success Criteria

An agent has successfully integrated when they:

✅ **Read all entry documentation** (10 min investment)
✅ **Run tests using batch runner** (no crashes)
✅ **Update work plan** (no duplicate trackers)
✅ **Use Alembic migrations** (no direct DB edits)
✅ **Use i18n for all strings** (no hardcoded text)
✅ **Run pre-commit checks** (clean commits)
✅ **Audit docs before creating** (no duplicates)

**Result:** Productive work, no system crashes, no duplicated effort.

---

## 📞 Escalation Path

If you encounter:
- **Policy conflicts** → Update this document via PR
- **Unclear requirements** → Ask in project chat
- **Technical blocks** → Create GitHub issue
- **System crashes** → Report in incident log

**Document Owner:** Tech Lead / Project Manager
**Last Updated:** January 9, 2026
**Next Review:** February 9, 2026

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Jan 9, 2026 | Initial policy enforcement document | AI Agent |

---

**Remember:** These policies exist to protect you, the system, and other agents. Following them takes 10 minutes and saves hours of rework.
