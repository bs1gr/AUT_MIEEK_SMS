# Agent Policy Enforcement - Mandatory Compliance

**Version**: 1.2
**Date**: January 30, 2026
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

### Policy 0.1: HARD STOP - DO NOT COMMIT UNLESS 100% VERIFIED (NEW - MANDATORY)

**🔴 NON-NEGOTIABLE RULE:** **DO NOT COMMIT IF NOT 100% VERIFIED FIRST.**

**❌ FORBIDDEN:**
- Creating any commit before verification is complete
- "I will verify later" commits
- Partial verification claims (e.g., checked one file only)
- Committing when release assets/metadata are known to be mismatched

**✅ REQUIRED BEFORE EVERY COMMIT:**
1. Run relevant tests/checks for the changed scope
2. Read actual outputs/artifacts (not only exit code)
3. Verify runtime behavior for deployment-affecting changes
4. Verify release integrity when release files/workflows are touched (asset allowlist, hash/signature when applicable)
5. Only then commit

**Minimum gate for normal commits:**
```powershell
.\COMMIT_READY.ps1 -Quick
```

**Enforcement:**
- If verification is incomplete, the commit must be blocked.
- Agents must explicitly report what was verified before claiming completion.

---

### Policy 0.2: RELEASE LINEAGE IMMUTABILITY (NEW - MANDATORY)

**🔴 NON-NEGOTIABLE RULE:** Old tag workflows are immutable legacy behavior. Release from corrected lineage only.

**✅ REQUIRED:**
1. Treat historical tags (already published releases) as immutable legacy execution context
2. Run manual release dispatch only for the current `VERSION` tag on corrected lineage (`main`)
3. Keep release assets installer-only (`SMS_Installer_<version>.exe`) and use GitHub release digest metadata for SHA256 verification
4. Allow release asset mutation only via installer workflow policy path

**❌ FORBIDDEN:**
- Re-dispatching release workflow for old tags to "refresh" historical releases
- Uploading generic CI artifacts to release assets
- Depending on legacy tag workflow behavior for active release operations

**Why This Exists:**
- Legacy tags may include old workflow logic that re-pollutes release assets
- Tag-bound workflows are immutable and cannot be edited safely post-release
- Corrected-lineage-only release operations prevent recurrence

**Enforcement:**
- Manual dispatch for legacy tags must fail policy gate
- Sanitizer workflow must enforce installer-only asset allowlist

---

### Policy 0.3: INSTRUCTION-ORDER LOCK + EVIDENCE GATES (NEW - MANDATORY)

**🔴 NON-NEGOTIABLE RULE:** **Use instruction-order lock + evidence gates.**

**✅ REQUIRED:**
1. Execute the owner's explicit instruction sequence in the exact order provided
2. Do not reorder, skip, or merge ordered steps without explicit owner approval
3. Provide objective evidence output for each ordered step before moving to the next
4. Do not claim "complete" until all ordered evidence gates are satisfied
5. If a session handshake/acknowledgement (for example, `SESSION_POLICY_ACK`) exists, it is binding and must be enforced in behavior

**❌ FORBIDDEN:**
- Claiming completion based on downstream success while earlier ordered steps are missing
- Treating workflow success as a substitute for owner-specified order
- Ignoring session policy acknowledgements

**Enforcement:** Any missing ordered gate must be reported as **"not complete yet"**.

---

### Policy 0.4: INSTRUCTION-FIRST EXECUTION LOCK (NEW - STRICT MANDATORY)

**🔴 NON-NEGOTIABLE RULE:** **NEVER execute a generic release sequence or generic task sequence before reading repository rules for the current session.**

**✅ REQUIRED (before any release/task execution):**
1. Re-read `.github/copilot-instructions.md`
2. Re-read `docs/AGENT_POLICY_ENFORCEMENT.md`
3. Re-check owner-provided ordered steps for the current request
4. Only then execute task flow in that exact order

**❌ FORBIDDEN:**
- Starting from a default/generic workflow pattern (for example: commit → tag → publish) before instruction re-read
- Reusing prior-session release habits without current-session policy check
- Running convenience wrappers as first action if owner ordered a different sequence
- Claiming policy compliance without evidence that instruction-read gates were completed first

**Release-specific hard stop:**
- If the owner requires installer-first verification, then **no commit/tag/publish actions may occur before installer build + verification evidence is produced**.

**Enforcement:**
- Any action taken before instruction-first gates are completed is policy non-compliance and must be corrected immediately.
- Agent must explicitly report: "Instruction-first gates completed" before continuing with release execution.

---

### Policy 0.5: SOLO DEVELOPER - NO STAKEHOLDERS (NEW - MANDATORY)

**🔴 CRITICAL CLARIFICATION**: This is a **SOLO DEVELOPER** project with **ZERO external stakeholders**.

