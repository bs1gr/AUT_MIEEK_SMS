# CLAUDE.md — Student Management System

**Version**: v1.18.27 (always verify from `VERSION` file)
**Date**: June 2026
**Project**: Bilingual (EN/EL) student management system for ΜΙΕΕΚ Cyprus technical college
**Mode**: Solo developer + AI assistant (no external stakeholders — owner decides all)

---

## Architecture

```
src/
  backend/          # FastAPI (Python 3.13), Alembic migrations, SQLAlchemy ORM
  frontend/         # React + Vite + TypeScript, react-i18next (bilingual EN/EL)
infra/
  installer/        # Inno Setup + PowerShell build scripts (SMS_Installer_*.exe)
  docker/           # Docker Compose production stack
  scripts/
    dev/            # NATIVE.ps1, DOCKER.ps1
    ops/            # COMMIT_READY.ps1
    testing/        # RUN_TESTS_BATCH.ps1
    release/        # RELEASE_READY.ps1, INSTALLER_BUILDER.ps1
docs/
  plans/            # UNIFIED_WORK_PLAN.md (active planning source of truth)
  deployment/       # Runbooks and guides
  user/             # End-user guides
  admin/            # RBAC and admin guides
  reference/        # Quick reference sheets
```

### Deployment modes

| Mode | Script | Port | Use for |
|------|--------|------|---------|
| Native | `.\infra\scripts\dev\NATIVE.ps1 -Start` | 8000 + 5173 | Development and testing |
| Docker | `.\infra\scripts\dev\DOCKER.ps1 -Start` | 8080 | Production only |

**These are the only two entry points. Never swap them.**

---

## Session Start Checklist

1. Read `VERSION` — current version is `v1.18.27`
2. Run `git status` — verify no uncommitted changes
3. Read `docs/plans/UNIFIED_WORK_PLAN.md` — active work state
4. Check `docs/DOCUMENTATION_INDEX.md` — navigate to relevant docs

---

## Critical Rules

### Testing — NEVER run pytest directly

Running the full suite directly crashes VS Code (490+ test files overload memory/CPU).

```powershell
# ❌ FORBIDDEN — crashes VS Code
cd src/backend && pytest -q
python -m pytest

# ✅ REQUIRED — batch runner splits into safe chunks
.\infra\scripts\testing\RUN_TESTS_BATCH.ps1
.\infra\scripts\testing\RUN_TESTS_BATCH.ps1 -BatchSize 3
.\infra\scripts\testing\RUN_TESTS_BATCH.ps1 -Verbose
```

Single-file exception: `python -m pytest src/backend/tests/test_file.py -xvs` is fine.

CI is exempt from the batch rule; only local runs require it.
Guard is enforced in `src/backend/tests/conftest.py` (bypass: `SMS_ALLOW_DIRECT_PYTEST=1`).

### Commits — COMMIT_READY before every commit

```powershell
.\infra\scripts\ops\COMMIT_READY.ps1 -Quick      # 2-3 min minimum gate
.\infra\scripts\ops\COMMIT_READY.ps1 -Standard   # 5-8 min
.\infra\scripts\ops\COMMIT_READY.ps1 -Full        # 15-20 min
# With state snapshot:
.\infra\scripts\ops\COMMIT_READY.ps1 -Quick -Snapshot
```

Never use `git commit --no-verify`. Never commit with unverified output.

### Verification — evidence required for every "complete" claim

1. Make the change
2. Run the relevant tests (wait for full completion)
3. Read actual output — not just the exit code
4. Verify runtime behavior for UI or deployment changes
5. Only then claim success

```powershell
# Check test results after RUN_TESTS_BATCH
Get-Content src/backend/test-results/backend_batch_full.txt | Select-String "Batch.*completed|FAILED|ERROR"
```

### Linting — fix before every commit

```powershell
# Python (auto-fix)
python -m ruff check src/backend/ --fix

# TypeScript (auto-fix)
npm --prefix src/frontend run lint -- --fix
```

