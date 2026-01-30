# Copilot Instructions for Student Management System

**Version**: v1.17.2 (Jan 2026) | **Status**: ✅ STABLE (Released Jan 14, 2026)
**Development Mode**: 🧑‍💻 **SOLO DEVELOPER** (Single developer + AI assistant only)

## ⚡ Quick Onboarding

**What you're working with**: Bilingual (EN/EL) student management system with dual deployment modes (Docker production + Native development). Built for ΜΙΕΕΚ Cyprus technical college.

**Solo Development Context**: This project is maintained by a single developer working with AI assistant as the only support. All role references in documentation (team members, distinct roles) should be interpreted as workflow checkpoints, not actual team members.

**🎯 THE DEPLOYMENT WORKFLOW (CRITICAL - MEMORIZE THIS):**
```powershell
# ✅ TEST on Native (development with hot reload)
.\NATIVE.ps1 -Start          # Backend (8000) + Frontend (5173)

# ✅ DEPLOY on Docker (production container)
.\DOCKER.ps1 -Start          # Production deployment (8080)
```
**This is the only correct workflow. Use NATIVE for testing, use DOCKER for production.**

**First Steps for AI Agents**:
0. Record a workspace snapshot: run COMMIT_READY Quick with -Snapshot or use the VS Code task "Record State Snapshot" (artifacts/state)
0a. **Session start (mandatory):** Re-read this file and `docs/AGENT_POLICY_ENFORCEMENT.md` every session. Primary agent must ensure subagents do the same.
1. Check current status in [docs/plans/UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md) (single source of truth)
2. Read [DOCUMENTATION_INDEX.md](../docs/DOCUMENTATION_INDEX.md) for navigation
3. Follow [docs/AGENT_POLICY_ENFORCEMENT.md](../docs/AGENT_POLICY_ENFORCEMENT.md) (prevents crashes & duplication)

**Current Version**: v1.17.2 (stored in `VERSION` file - **always check this first**)

---

## 🚨 Critical "Don't Do This" Rules

These are the most common mistakes that break the codebase:

**🎯 DEPLOYMENT RULE (MOST CRITICAL):**
```powershell
# ❌ NEVER use wrong script for wrong purpose
.\DOCKER.ps1 -Start                    # ❌ WRONG for testing - ONLY for production
.\NATIVE.ps1 -Start                    # ❌ WRONG for production - ONLY for testing

# ✅ CORRECT WORKFLOW ONLY
.\NATIVE.ps1 -Start                    # ✅ Test/develop (hot reload, 8000/5173)
.\DOCKER.ps1 -Start                    # ✅ Deploy to production (8080)
```

**Why**: These are the ONLY two deployment entry points. Using anything else creates custom procedures that break the system.

**Testing Only:**
```powershell
# ❌ NEVER run pytest directly - will crash VS Code with 490+ tests
cd backend && pytest -q

# ✅ ALWAYS use batch runner (splits into manageable chunks)
.\RUN_TESTS_BATCH.ps1
```

**Background test runs must be left completely undisturbed**:
- ❌ Do NOT run any commands in the same terminal while the batch runner or COMMIT_READY is active (this includes `Start-Sleep`).
- ✅ If you need to wait, use a separate terminal or wait without issuing commands.

**Why**: Running all tests at once overloads memory/CPU. Project policy enforces batch testing via guard in `backend/tests/conftest.py`. CI is exempt; local runs require `SMS_ALLOW_DIRECT_PYTEST=1` override or batch runner.