**What this means:**
- Owner makes all decisions unilaterally
- No external approval cycles needed
- No steering committees or review boards
- No waiting for "stakeholder feedback"
- No scheduling around non-existent participants

**❌ FORBIDDEN:**
- Saying "awaiting stakeholder decision" or "stakeholder approval needed"
- Creating schedules that depend on external reviews
- Deferring action to non-existent teams
- Waiting for feedback from people who don't exist

**✅ REQUIRED:**
1. **Make recommendations** when multiple paths exist
2. **Owner decides** (unilateral authority)
3. **Implement immediately** (no approval gates)
4. **Default to Option 1** when unsure (deployment-ready features first)
5. **Remove all references** to stakeholders from planning/decisions

**Examples:**
- ❌ "Awaiting stakeholder selection for Phase 5" → ✅ "Ready for owner to select Phase 5"
- ❌ "Pending team review before deploy" → ✅ "Ready to deploy at owner's command"
- ❌ "Waiting for committee approval" → ✅ "Owner decides now"

**Why This Exists:**
- Eliminates artificial bottlenecks
- Clarifies decision authority (owner only)
- Focuses effort on delivery, not ceremony
- Accelerates progress without approval overhead

**Enforcement:** Any reference to non-existent stakeholders will be corrected before implementation.

---

### Policy 0: Verification - ALWAYS Verify Before Claiming Success

**❌ FORBIDDEN:**
- Claiming fixes are "complete" without verification
- Stating "ready for production" without testing
- Saying "all tests passing" without checking actual output
- Marking work as "done" without validation

**✅ REQUIRED:**
1. **Make the change**
2. **Run the tests** (wait for completion)
3. **Read the actual test output** (not just exit codes)
4. **Verify in running application** (visual check if UI change)
5. **ONLY THEN** claim the fix is complete

**For UI/Frontend Changes:**
```powershell
# Make the change, then:
npm --prefix frontend run test -- ComponentName.test --run  # Run tests
.\NATIVE.ps1 -Start                                         # Start app
# Open browser to http://localhost:5173
# Visually verify the change works correctly
# ONLY THEN say "verified and working"
```

**For Backend Changes:**
```powershell
# Make the change, then:
.\RUN_TESTS_BATCH.ps1                                      # Run tests
# Read test-results/backend_batch_full.txt
# Check for ✓ symbols (passed) or ✗ symbols (failed)
# ONLY THEN say "tests passing"
```

**Why This Exists:**
- Prevents false claims of completion
- Ensures quality before marking work done
- Builds trust with solo developer
- Catches issues before they reach production

**Enforcement:** Any claim of "fixed" or "complete" must include verification steps taken.

---

### Policy 1: Deployment - NATIVE for Testing, DOCKER for Production

**❌ FORBIDDEN:**

```powershell
# These create ad-hoc procedures and break the system

.\DOCKER.ps1 -Start                    # ❌ WRONG for testing - only for production
.\NATIVE.ps1 -Start                    # ❌ WRONG for production - only for testing
# Custom deployment scripts or procedures

```text
**✅ REQUIRED:**

```powershell
# ALWAYS use the correct script for the correct purpose

.\NATIVE.ps1 -Start                    # ✅ Test/develop only (hot reload, 8000/5173)
.\DOCKER.ps1 -Start                    # ✅ Deploy to production only (8080)

```text
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

```text
**✅ REQUIRED:**

```powershell
# ALWAYS use the batch test runner

.\RUN_TESTS_BATCH.ps1                    # Default: 5 files per batch
.\RUN_TESTS_BATCH.ps1 -BatchSize 3       # Smaller batches
.\RUN_TESTS_BATCH.ps1 -Verbose           # Detailed output

```text
**Why This Exists:**
- 490+ test files overload system memory/CPU
- Causes VS Code to freeze or crash completely
- Batch runner prevents system overload
- Documented in: `.github/copilot-instructions.md`, `RUN_TESTS_BATCH.ps1`

**Exception:** Single test files are OK for development:

```powershell
cd backend && pytest tests/test_specific_file.py -v  # OK