### Database — Alembic ONLY

```bash
cd src/backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Never call `Base.metadata.create_all()`. Never write raw `ALTER TABLE` or `CREATE TABLE`.

### Frontend — i18n ALWAYS required

```tsx
// ❌ FORBIDDEN — breaks Greek users
<button>Save</button>
<p>Student not found</p>

// ✅ REQUIRED
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
return <button>{t('common.save')}</button>;
```

Add new keys to both `src/frontend/src/i18n/locales/en/` and `el/` translation files.

### Version format — v1.x.x ONLY

```
✅  v1.18.27
❌  v11.18.27   $11.18.27   v2.18.27
```

Violations are blocked by pre-commit hooks, COMMIT_READY, and CI/CD.

### Backend patterns

- Use `@asynccontextmanager` lifespan — NOT `@app.on_event()`
- Use `optional_require_role()` for admin endpoints — NOT `require_role()` (respects AUTH_MODE)

### Documentation — audit before creating

1. Check `docs/DOCUMENTATION_INDEX.md` first
2. Update `docs/plans/UNIFIED_WORK_PLAN.md` for all planning
3. Never create new backlog, status report, session summary, or progress tracker files
4. Let code and commit messages speak — only write docs that don't already exist

### No stakeholders

This is a solo project. Owner decides all. Proceed without approval gates, review cycles, or external dependency.

---

## Release Workflow

Follow this phase order — do not skip steps:

```
Phase 1: Code prep
  git status (must be clean)
  .\infra\scripts\ops\COMMIT_READY.ps1 -Quick
  .\infra\scripts\testing\RUN_TESTS_BATCH.ps1 (all batches pass)

Phase 2: Artifact build + verification
  .\infra\scripts\release\INSTALLER_BUILDER.ps1 -Action build -Version "X.X.X"
  Get-AuthenticodeSignature ... (must be Valid)
  .\infra\scripts\release\INSTALLER_BUILDER.ps1 -Action test -Version "X.X.X"

Phase 3: Docs + publish
  .\infra\scripts\release\GENERATE_RELEASE_DOCS.ps1 -Version "X.X.X"
  git commit + push
  git tag vX.X.X + push (triggers GitHub Actions)
  Wait for Actions to pass
  gh release upload vX.X.X SMS_Installer_X.X.X.exe
```

Primary automated script: `.\infra\scripts\release\RELEASE_READY.ps1 -ReleaseVersion "X.X.X" -TagRelease`

Release assets are installer-only (`SMS_Installer_<version>.exe`). Never upload generic CI artifacts.
Historical release tags are immutable — never re-dispatch old tag workflows.

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `VERSION` | Authoritative current version |
| `docs/plans/UNIFIED_WORK_PLAN.md` | Active work and release state |
| `docs/DOCUMENTATION_INDEX.md` | Documentation navigation |
| `docs/AGENT_POLICY_ENFORCEMENT.md` | Full policy details |
| `docs/AGENT_QUICK_START.md` | Agent onboarding (5 min) |
| `infra/scripts/ops/COMMIT_READY.ps1` | Pre-commit validation gate |
| `infra/scripts/testing/RUN_TESTS_BATCH.ps1` | Safe batch test runner |
| `infra/scripts/dev/NATIVE.ps1` | Start development mode |
| `infra/scripts/dev/DOCKER.ps1` | Start production mode |
| `infra/scripts/release/RELEASE_READY.ps1` | Automated release script |
| `.github/copilot-instructions.md` | Legacy VS Code Copilot guide (pre-flatten paths) |
| `src/backend/tests/conftest.py` | Test batch enforcement |
| `src/backend/lifespan.py` | FastAPI lifespan (use this, not on_event) |
| `src/frontend/src/i18n/locales/` | Translation files (en/ and el/) |
| `ruff.toml` | Python linting config |
