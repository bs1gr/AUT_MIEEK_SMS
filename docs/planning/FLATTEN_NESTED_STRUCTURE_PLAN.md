# Flatten Double-Nested Structure Plan

**Date:** 2026-06-12  
**Objective:** Remove redundant `backend/backend` and `frontend/frontend` nesting  
**Scope:** Directory reorganization + path updates  
**Effort:** 2-3 hours  
**Risk Level:** 🟡 MEDIUM (affects imports, paths, configs)  

---

## Executive Summary

The codebase has accidental double nesting: `src/backend/backend/` and `src/frontend/frontend/`. This was perpetuated from the original structure during the June 12 reorganization. This plan flattens it to modern Python/Node best practices.

### Current Structure (❌ Not Ideal)
```
src/
├── backend/
│   └── backend/              ← Redundant nesting
│       ├── routers/
│       ├── services/
│       ├── routers_analytics.py
│       └── [core files]
├── frontend/
│   └── frontend/             ← Redundant nesting
│       ├── src/
│       ├── package.json
│       └── [React app]
```

### Target Structure (✅ Best Practice)
```
src/
├── backend/                  ← Single level
│   ├── routers/
│   ├── services/
│   ├── routers_analytics.py
│   └── [core files]
├── frontend/                 ← Single level
│   ├── src/
│   ├── package.json
│   └── [React app]
```

---

## Phase 1: Preparation & Validation

### 1.1 Create Feature Branch
```bash
git checkout -b fix/flatten-nested-structure
```

### 1.2 Document Current Paths
Key paths that will change:
- Python imports: `from backend.routers import ...` (stays same, but source changes)
- Relative paths in workflows: `src/backend/backend/` → `src/backend/`
- Frontend paths: `src/frontend/frontend/` → `src/frontend/`
- Package.json paths: `../../../tools/` references

### 1.3 Identify All References
Search for these patterns:
- `src/backend/backend/` - 26 workflow/config references
- `src/frontend/frontend/` - 14 workflow/config references
- `src/backend/backend` (without trailing slash) - imports in test files
- Relative paths in `package.json`, `.cjs` files

### 1.4 Create Rollback Point
Tag current main:
```bash
git tag backup-double-nested-structure
```

---

## Phase 2: Backend Directory Flattening

### 2.1 Move Backend Files
```bash
# From project root

# Step 1: Copy all files from nested directory
$source = "src/backend/backend"
$target = "src/backend"

# Step 2: Move each subdirectory and file
Move-Item "$source/*" -Destination "$target" -Force

# Step 3: Remove empty nested directory
Remove-Item "$source" -Force

# Step 4: Verify
Get-ChildItem src/backend | Select-Object Name
```

**What gets moved:**
- `src/backend/backend/routers/` → `src/backend/routers/`
- `src/backend/backend/services/` → `src/backend/services/`
- `src/backend/backend/db/` → `src/backend/db/`
- `src/backend/backend/tests/` → `src/backend/tests/`
- `src/backend/backend/*.py` → `src/backend/*.py`
- All other subdirectories and files

**Files staying in place:**
- `src/backend/pyproject.toml` (already at root of backend)
- `src/backend/.env.example`
- `src/backend/README.md`
- `src/backend/alembic.ini`

### 2.2 Update Python Import Paths
**No changes needed** - imports already use `from backend.routers import ...` and Python's import resolution will find it at the new location.

**Verify with:**
```bash
python -m py_compile src/backend/*.py
```

### 2.3 Update Workflow Paths
**File:** `.github/workflows/ci-cd-pipeline.yml`
```yaml
# BEFORE
- run: cd src/backend/backend && python -m pytest tests

# AFTER
- run: cd src/backend && python -m pytest tests
```

Find and replace all instances:
- `src/backend/backend/` → `src/backend/`
- `src/backend/backend` → `src/backend`

**Affected files:**
- `.github/workflows/ci-cd-pipeline.yml`
- `.github/workflows/e2e-tests.yml`
- `.github/workflows/docker-publish.yml`
- `.github/workflows/commit-ready-smoke.yml`
- `infra/scripts/` (any scripts referencing backend paths)
- `pyproject.toml` (if it has test paths)

### 2.4 Update PYTHONPATH References
Search for:
- `PYTHONPATH=src/backend/backend` → `PYTHONPATH=src/backend`
- `cd src/backend/backend` → `cd src/backend`

---

## Phase 3: Frontend Directory Flattening

### 3.1 Move Frontend Files
```bash
# From project root

# Step 1: Copy all files from nested directory
$source = "src/frontend/frontend"
$target = "src/frontend"

# Step 2: Move each subdirectory and file
Move-Item "$source/*" -Destination "$target" -Force

# Step 3: Remove empty nested directory
Remove-Item "$source" -Force

# Step 4: Verify
Get-ChildItem src/frontend | Select-Object Name
```