```text
**🚫 CRITICAL: When Running Tests in Background - DO NOT INTERRUPT**

When tests are running in background (`isBackground: true`), follow this STRICTLY:

❌ **FORBIDDEN:**
- Checking terminal output during execution
- Running git commands while tests run
- Querying test result files mid-run
- Any terminal activity that might interfere
- Running *any* command in the same terminal session (including `Start-Sleep`)

✅ **REQUIRED:**
1. Start batch runner with `-isBackground: true`
2. **Let it run completely undisturbed** (typically 5-10 minutes for full suite)
3. **Wait for natural completion** (script will finish and show final summary)
4. **Only then** check results or terminal output
5. Check test result files AFTER completion, never during

**Why This Matters:**
- Interrupting background processes leaves them in incomplete state
- Checking terminal mid-run can disrupt the test runner
- Lost output = cannot verify results
- Causes false negatives or incomplete test suites

**Enforcement:** Agents must let batch runner complete naturally before checking results.

---

---

### Policy 2: Planning & Versioning - Single Source of Truth ONLY

**❌ FORBIDDEN:**
- Creating new backlog/planning files
- Creating new planning documents
- Creating new status trackers
- Creating parallel plans or roadmaps
- Using incorrect version numbers (e.g., v11.x.x, v2.x.x)

**✅ REQUIRED:**
- Update `docs/plans/UNIFIED_WORK_PLAN.md` for ALL planning
- Check work plan BEFORE starting any work
- Update work plan AFTER completing tasks
- Verify version directly from `VERSION` file
- **CRITICAL**: Use `v1.MINOR.PATCH` format ONLY (e.g., `vv1.18.21`)
- **STRICTLY FORBIDDEN**: NEVER use `v11.x.x`, `v1.x.x`, or any format other than `v1.x.x`

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

```text
**✅ REQUIRED:**

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head

```text
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

```text
**✅ REQUIRED:**

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;
}

```text
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

```text
**⏳ Patience Required (Do Not Interrupt):**
- **Never** run git status/log or any git commands while COMMIT_READY.ps1 is running; let it finish naturally.
- Wait reasonable minimums before checking status: **Quick: 5-10 minutes**, **Standard: 10-15 minutes**, **Full: 20-30 minutes**.
- Only if there is **no output for 20+ minutes beyond expected** should you consider investigating; otherwise, assume it is still working.

**🚦 Exception protocol (chicken-and-egg / known red pipeline):**
- Use **ONLY** when the pipeline is already red due to a known failing suite **outside your change scope** and COMMIT_READY would fail for the same root cause.
- Steps you **must** take before bypassing:

   1) Record a snapshot: `COMMIT_READY.ps1 -Quick -Snapshot` **or** `scripts/VERIFY_AND_RECORD_STATE.ps1`.
   2) Run the **smallest targeted checks** relevant to your change (e.g., `npx tsc --noEmit` for TS-only edits, or `ruff` for backend lint) and confirm they pass locally.
   3) Document the reason in your summary/commit message (e.g., "Bypass guard: backend tests already failing in main (unrelated)").
- If you must proceed, you may commit with `--no-verify` **once**, then immediately open/track a work item to fix the upstream failure. Re-run COMMIT_READY as soon as the blocking suite is repaired.

**Why This Exists:**
- Prevents broken code from entering codebase
- Auto-fixes formatting issues
- Catches bugs before commit
- Documented in: `docs/development/GIT_WORKFLOW.md`

**Enforcement:** Git pre-commit hooks (configured in `.git/hooks/`).

---

### Policy 6: Linting & Formatting - ALWAYS Fix Before Commit

**❌ FORBIDDEN:**
- Committing code with linting errors
- Submitting PRs with formatting issues
- Skipping auto-fix steps due to time pressure
- Allowing CI/CD to fail on code quality issues

**✅ REQUIRED - Before EVERY commit:**

**Step 1: Auto-fix linting issues**
```powershell
# Fix all Python linting issues (Ruff)
python -m ruff check backend/ --fix
# If frontend/scripts exists:
# python -m ruff check frontend/scripts/ --fix

# Check for remaining issues
python -m ruff check backend/
# If frontend/scripts exists:
# python -m ruff check frontend/scripts/
# Should output: "All checks passed!"

# Fix frontend lint/format (ESLint autofix)
npm --prefix frontend run lint -- --fix

# Type check (optional but recommended)
npx tsc --noEmit --skipLibCheck
```

**Step 2: Run pre-commit validation**
```powershell
# Always run COMMIT_READY before committing
.\COMMIT_READY.ps1 -Quick         # Minimum validation (2-3 min)
# Only proceed if all checks pass

# If COMMIT_READY fails:
# 1. Read the error output carefully
# 2. Fix the identified issues
# 3. Re-run COMMIT_READY until it passes
# 4. ONLY THEN commit
```

**Step 3: Commit with confidence**
```powershell
# After COMMIT_READY passes, commit safely
git add <files>
git commit -m "semantic: message"
```

**Common Issues & Fixes:**

| Issue | Command | Result |
|-------|---------|--------|
| Unused imports | `python -m ruff check --fix` | Auto-removed |
| Trailing spaces | `python -m ruff check --fix` | Auto-cleaned |
| Line length | `python -m ruff check --fix` | Auto-fixed |
| Formatting | `npm --prefix frontend run lint -- --fix` | Auto-formatted |
| Type errors | `npx tsc --noEmit` | Display to fix manually |
| Test failures | `.\RUN_TESTS_BATCH.ps1` | Read output and fix |

