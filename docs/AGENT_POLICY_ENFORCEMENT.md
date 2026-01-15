# Agent Policy Enforcement - Mandatory Compliance

**Version**: 1.1
**Date**: January 11, 2026
**Status**: ACTIVE - ALL AGENTS MUST COMPLY
**Authority**: Project-wide mandatory policy
**Development Mode**: 🧑‍💻 **SOLO DEVELOPER** - Single developer with AI assistant as only support

---

## 🚨 CRITICAL: This Document is Mandatory for ALL AI Agents

This document establishes **non-negotiable policies** that **EVERY AI agent** working on this project **MUST** follow. These policies exist to prevent system crashes, data loss, and work duplication.

**Solo Developer Context**: This project is maintained by a single developer. The AI agent's role is to provide technical assistance, prevent mistakes, and ensure quality. There are no other team members - the developer is the only human contributor.

**Violations of these policies cause real harm:**
- ❌ Running tests incorrectly crashes VS Code
- ❌ Creating duplicate plans wastes time and creates confusion
- ❌ Skipping pre-commit checks introduces bugs
- ❌ Editing DB schema directly corrupts data

---

## 📜 Mandatory Policies - Zero Exceptions

### Policy 0: Deployment - NATIVE for Testing, DOCKER for Production

**❌ FORBIDDEN:**
```powershell
# These create ad-hoc procedures and break the system
.\DOCKER.ps1 -Start                    # ❌ WRONG for testing - only for production
.\NATIVE.ps1 -Start                    # ❌ WRONG for production - only for testing
# Custom deployment scripts or procedures
```

**✅ REQUIRED:**
```powershell
# ALWAYS use the correct script for the correct purpose
.\NATIVE.ps1 -Start                    # ✅ Test/develop only (hot reload, 8000/5173)
.\DOCKER.ps1 -Start                    # ✅ Deploy to production only (8080)
```

**Why This Exists:**
- `DOCKER.ps1` and `NATIVE.ps1` are the **ONLY TWO** deployment entry points
- They are comprehensive, tested, and documented
- Creating custom procedures bypasses safety checks
- Using wrong script causes environment mismatches
- Documented in: `.github/copilot-instructions.md`, `README.md`, `docs/deployment/DOCKER_OPERATIONS.md`

**Enforcement:** All deployment requests must use one of these two scripts. Period.

---

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

### Policy 2: Planning & Versioning - Single Source of Truth ONLY

**❌ FORBIDDEN:**
- Creating new TODO.md files
- Creating new planning documents
- Creating new status trackers
- Creating parallel plans or roadmaps
- Using incorrect version numbers (e.g., v11.x.x, v2.x.x)

**✅ REQUIRED:**
- Update `docs/plans/UNIFIED_WORK_PLAN.md` for ALL planning
- Check work plan BEFORE starting any work
- Update work plan AFTER completing tasks
- Verify version from `VERSION` file (current: 1.17.1)
- **CRITICAL**: Use `v1.MINOR.PATCH` format ONLY (e.g., $11.18.0)
- **STRICTLY FORBIDDEN**: NEVER use `v11.x.x`, `$11.x.x`, or any format other than `v1.x.x`

**Why This Exists:**
- Multiple plans create confusion
- Agents duplicate work when plans diverge
- Single source of truth prevents conflicts
- **CRITICAL**: Incorrect version format (v11.x.x) breaks all version tracking
- Documented in: `docs/plans/UNIFIED_WORK_PLAN.md`, `.github/copilot-instructions.md`

**Enforcement:** Documentation audits flag duplicate planning files and incorrect version formats.

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

### Policy 7: Work Verification - ALWAYS Check Uncommitted & Pending Tasks First

**❌ FORBIDDEN:**
- Starting new work without checking git status
- Proceeding to next task with uncommitted changes
- Ignoring pending work items in task lists
- Switching contexts without completing current task

**✅ REQUIRED:**
```powershell
# ALWAYS check before starting new work
git status                        # Check for uncommitted changes
git diff                          # Review pending changes
# Check task tracker/work plan for incomplete items
```

**Pre-Task Checklist:**
1. Run `git status` to verify no uncommitted changes
2. Review `docs/plans/UNIFIED_WORK_PLAN.md` for pending tasks
3. Check for incomplete work in current session
4. Commit or stash any pending changes before switching tasks
5. Update work plan with completed tasks before starting new ones

**Why This Exists:**
- Prevents context switching with incomplete work
- Avoids losing uncommitted changes
- Ensures task completion before moving forward
- Maintains clean work history and traceability
- Prevents work fragmentation and partial implementations
- Documented in: `docs/development/GIT_WORKFLOW.md`

**Exception:** Intentional WIP (work in progress) commits are allowed:
```powershell
git add .
git commit -m "WIP: feature description"  # OK for checkpoint
```

**Enforcement:** Agents must verify clean state before accepting new tasks.

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
2. Verify clean state: Run `git status` and check work plan

**Total Time: 10 minutes** to avoid hours of rework.

---

## ⚖️ Policy Violations - What Happens

### Severity Levels

**🔴 CRITICAL (System Damage)**
- Running full pytest suite → **Crashes VS Code**
- Direct DB schema edits → **Data corruption**
- **Using wrong version format (v11.x.x, $11.x.x)** → **BREAKS ALL VERSION TRACKING** (MUST be v1.x.x)
- **Action:** Immediate rollback + revert to correct v1.x.x format

**🟠 HIGH (Work Duplication)**
- Creating duplicate plans → **Wasted effort**
- Skipping pre-commit checks → **Broken builds**
- Incorrect branch names → **Merge conflicts**
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
| **Check version** | Read `VERSION` file (1.17.1) | Invent version numbers |
| **Use version** | **ONLY `v1.x.x`** ($11.18.0) | **NEVER `v11.x.x`, `$11.x.x`, `v2.x.x`** |
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
✅ **Use correct versioning** (1.17.1 from VERSION file)
✅ **Verify clean state before new tasks** (no uncommitted work)
✅ **Use Alembic migrations** (no direct DB edits)
✅ **Use i18n for all strings** (no hardcoded text)
✅ **Run pre-commit checks** (clean commits)
✅ **Audit docs before creating** (no duplicates)

**Result:** Productive work, no system crashes, no duplicated effort.

---

## 📞 Escalation Path

If you encounter:
- **Policy conflicts** → Update this document via commit
- **Unclear requirements** → Clarify with solo developer
- **Technical blocks** → C11, 2026
**Next Review:** February 11, 2026

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.1 | Jan 11, 2026 | Added Policy 7: Work Verification (uncommitted & pending tasks) | AI Agent |
| 1.0 | Jan 9, 2026 | Initial policy enforcement document | AI Agent |

---

**Remember:** These policies exist to protect you, the system, and other agents. Following them takes 10 minutes and saves hours of rework.