**What gets moved:**
- `src/frontend/frontend/src/` → `src/frontend/src/`
- `src/frontend/frontend/public/` → `src/frontend/public/`
- `src/frontend/frontend/package.json` → `src/frontend/package.json`
- `src/frontend/frontend/tsconfig.json` → `src/frontend/tsconfig.json`
- All `.ts`, `.tsx`, `.cjs` files and configuration files

### 3.2 Update Frontend Relative Paths

**File:** `src/frontend/package.json`
Current paths need updating since the file moves up one level:

```json
// BEFORE
"pretest": "node ../../../tools/enforce-vitest-policy.cjs",
"generate-icons": "node ../scripts/generate-pwa-icons.js"

// AFTER
"pretest": "node ../../tools/enforce-vitest-policy.cjs",
"generate-icons": "node ../scripts/generate-pwa-icons.js"
```

**Files to update:**
- `src/frontend/package.json` - 2 script path references
- `src/frontend/sync-version.cjs` - if it has relative paths
- `src/frontend/vite.config.ts` - if it references shared paths
- `src/frontend/playwright.config.ts` - if it references other paths

### 3.3 Update Workflow Paths
**File:** `.github/workflows/ci-cd-pipeline.yml` (frontend section)
```yaml
# BEFORE
- run: cd src/frontend/frontend && npm ci

# AFTER
- run: cd src/frontend && npm ci
```

Find and replace:
- `src/frontend/frontend/` → `src/frontend/`
- `src/frontend/frontend` → `src/frontend`

**Affected files:**
- `.github/workflows/ci-cd-pipeline.yml` (frontend test section)
- `.github/workflows/docker-publish.yml`
- `.github/workflows/commit-ready-smoke.yml`
- Any scripts referencing frontend paths

### 3.4 Update .claude/settings.json Hooks
Update all PowerShell hooks that reference frontend paths:

```json
// BEFORE
"PowerShell(cd 'd:\\\\SMS\\\\student-management-system\\\\src\\\\frontend\\\\frontend'; ...)"

// AFTER
"PowerShell(cd 'd:\\\\SMS\\\\student-management-system\\\\src\\\\frontend'; ...)"
```

---

## Phase 4: Configuration & Documentation Updates

### 4.1 Update pyproject.toml
If paths are hard-coded:
```toml
# BEFORE
testpaths = ["src/backend/backend/tests"]
exclude = ["src/backend/backend/.venv"]

# AFTER
testpaths = ["src/backend/tests"]
exclude = ["src/backend/.venv"]
```

### 4.2 Update Docker Configuration
If any Dockerfile or docker-compose references the paths:
```dockerfile
# BEFORE
WORKDIR /app/src/backend/backend

# AFTER
WORKDIR /app/src/backend
```

### 4.3 Update Internal Documentation
- Update `docs/` files with new paths
- Update README files with build instructions
- Update development guides

### 4.4 Update .gitignore (if needed)
If paths are explicit in .gitignore:
```
# BEFORE
src/backend/backend/.venv/
src/backend/backend/.pytest_cache/

# AFTER
src/backend/.venv/
src/backend/.pytest_cache/
```

---

## Phase 5: Testing & Validation

### 5.1 Verify Directory Structure
```bash
# Check backend structure
Get-ChildItem d:\SMS\student-management-system\src\backend -Directory | Select-Object Name

# Check frontend structure
Get-ChildItem d:\SMS\student-management-system\src\frontend -Directory | Select-Object Name
```

**Expected backend subdirectories:**
- `alembic/`, `backups/`, `data/`, `db/`, `exports/`, `fonts/`, `logs/`, `middleware/`, `migrations/`, `ops/`, `reports/`, `restore/`, `routers/`, `schemas/`, `scripts/`, `security/`, `services/`, `tests/`

**Expected frontend subdirectories:**
- `src/`, `public/`, `node_modules/`, `.venv/` (if local deps)

### 5.2 Test Python Imports
```bash
cd d:\SMS\student-management-system
python -m py_compile src/backend/__init__.py
python -m py_compile src/backend/app_factory.py
python -m py_compile src/backend/routers/__init__.py
```

### 5.3 Test Frontend Build
```bash
cd d:\SMS\student-management-system\src\frontend
npm ci
npm run build
```

### 5.4 Run Tests
```bash
cd d:\SMS\student-management-system
# Backend tests
python -m pytest src/backend/tests -v --tb=short

# Frontend tests
cd src/frontend
$env:SMS_ALLOW_DIRECT_VITEST='1'
npm test
```

### 5.5 Validate Workflows
```bash
# Check YAML syntax
Get-ChildItem .github/workflows -Filter "*.yml" | ForEach-Object {
    Write-Host "Checking $_"
    # Validate with yamllint or similar
}
```

---

## Phase 6: Commit & Push

### 6.1 Stage Changes
```bash
git add -A
git status  # Verify changes look correct
```