**Other Critical Rules**:
- ❌ Never edit DB schema directly → Always use Alembic migrations (`alembic revision --autogenerate`)
- ❌ Never hardcode UI strings → Use `t('i18n.key')` from `translations.ts` (bilingual EN/EL required)
- ❌ Never create new TODO/planning docs → Update `docs/plans/UNIFIED_WORK_PLAN.md`
- ❌ Never start new work without checking git status → Run `git status` and verify no uncommitted changes
- ❌ **NEVER use incorrect version format** → ALWAYS use `v1.x.x` format (e.g., v1.15.1), NEVER `v11.x.x` or `$11.x.x`
- ❌ Never use `@app.on_event()` → Use `@asynccontextmanager` lifespan (see `backend/lifespan.py`)
- ❌ Never use `require_role()` for admin endpoints → Use `optional_require_role()` (respects AUTH_MODE)
- ❌ **NEVER create unnecessary documentation** → Only create files that are ESSENTIAL:
  - Code files (components, services, routers)
  - Documentation that doesn't already exist in the codebase
  - Files explicitly required by policy (pre-commit, CI/CD, migrations)
  - **FORBIDDEN**: Status reports, verification documents, summary files, handoff notes, session reports, progress trackers (except `UNIFIED_WORK_PLAN.md`)
  - Code commits and the work plan are sufficient documentation. Let code speak for itself.

---

## 📜 Mandatory Policies - Zero Exceptions

**⚠️ CRITICAL**: All agents MUST follow these policies. Violations cause system crashes, data loss, and work duplication. See [docs/AGENT_POLICY_ENFORCEMENT.md](../docs/AGENT_POLICY_ENFORCEMENT.md) for complete details.

### Policy 0: Verification - ALWAYS Verify Before Claiming Success (MANDATORY)

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
# Test language switcher if i18n changes
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

**Why**: 490+ test files overload system memory/CPU and crash VS Code. Exception: Single test files OK (`pytest tests/test_specific_file.py -v`).

---

### Policy 2: Planning & Versioning - Single Source of Truth ONLY

**❌ FORBIDDEN:**
- Creating new TODO.md files or planning documents
- Creating new status trackers or parallel plans
- Using incorrect version format (v11.x.x, $11.x.x, v2.x.x)

**✅ REQUIRED:**
- Update `docs/plans/UNIFIED_WORK_PLAN.md` for ALL planning
- Check work plan BEFORE starting work, update AFTER completing tasks
- Verify version from `VERSION` file (current: 1.17.2)
- **CRITICAL**: Use `v1.MINOR.PATCH` format ONLY (e.g., v1.17.1)
- **STRICTLY FORBIDDEN**: NEVER use `v11.x.x`, `$11.x.x`, or any format other than `v1.x.x`

**Why**: Multiple plans create confusion. Incorrect version format breaks all version tracking.

**⚠️ AUTOMATED ENFORCEMENT (Version Format)**

Version format violations are **AUTOMATICALLY BLOCKED** by multiple layers:

1. **Pre-commit hooks**: Local validation blocks commits with wrong format
2. **COMMIT_READY.ps1**: Phase 0.5 validates v1.x.x format (critical check)
3. **GitHub Actions CI/CD**: Rejects pushes with version violations
4. **Version validator script**: `scripts/validate_version_format.ps1`

**If version format validation fails:**
- COMMIT_READY.ps1 will display: `❌ CRITICAL VERSION VIOLATION DETECTED`
- Pre-commit hooks will block commit with error message
- CI/CD pipeline will reject the push

**Forbidden formats that WILL be rejected:**
- `v11.x.x` - Breaks version tracking (CRITICAL)
- `$11.x.x` - Breaks version tracking (CRITICAL)
- `v2.x.x` - Wrong major version
- Any format without `v1.` prefix

**To fix:**
1. Edit `VERSION` file to use `v1.x.x` format
2. Re-run `.\COMMIT_READY.ps1` to validate
3. Retry commit

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

**Why**: Direct schema changes corrupt data. Migrations provide version control and rollback capability.

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

**Why**: Bilingual system (EN/EL) requires translations. Hardcoded strings break Greek users.

---

### Policy 5: Pre-Commit - Validation ALWAYS Required

**❌ FORBIDDEN:**
- Committing without running pre-commit checks
- Skipping `COMMIT_READY.ps1`
- Bypassing validation with `--no-verify`