**Why This Exists:**
- CI/CD pipeline enforces code quality standards
- Pre-commit hooks will block commits with linting errors
- Production deployments require clean code
- Saves hours of back-and-forth on code review
- Prevents failed CI/CD runs that block deployments
- Maintains consistent code style across team
- Documented in: `docs/development/GIT_WORKFLOW.md`, `.github/workflows/`

**Enforcement:**
- ✅ Pre-commit hooks auto-validate before commit
- ✅ Ruff linter on Python files
- ✅ Prettier on frontend files
- ✅ ESLint on JavaScript/TypeScript
- ✅ GitHub Actions CI/CD (blocks merge if failed)
- ✅ COMMIT_READY.ps1 mandatory gate

**Real Example - Today's Session:**
```
Before: 5 linting errors found
  - 4 unused imports
  - 1 unused variable

Action: python -m ruff check --fix
Result: Auto-fixed 4 issues
        Manually fixed 1 issue
        All checks passed!

Commit: ✅ aafffa04b - style(linting): fix unused imports and variables
```

---

### Policy 7: Documentation - Audit Before Creating

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

### Policy 8: Work Verification - ALWAYS Check Uncommitted & Pending Tasks First

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

```text
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

```text
**Enforcement:** Agents must verify clean state before accepting new tasks.

---

### Policy 9: State Snapshot - MANDATORY at Session Start and Before Claims

**Purpose:** Preserve evidence and prevent data/context loss under rate limits or long sessions by recording the current workspace state and validation artifacts.

**✅ REQUIRED:**
- At the start of every session: Record a state snapshot
- Before any success claims (e.g., "tests passing", "ready to release"): Record a state snapshot

**How to Record a Snapshot:**

```powershell
# Option A (recommended): COMMIT_READY quick validation with snapshot

.\COMMIT_READY.ps1 -Quick -Snapshot

# Option B: VS Code Task

Tasks: Run Task → "Record State Snapshot"

# Option C: Direct script run

pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\VERIFY_AND_RECORD_STATE.ps1

```

**What Gets Recorded (artifacts/state):**
- Version checks (VERSION vs frontend/package.json)
- Git branch, commit, remotes, concise change list
- Pre-commit quick validation output (COMMIT_READY_* log)
- Test artifacts summary (does not run long tests)
- Backups inventory (latest file, size, timestamp)
- Environment files presence (.env, .env.production.SECURE)
- Latest migrations overview

**Enforcement:**
- CI/CD and pre-commit reviews require snapshot artifacts for claims
- Missing snapshots will block "success" statements in reviews
- Agents must reference the latest snapshot when summarizing work

---

### Policy 10: Session Start Instruction Review - MANDATORY for ALL Agents

**✅ REQUIRED (every session, no exceptions):**
1. Read `.github/copilot-instructions.md` and this document **at the start of every session**.
2. Explicitly confirm compliance before doing any work.
3. **Multi-agent requirement:** The primary agent must ensure **every subagent** is instructed to read and follow these policies before they begin tasks.

**Why This Exists:**
- Prevents policy drift across sessions
- Ensures consistent behavior across multiple agents
- Avoids repeated mistakes when context changes

**Enforcement:** Any work started without this review is considered non-compliant.

---

## 🔍 How to Verify Compliance

### For Agents Starting Work

**Step 1: Read Entry Points (5 min)**
1. Read `.github/copilot-instructions.md` (primary instructions)
2. Read this document (`docs/AGENT_POLICY_ENFORCEMENT.md`)
3. Read `docs/AGENT_QUICK_START.md` (onboarding guide)
4. Read `docs/AGENT_COORDINATION_SYSTEM.md` (coordination)

**Step 2: Check Current State (3 min)**
1. Read `docs/plans/UNIFIED_WORK_PLAN.md` (current priorities)
2. Read `docs/DOCUMENTATION_INDEX.md` (documentation navigation)

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
- **Using wrong version format (v11.x.x, v1.x.x)** → **BREAKS ALL VERSION TRACKING** (MUST be v1.x.x)
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
| **Fix linting** | `python -m ruff check --fix` | Commit with linting errors |
| **Format code** | `npm --prefix frontend run lint -- --fix` | Commit unformatted code |
| **Update plan** | Edit `UNIFIED_WORK_PLAN.md` | Create new backlog docs |
| **Check version** | Read `VERSION` file directly | Invent version numbers |
| **Use version** | **ONLY `v1.x.x`** (example: `vv1.18.21`) | **NEVER `v11.x.x`, `$11.18.3`, `v2.x.x`** |
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
✅ **Repeat instruction review every session** (including subagents)
✅ **Run tests using batch runner** (no crashes)
✅ **Update work plan** (no duplicate trackers)
✅ **Use correct versioning** (from `VERSION` file)
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