### 6.2 Commit
```bash
git commit -m "fix: flatten double-nested backend/backend and frontend/frontend structure

- Move src/backend/backend/* → src/backend/*
- Move src/frontend/frontend/* → src/frontend/*
- Update 26 workflow path references
- Update package.json relative paths
- Update .claude/settings.json hooks
- Removes confusing nesting, improves developer experience

Closes #XXX"
```

### 6.3 Push Feature Branch
```bash
git push -u origin fix/flatten-nested-structure
```

### 6.4 Create Pull Request
```bash
gh pr create --title "fix: flatten nested backend/backend and frontend/frontend structure" \
  --body "## Summary
- Removes redundant double nesting from reorganization
- Aligns with Python/Node best practices
- Updates all paths and imports

## Testing
- [x] Backend tests pass
- [x] Frontend tests pass  
- [x] Python imports work
- [x] Workflows validate
- [x] Build succeeds"
```

---

## Phase 7: Merge & Validation

### 7.1 Wait for CI/CD
Monitor the pull request CI/CD pipeline to ensure:
- All workflows pass
- Tests execute successfully
- No path-not-found errors

### 7.2 Code Review
Get approval from team members

### 7.3 Merge to Main
```bash
gh pr merge --squash
```

### 7.4 Post-Merge Validation
```bash
git checkout main
git pull origin main

# Verify structure
Get-ChildItem src/backend | Where-Object Name -eq "routers"
Get-ChildItem src/frontend | Where-Object Name -eq "src"

# Run tests
python -m pytest src/backend/tests -v --tb=short
cd src/frontend && npm test
```

---

## Rollback Plan

If something goes wrong:

```bash
# Option 1: Reset to backup tag
git reset --hard backup-double-nested-structure
git push -f origin main

# Option 2: Revert the commit
git revert <commit-hash>
git push origin main
```

---

## Files That Will Change

### Directories Moved
- ✅ `src/backend/backend/` (entire directory)
- ✅ `src/frontend/frontend/` (entire directory)

### Configuration Files Updated
- ✅ `.github/workflows/ci-cd-pipeline.yml`
- ✅ `.github/workflows/e2e-tests.yml`
- ✅ `.github/workflows/docker-publish.yml`
- ✅ `.github/workflows/commit-ready-smoke.yml`
- ✅ `src/frontend/package.json`
- ✅ `.claude/settings.json`
- ✅ `pyproject.toml` (if paths are hard-coded)
- ⚠️ Docker files (if any)
- ⚠️ Internal documentation

### No Changes Needed
- ❌ Python import statements (stays as `from backend.routers import ...`)
- ❌ Source code logic
- ❌ Database schemas
- ❌ API endpoints

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Backend structure flattened | ⬜ TODO |
| Frontend structure flattened | ⬜ TODO |
| All paths updated in workflows | ⬜ TODO |
| Package.json paths corrected | ⬜ TODO |
| Backend tests pass (882+) | ⬜ TODO |
| Frontend tests pass (1939) | ⬜ TODO |
| Python imports work | ⬜ TODO |
| No "file not found" errors in CI/CD | ⬜ TODO |
| PR reviewed and approved | ⬜ TODO |
| Merged to main | ⬜ TODO |
| Post-merge CI/CD passes | ⬜ TODO |

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Preparation | 15 min | ⬜ TODO |
| Phase 2: Backend Flattening | 30 min | ⬜ TODO |
| Phase 3: Frontend Flattening | 30 min | ⬜ TODO |
| Phase 4: Configuration Updates | 20 min | ⬜ TODO |
| Phase 5: Testing & Validation | 30 min | ⬜ TODO |
| Phase 6: Commit & Push | 10 min | ⬜ TODO |
| Phase 7: Merge & Validation | 15 min | ⬜ TODO |
| **Total** | **2.5 hours** | ⬜ TODO |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Path updates missed | Medium | High | Systematic find-replace + verification script |
| Import failures | Low | High | Test Python compilation + run import checks |
| Workflow failures | Medium | High | Validate YAML syntax + test on branch first |
| Relative path breaks | Medium | Medium | Update package.json carefully + test build |
| Data loss | Very Low | Critical | Git tag backup before starting |

---

## Notes for Implementation

1. **Use PowerShell for directory operations** - Move-Item is more reliable than manual copy/delete
2. **Verify empty directories removed** - Ensure no orphaned nested folders remain
3. **Test imports before committing** - Python needs to find the modules at new location
4. **Update workflows carefully** - Many paths have `src/backend/backend` which are easy to miss
5. **Document the change** - Update CONTRIBUTING.md with new structure
6. **Communicate to team** - Let other developers know about the structure change

---

## References

- Original double-nesting issue: Found during code review 2026-06-12
- Python best practices: PEP 420, modern package structure
- This plan: `docs/planning/FLATTEN_NESTED_STRUCTURE_PLAN.md`

---

**Plan Created:** 2026-06-12  
**Status:** 🟡 Ready to execute  
**Owner:** Claude Code  
**Next Step:** Phase 1 - Create feature branch