**✅ REQUIRED:**
```powershell
.\COMMIT_READY.ps1 -Quick         # Quick validation (2-3 min)
.\COMMIT_READY.ps1 -Standard      # Standard checks (5-8 min)
.\COMMIT_READY.ps1 -Full          # Full validation (15-20 min)
```

**Why**: Prevents broken code, auto-fixes formatting, catches bugs before commit.

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

**Why**: Prevents documentation sprawl and maintains single source of truth.

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
# Check docs/plans/UNIFIED_WORK_PLAN.md for incomplete items
```

**Pre-Task Checklist:**
1. Run `git status` to verify no uncommitted changes
2. Review `docs/plans/UNIFIED_WORK_PLAN.md` for pending tasks
3. Commit or stash any pending changes before switching tasks
4. Update work plan with completed tasks before starting new ones

**Why**: Prevents context switching with incomplete work, avoids losing changes, maintains clean history.

**Exception**: Intentional WIP commits allowed: `git commit -m "WIP: feature description"`

---

## 🚨 CRITICAL LESSON LEARNED - Verification Before Claims (Jan 12, 2026)

### The Problem That Occurred
An agent claimed "all 370 backend tests passing" and "100% success" **WITHOUT verifying actual test output files**. This resulted in:
- ❌ v1.18.0 released on broken code (68.75% success rate, not 100%)
- ❌ 5 test batches actually failing (Batches 4, 6, 8, 10, 13)
- ❌ False confidence in code quality
- ❌ Hours wasted debugging after stakeholder caught the error

### Root Cause of the Issue
**Missing schema exports in `backend/schemas/__init__.py`**:
- `BulkAssignRolesRequest` and `BulkGrantPermissionsRequest` not exported
- Caused Pydantic ForwardRef errors when FastAPI generated OpenAPI schema
- Cascaded into 4-5 test batch failures
- **Simple fix**: Added 2 export lines to __init__.py
- **Impact**: All 16 batches then passed

### The Lesson for All Agents

**🔴 NEVER do this:**
```python
# ❌ BAD: Make claims without evidence
"All tests passing! Ready for release!"
# (without checking test output)

# ❌ BAD: Assume success based on exit codes
"Exit code 0, tests must be passing"
# (without reading actual test results)

# ❌ BAD: Claim completion without verification
"Fixed all issues, confidence high"
# (without running affected code)
```

**✅ ALWAYS do this:**
```python
# ✅ GOOD: Verify actual results
1. Run: .\RUN_TESTS_BATCH.ps1
2. Read: test-results/backend_batch_full.txt
3. Check: For ✓ symbols (passed) or ✗ symbols (failed)
4. Count: Actual number of batches that passed
5. Report: "X of Y batches passed. Details: ..."

# ✅ GOOD: Search for failures explicitly
# Look for: FAILED, ERROR, ✗, no such table, ForwardRef
# Don't ignore: Warnings, skipped tests, cascade failures

# ✅ GOOD: Test the fix individually first
python -m pytest tests/test_specific_file.py::test_name -xvs
# Verify it passes before claiming success

# ✅ GOOD: Run the full suite to confirm
.\RUN_TESTS_BATCH.ps1
# Wait for completion and check final summary
```

### How to Verify Test Results

**Step 1: Check test output file**
```powershell
Get-Content test-results/backend_batch_full.txt | Select-String "Batch.*completed|FAILED|ERROR"
```

**Step 2: Count successes and failures**
```powershell
(Get-Content test-results/backend_batch_full.txt | Select-String "✓ Batch.*successfully").Count
# Count ✓ symbols - should equal number of batches
```

**Step 3: Look for specific errors**
```powershell
Get-Content test-results/backend_batch_full.txt | Select-String "ForwardRef|no such table|pydantic"
# Look for root cause clues
```

**Step 4: Read final summary**
```powershell
Get-Content test-results/backend_batch_full.txt | Select-String "All tests passed|FAILED"
# Should say "All tests passed" for success
```

### State Snapshot Recording (Prevent Data Loss)

After validations, record a workspace state snapshot to preserve evidence and prevent data loss during handoffs:

```powershell
# One-off snapshot (non-invasive; uses existing artifacts)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\VERIFY_AND_RECORD_STATE.ps1

# Or combine with COMMIT_READY
pwsh -NoProfile -ExecutionPolicy Bypass -File .\COMMIT_READY.ps1 -Quick -Snapshot
# -Snapshot saves two files under artifacts/state:
#   - STATE_YYYY-MM-DD_HHMMSS.md (summary of version, git, test artifacts, backups, env files, migrations)
#   - COMMIT_READY_YYYY-MM-DD_HHMMSS.log (pre-commit quick validation output)
```

What the snapshot captures:
- Version checks (VERSION vs frontend/package.json)
- Git branch, commit, remotes, and concise change list
- Pre-commit quick validation preview
- Existing test artifacts summary (does not run long tests)
- Backups inventory (latest file, size, timestamp)
- Environment files presence (.env, .env.production.SECURE)
- Latest migrations (list only; no execution)

This complements the verification steps by creating a timestamped record that can be audited later, reducing the risk of data loss or unverified claims.

### Verification Checklist Before Claiming Success

- [ ] Ran `.\RUN_TESTS_BATCH.ps1` (not `pytest` directly)
- [ ] Waited for full completion (all 16 batches)
- [ ] Read `test-results/backend_batch_full.txt` actual output
- [ ] Counted ✓ symbols (should be 16 for success)
- [ ] Searched for ✗ symbols (should be 0)
- [ ] Found no FAILED or ERROR in output
- [ ] Checked final summary line: "All tests passed"
- [ ] Verified fix with individual test: `pytest tests/test_file.py::test_name -xvs`
- [ ] Only then: "Tests passing, ready to proceed"

### Impact of Getting This Wrong

| Mistake | Consequence | Prevention |
|---------|-------------|-----------|
| Claim success without checking | Release broken code | Check test results file |
| Ignore cascade failures | Multiple batches fail | Search for all errors |
| Assume exit code 0 = all pass | Miss individual failures | Read actual output |
| Skip individual test verification | Fix doesn't work | Test in isolation first |

### Real Example from Jan 12, 2026

**What Went Wrong**:
```
Claimed: "All 370 tests passing, ready for v1.18.0 release"
Reality: 68.75% success rate (5 batches failing)
Root Cause: Missing 2 schema exports in __init__.py
Evidence: test-results/backend_batch_full.txt showed ForwardRef errors
```

**How It Was Caught**:
```
User said: "all still fail. you should not rush and review and audit deeper"
Agent then:
1. Read actual test output file
2. Found 5 failed batches
3. Analyzed ForwardRef errors
4. Located missing exports
5. Applied fix
6. Verified with individual tests
7. Ran full suite to confirm all pass
Result: Fixed v1.18.0, all 16 batches passing
```

### Bottom Line

**For every claim of success, ask yourself:**
1. Did I actually run the test? (Not assume)
2. Did I read the output? (Not skim)
3. Did I check for failures explicitly? (Not just absence of errors)
4. Did I verify the specific fix? (Not just general pass)
5. Am I 100% confident this is correct? (Not 90% confident)

**If you can't answer YES to all 5 questions, don't claim success.**

---

## 🏗️ Architecture Essentials

### Dual Deployment Modes (Non-Obvious Design)

| Mode | Entry Point | Ports | Key Difference |
|------|-------------|-------|----------------|
| **Docker** | `DOCKER.ps1 -Start` | 8080 | FastAPI serves **pre-built** React SPA (production) |
| **Native** | `NATIVE.ps1 -Start` | 8000 (API) + 5173 (Vite) | Backend + Frontend **separate** processes (hot reload) |

**Why this matters**: In Docker mode, frontend changes require rebuild. In Native mode, Vite HMR works instantly. Frontend is built **into** Docker image at build time (see `docker/docker-compose.yml`).

### Modular Backend Architecture (v1.9.5+ Refactor)

`backend/main.py` is just an entry point (~130 lines). All logic split into:

```python
# Don''t look for app configuration in main.py - it''s delegated:
backend/app_factory.py          # FastAPI app creation
backend/lifespan.py             # Startup/shutdown (migrations run here)
backend/middleware_config.py    # All middleware registration
backend/error_handlers.py       # Exception handlers
backend/router_registry.py      # Router registration
```

**Why this matters**: When debugging startup issues or adding middleware, check these modules, not `main.py`.

### Environment Detection System

`backend/environment.py` enforces runtime context rules:

```python
# Production mode REQUIRES Docker (enforced via RuntimeContext.assert_valid())
# Test mode: Auto-detected via pytest env vars or DISABLE_STARTUP_TASKS=1
# Development mode: Default (no SMS_ENV set)
```

**Key insight**: You **cannot** run production mode in native deployment - will raise error. This prevents prod config from running on dev machines.

---

## 🔧 Developer Workflows (Non-Obvious Commands)

### Script Consolidation (v2.0 - Jan 2026)

**OLD way (deprecated)**: `RUN.ps1`, `INSTALL.ps1`, `SMS.ps1`, `run-native.ps1` (100+ scripts!)

**NEW way (consolidated)**:
```powershell
.\DOCKER.ps1 -Start      # Production/staging operations
.\NATIVE.ps1 -Start      # Development with hot reload
.\COMMIT_READY.ps1 -Quick # Pre-commit validation (2-3 min)
```

**Key files**:
- `config/mypy.ini`, `config/pytest.ini`, `config/ruff.toml` (configs moved from root)
- `docker/docker-compose.yml` (main), `docker-compose.prod.yml` (overlay)

### Testing Workflow (Stability-Critical)

**Batch runner configuration** (`RUN_TESTS_BATCH.ps1`):
```powershell
-BatchSize 5       # Default: 5 test files per batch
-Verbose           # Show detailed output
-FastFail          # Stop on first failure
```

**Test environment auto-setup** (`backend/tests/conftest.py`):
- `DISABLE_STARTUP_TASKS=1` → Skips migrations/heavy startup
- `CSRF_ENABLED=0` → CSRF disabled (TestClient doesn''t handle cookies)
- Rate limiting auto-disabled via `limiter.enabled = False`
- In-memory SQLite with `StaticPool` (fast, isolated)

**Frontend tests**: Vitest in `frontend/src/**/__tests__/*.test.{ts,tsx}` (1249 tests)

### Pre-Commit Validation (Quality Gate)

```powershell
.\COMMIT_READY.ps1 -Quick    # Fast: format, lint, smoke tests (2-3 min)
.\COMMIT_READY.ps1 -Standard # + backend tests (5-8 min)
.\COMMIT_READY.ps1 -Full     # + all frontend tests (15-20 min)
.\COMMIT_READY.ps1 -AutoFix  # Fix formatting/imports automatically
```

**Why this exists**: Consolidates `COMMIT_PREP.ps1`, `PRE_COMMIT_CHECK.ps1`, `PRE_COMMIT_HOOK.ps1`, `SMOKE_TEST_AND_COMMIT_PREP.ps1` into single script. Auto-cleanup included (timeout: 120s, skips large dirs).

---

## 📐 Critical Patterns

### Database Soft Delete (Auto-Filtering)

All models inherit `SoftDeleteMixin` → `deleted_at` column. **Queries automatically filter deleted records** via `SoftDeleteQuery` (see `backend/models_soft_delete.py`).

```python
# This automatically excludes deleted_at IS NOT NULL
students = db.query(Student).all()  # Only active students
```

**Key insight**: You don''t need explicit `filter(Student.deleted_at.is_(None))` - it''s automatic.

### API Rate Limiting Pattern

```python
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE

@router.post("/items/")
@limiter.limit(RATE_LIMIT_WRITE)  # Auto-configured from env
async def create_item(request: Request, db: Session = Depends(get_db)):
    # request.state.request_id available for logging
    pass
```

**Configuration**: Env vars in `.env` (RATE_LIMIT_WRITE, RATE_LIMIT_READ). Default: 10/min write, 60/min read.

### Authentication Modes (AUTH_MODE)

```python
# ❌ WRONG - Bypasses AUTH_MODE
@router.get("/admin/users")
async def list_users(current_admin = Depends(require_role("admin"))):
    pass

# ✅ CORRECT - Respects AUTH_MODE
@router.get("/admin/users")
async def list_users(current_admin = Depends(optional_require_role("admin"))):
    pass
```

**Modes**:
- `disabled`: No auth required (emergency access)
- `permissive`: Auth optional (recommended for production)
- `strict`: Full auth required (maximum security)

### Bilingual i18n (MANDATORY)

```tsx
// ❌ WRONG
<button>Save</button>

// ✅ CORRECT
import { useTranslation } from ''react-i18next'';
const { t } = useTranslation();
<button>{t(''common.save'')}</button>
```

**Translation structure**:
- `frontend/src/translations.ts` (imports locale modules)
- `frontend/src/locales/en/*.ts` (English: common, auth, students, courses, etc.)
- `frontend/src/locales/el/*.ts` (Greek: parallel structure)

**Key insight**: Translation integrity tests will fail if EN/EL don''t match. Always add both.

### Alembic Migrations (Auto-Run)

```bash
cd backend
alembic revision --autogenerate -m "Add phone field"
alembic upgrade head  # Runs automatically on startup (see lifespan.py)
```

**Version mismatch between Docker/Native?** Run `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate`

**Key insight**: Migrations run automatically on FastAPI startup via `lifespan.py` - don''t run manually unless debugging.

---

## 📦 Key File Locations (Save You Time)

```
backend/
├── app_factory.py              # FastAPI creation (not main.py)
├── lifespan.py                 # Startup/shutdown (migrations here)
├── models.py                   # DB models (with SoftDeleteMixin)
├── routers/routers_*.py        # API endpoints (15 routers)
├── schemas/*.py                # Pydantic models (exported via __init__.py)
├── tests/conftest.py           # Test guards & fixtures
├── rate_limiting.py            # Rate limit config
└── environment.py              # Runtime context detection

frontend/src/
├── App.tsx                     # Main layout (navigation, auth, error boundaries)
├── translations.ts             # i18n setup
├── locales/{en,el}/*.ts        # Translation modules
├── api/api.js                  # Axios client (VITE_API_URL, auth interceptor)
└── features/                   # Feature modules

scripts/
├── RUN_TESTS_BATCH.ps1         # Batch test runner (REQUIRED)
├── COMMIT_READY.ps1            # Pre-commit validation
├── DOCKER.ps1                  # Docker operations
└── NATIVE.ps1                  # Native development
```

---

## 🐛 Troubleshooting Quick Reference

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Direct pytest execution is disabled" | Running `pytest` without batch runner | Use `.\RUN_TESTS_BATCH.ps1` |
| Port 8000/5173 already in use | Native mode processes not stopped | `.\NATIVE.ps1 -Stop` or `netstat -ano \| findstr ":8000"` |
| Schema mismatch after pull | Docker volume DB version != code version | `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate` |
| Frontend build fails in Docker | Missing `VITE_API_URL` env var | Check `.env` has `VITE_API_URL=/api/v1` |
| Tests fail with "deleted" records | Forgot soft-delete auto-filter | Check if `deleted_at IS NOT NULL` - should be automatic |

---

## 📚 Reference Documentation

- **Architecture deep-dive**: `docs/development/ARCHITECTURE.md`
- **Git workflow & commit standards**: `docs/development/GIT_WORKFLOW.md`
- **Localization setup**: `docs/user/LOCALIZATION.md`
- **Docker operations**: `docs/deployment/DOCKER_OPERATIONS.md`
- **Master index**: `../docs/DOCUMENTATION_INDEX.md`

---

## 🔐 RBAC & Permissions (v1.15.1+ Critical)

### Permission Decorator Pattern (NEW)

```python
from backend.rbac import require_permission

@router.post("/students/")
@require_permission("students:create")
async def create_student(request: Request, student: StudentCreate, db: Session = Depends(get_db)):
    # Permission checked automatically before endpoint execution
    pass
```

**Permission Format**: `resource:action` (e.g., `students:view`, `grades:edit`, `*:*` for admin)

**Key Functions**:
- `@require_permission(perm)` - Decorator for endpoint protection
- `has_permission(user, perm, db)` - Manual permission check
- `allow_self_access=True` - Allows students to access their own data

**Default Permissions by Role**:
- **admin**: `*:*` (all permissions)
- **teacher**: students, courses, grades, attendance (view/edit)
- **student**: Own data only (students.self:read, grades.self:read)
- **viewer**: Read-only access

### Authentication Context (AUTH_MODE Modes)

```python
# Get current user with role/permissions (use in endpoints)
from backend.security.current_user import get_current_user

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    # current_user has: id, email, role, full_name, is_active
    pass
```

**AUTH_MODE behavior**:
- `disabled` (emergency): All endpoints accessible without auth
- `permissive` (production default): Auth optional, permissions enforced when authenticated
- `strict` (maximum security): All endpoints require authentication

---

## 📊 Response Standardization (v1.15.0+)

### API Response Wrapper

All endpoints use standardized `APIResponse` wrapper:

```python
from backend.schemas.response import APIResponse, success_response, error_response

@router.get("/students/{id}", response_model=APIResponse[StudentResponse])
async def get_student(id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return success_response(student)
```

**Response Format**:
```json
{
  "success": true,
  "data": {...},
  "error": null,
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-10T12:00:00Z",
    "version": "1.15.1"
  }
}
```

**Error Format**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Student with id 999 not found",
    "details": null
  },
  "meta": {...}
}
```

### Frontend API Client (Wrapper Aware)

```javascript
// frontend/src/api/api.js automatically unwraps APIResponse
import { apiClient, unwrapResponse } from '@/api/api';

// Automatically extracts .data field from APIResponse wrapper
const students = await apiClient.get('/students/');
// students = [{id: 1, name: "..."}, ...] (NOT wrapped)
```

---

## 🧪 Testing Patterns

### Backend Test Structure

```python
# backend/tests/test_*.py
def test_create_student(client, clean_db, admin_headers):
    # client = TestClient (from conftest.py)
    # clean_db = Fresh DB fixture (auto-reset)
    # admin_headers = Auth headers fixture

    response = client.post("/api/v1/students/", json={...}, headers=admin_headers)
    assert response.status_code == 201

    # Extract data from APIResponse wrapper (v1.15.0+)
    data = response.json()
    assert data["success"] is True
    student = data["data"]
    assert student["first_name"] == "John"
```

**Key Test Fixtures** (`backend/tests/conftest.py`):
- `client` - FastAPI TestClient with auto-configured TestingSessionLocal
- `clean_db` - Resets database schema before each test
- `admin_headers` - Authentication headers for admin user
- `admin_user` - Pre-created admin user object
- Environment auto-configured: `CSRF_ENABLED=0`, `DISABLE_STARTUP_TASKS=1`, rate limiting disabled

### Frontend Test Structure

```tsx
// frontend/src/**/__tests__/*.test.{ts,tsx}
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('renders student list', async () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <StudentList />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Student Name')).toBeInTheDocument();
  });
});
```

**Test Command**: `npm --prefix frontend run test` (auto-sets `SMS_ALLOW_DIRECT_VITEST=1`)

---

## 🔄 CI/CD Patterns

### GitHub Actions Versions (Standard)

- **Python**: 3.11 (`.github/workflows/*.yml`)
- **Node**: 20 (frontend builds)
- **Actions**: `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4`

### Workflow Triggers

```yaml
# Standard pattern for all workflows
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### Required CI Checks (v1.15.1)

1. **Backend Tests** - `RUN_TESTS_BATCH.ps1` (370 tests)
2. **Frontend Tests** - Vitest (1249 tests)
3. **E2E Tests** - Playwright (19 critical tests)
4. **Linting** - Ruff (backend), ESLint (frontend)
5. **Type Checking** - MyPy (backend), TSC (frontend)
6. **Security Scans** - Bandit, npm audit, Docker scan
7. **Coverage** - Backend ≥75%, Frontend ≥70% (via artifacts + summaries; Codecov disabled Jan 10, 2026)

---

## 🐞 Common Gotchas & Solutions

### 1. "Permission denied" on New Endpoints

**Symptom**: 403 Forbidden on newly created admin endpoints

**Cause**: Using `require_role()` instead of `optional_require_role()` - doesn't respect AUTH_MODE

**Solution**:
```python
# ❌ WRONG
@router.get("/admin/settings")
async def get_settings(admin = Depends(require_role("admin"))):

# ✅ CORRECT
@router.get("/admin/settings")
async def get_settings(admin = Depends(optional_require_role("admin"))):
```

### 2. Frontend APIResponse Extraction Errors

**Symptom**: `Cannot read property 'name' of undefined` after API call

**Cause**: Accessing wrapped response directly instead of using .data

**Solution**:
```javascript
// ❌ WRONG - response is APIResponse wrapper
const student = response.data;
console.log(student.name); // Error: student is {success: true, data: {...}}

// ✅ CORRECT - unwrap using utility
import { unwrapResponse } from '@/api/api';
const student = unwrapResponse(response);
console.log(student.name); // Works!

// OR use apiClient which auto-unwraps
const student = await apiClient.get('/students/1');
console.log(student.name); // Auto-unwrapped!
```

### 3. Docker Volume DB Version Mismatch

**Symptom**: "Table X has no column Y" after git pull

**Cause**: Docker volume DB schema != code migrations

**Solution**:
```powershell
.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate  # Auto-detects and fixes
```

### 4. Rate Limiting in Tests

**Symptom**: Tests fail with 429 Too Many Requests

**Cause**: Rate limiting not auto-disabled

**Solution**: Should auto-disable in tests, but if fails:
```python
# backend/tests/conftest.py should have:
from backend.rate_limiting import limiter
limiter.enabled = False  # Already configured
```

---

## 📁 Schema Export Pattern (Clean Imports)

All schemas exported via `__init__.py` for clean imports:

```python
# ❌ AVOID
from backend.schemas.students import StudentCreate, StudentUpdate, StudentResponse

# ✅ PREFER (cleaner)
from backend.schemas import StudentCreate, StudentUpdate, StudentResponse
```

**How it works**: `backend/schemas/__init__.py` exports all schemas:
```python
from .students import StudentCreate, StudentUpdate, StudentResponse
from .courses import CourseCreate, CourseUpdate, CourseResponse
# ... etc
```

---

## 🎯 Quick Command Reference

```powershell
# Development
.\NATIVE.ps1 -Start              # Backend (8000) + Frontend (5173)
.\DOCKER.ps1 -Start              # Production mode (8080)

# Testing
.\RUN_TESTS_BATCH.ps1            # Backend tests (REQUIRED)
npm --prefix frontend run test   # Frontend tests (auto-flag set)
.\RUN_E2E_TESTS.ps1              # E2E tests (Playwright)

# Quality Gates
.\COMMIT_READY.ps1 -Quick        # Pre-commit (2-3 min)
.\COMMIT_READY.ps1 -Standard     # Standard check (5-8 min)
.\COMMIT_READY.ps1 -Full         # Full validation (15-20 min)

# Database
cd backend
alembic revision --autogenerate -m "msg"  # Create migration
alembic upgrade head                      # Apply migrations
alembic current                           # Check version

# Docker
.\DOCKER.ps1 -Update             # Fast update (cached build + backup)
.\DOCKER.ps1 -UpdateClean        # Clean rebuild (no-cache + backup)
.\DOCKER.ps1 -Prune              # Safe cleanup
.\DOCKER.ps1 -Status             # Check status
```

---

**Last Updated**: January 14, 2026 | **Maintained By**: Solo Developer + AI Agent
