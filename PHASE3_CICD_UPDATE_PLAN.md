# Phase 3: CI/CD Workflow Updates - Execution Plan
**Date**: 2026-06-12/06-13  
**Status**: 🟡 READY FOR EXECUTION  
**Phase**: CI/CD Workflow Updates (Weeks 3-4)

---

## Executive Summary

Phase 3 will update all CI/CD workflows and configuration to work with the new directory structure created in Phase 2. This includes:

1. **GitHub Workflows** - Update 38 workflow files with new paths
2. **Docker Configuration** - Update docker-compose and Dockerfile paths
3. **Script References** - Update internal script path references
4. **Configuration Files** - Update .env path references in workflows

**Estimated Duration**: 4-6 hours  
**Risk Level**: 🟡 MODERATE (changes to CI/CD, but isolated to feature branch)  
**Validation Strategy**: Test each workflow update before moving to next

---

## Phase 3 Sub-Tasks

### 3.1: Audit Current Workflow References
**Time**: 30 minutes  
**Risk**: 🟢 LOW (read-only)

First, scan all workflows to identify what needs to be updated:

```powershell
# Find all references to old paths
$patterns = @(
    'working-directory:\s+(backend|frontend|docker|deploy|installer)'
    'path:\s+(backend|frontend|docker|deploy|installer)'
    '\.env'
    'backend/'
    'frontend/'
)

Get-ChildItem '.github/workflows/*.yml' | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            Write-Host "Found in $($_.Name): $pattern"
        }
    }
}
```

**Expected Output**: List of all workflows needing updates

### 3.2: Update Docker-Related Workflows
**Time**: 45 minutes  
**Risk**: 🟡 MODERATE (affects build process)

Workflows affected:
- `.github/workflows/docker-build.yml` (if exists)
- `.github/workflows/native-setup-smoke.yml`
- Any workflow building Docker images

**Changes needed**:
```yaml
# BEFORE
- name: Build Docker Image
  working-directory: docker
  
# AFTER
- name: Build Docker Image
  working-directory: infra/docker
```

### 3.3: Update Test/Backend Workflows
**Time**: 1 hour  
**Risk**: 🟡 MODERATE (critical for CI/CD)

Workflows affected:
- `.github/workflows/ci-cd-pipeline.yml` (main)
- `.github/workflows/codeql.yml`
- All test-related workflows

**Changes needed**:
```yaml
# BEFORE
- name: Run Backend Tests
  working-directory: backend
  run: python -m pytest

# AFTER
- name: Run Backend Tests
  working-directory: src/backend
  run: python -m pytest
```

### 3.4: Update Frontend Build Workflows
**Time**: 45 minutes  
**Risk**: 🟡 MODERATE (affects frontend builds)

Workflows affected:
- Any React/TypeScript build workflows
- Frontend test workflows
- Frontend linting workflows

**Changes needed**:
```yaml
# BEFORE
- name: Build Frontend
  working-directory: frontend
  run: npm run build

# AFTER
- name: Build Frontend
  working-directory: src/frontend
  run: npm run build
```

### 3.5: Update Configuration File References
**Time**: 30 minutes  
**Risk**: 🟢 LOW (config files)

Workflows affected:
- Pre-commit workflows
- Code quality workflows
- Any workflow referencing config files

**Changes needed**:
```yaml
# BEFORE
- name: Run Lint
  run: ruff check .

# AFTER (if needed)
- name: Run Lint
  run: ruff check . --config config/.gitleaks.toml
```

### 3.6: Update Installer/Release Workflows
**Time**: 1 hour  
**Risk**: 🟡 MODERATE (release process)

Workflows affected:
- Release workflows
- Installer build workflows
- Asset management workflows

**Changes needed**:
```yaml
# BEFORE
- name: Build Installer
  working-directory: installer
  
# AFTER
- name: Build Installer
  working-directory: infra/installer
```

### 3.7: Update Script References
**Time**: 1 hour  
**Risk**: 🟡 MODERATE (script execution)

Workflows affected:
- Any workflow calling root-level scripts
- Integration test workflows
- Deployment scripts

**Changes needed**:
```yaml
# BEFORE
- name: Run Tests
  run: ./RUN_E2E_TESTS.ps1

# AFTER
- name: Run Tests
  run: ./infra/scripts/testing/RUN_E2E_TESTS.ps1
```

### 3.8: Update .env File References
**Time**: 30 minutes  
**Risk**: 🟢 LOW (environment setup)

Workflows affected:
- All workflows using .env files
- Setup workflows
- Integration test workflows

**Changes needed**:
```yaml
# BEFORE
env:
  ENV_FILE: .env

# AFTER
env:
  ENV_FILE: config/.env
```

### 3.9: Test & Validate Each Update
**Time**: 1-2 hours  
**Risk**: 🟡 MODERATE (validation critical)

For each workflow updated:
1. Verify syntax with `yamllint`
2. Test on feature branch with dummy push
3. Check workflow logs for path errors
4. Validate workflow completes successfully

### 3.10: Commit Phase 3 Work
**Time**: 15 minutes  
**Risk**: 🟢 LOW (cleanup commit)

Create commit with all workflow updates.

---

## Detailed Workflow Categories

### Category 1: Build Workflows (5-7 files)
Files typically at `.github/workflows/` named:
- `ci-cd-pipeline.yml`
- `docker*.yml`
- `build*.yml`
- `native-*.yml`

**Update Pattern**:
```
backend/ → src/backend/
frontend/ → src/frontend/
docker/ → infra/docker/
installer/ → infra/installer/
```

### Category 2: Test Workflows (5-8 files)
Files like:
- `test*.yml`
- `codeql.yml`
- `e2e*.yml`
- `load*.yml`

**Update Pattern**:
```
working-directory: backend → working-directory: src/backend
working-directory: frontend → working-directory: src/frontend
```

### Category 3: Release Workflows (3-5 files)
Files like:
- `release*.yml`
- `installer*.yml`
- `deploy*.yml`

**Update Pattern**:
```
installer/ → infra/installer/
deploy/ → infra/deployment/
./RELEASE_HELPER.ps1 → ./infra/scripts/release/RELEASE_HELPER.ps1
```

### Category 4: Maintenance Workflows (4-6 files)
Files like:
- `cleanup*.yml`
- `maintenance*.yml`
- `stale.yml`

**Update Pattern**:
```
./ → ./
(mostly not affected)
```

### Category 5: Security Workflows (4-5 files)
Files like:
- `codeql.yml`
- `trivy*.yml`
- `dependency*.yml`

**Update Pattern**:
```
backend/ → src/backend/
frontend/ → src/frontend/
```

---

## Safe Update Strategy

### Step 1: List All Workflows
```powershell
$workflows = Get-ChildItem '.github/workflows/*.yml'
Write-Host "Found $($workflows.Count) workflows to review"
foreach ($wf in $workflows) {
    Write-Host "  - $($wf.Name)"
}
```

### Step 2: Create Update Mapping
For each workflow, document:
- [ ] Workflow name
- [ ] Current paths used
- [ ] New paths needed
- [ ] Priority (critical/high/medium/low)

### Step 3: Update by Priority
**Priority 1 (CRITICAL)**: 
- `ci-cd-pipeline.yml` (main workflow)
- Docker build workflows
- Release workflows

**Priority 2 (HIGH)**:
- Backend/frontend test workflows
- Security scanning workflows

**Priority 3 (MEDIUM)**:
- Maintenance workflows
- Utility workflows

**Priority 4 (LOW)**:
- Labeler workflows
- PR template workflows

### Step 4: Validate After Each Update
```powershell
# Check YAML syntax
yamllint .github/workflows/[updated-file].yml

# Manually review
code .github/workflows/[updated-file].yml
```

### Step 5: Test on Branch
1. Push feature branch to trigger workflows
2. Monitor workflow logs for path errors
3. Fix any issues immediately
4. Verify workflow completes successfully

---

## Expected Changes Per Workflow Type

### ci-cd-pipeline.yml (30-50 lines to update)
```yaml
# Main workflow - affects: build, test, deploy
- Change: backend/ → src/backend/
- Change: frontend/ → src/frontend/
- Change: docker/ → infra/docker/
- Change: .env → config/.env
```

### Docker Workflows (10-20 lines)
```yaml
# Affects: build, push
- Change: docker/ → infra/docker/
- Change: Dockerfile paths
```

### Release Workflows (20-40 lines)
```yaml
# Affects: installer, assets
- Change: installer/ → infra/installer/
- Change: Script paths: ./RELEASE_HELPER.ps1 → ./infra/scripts/release/RELEASE_HELPER.ps1
```

### Test Workflows (10-30 lines)
```yaml
# Affects: unit, e2e, load tests
- Change: backend/ → src/backend/
- Change: frontend/ → src/frontend/
- Change: Script paths
```

---

## Testing Checklist

After updating each workflow:

- [ ] YAML syntax is valid
- [ ] All paths point to correct directories
- [ ] Script references are correct
- [ ] Environment variables are correct
- [ ] Workflow triggered successfully on branch
- [ ] No "file not found" errors in logs
- [ ] Build/test commands execute in correct directories
- [ ] Artifacts are generated correctly

---

## Rollback Plan

If a workflow update breaks CI/CD:

```powershell
# Revert to previous version
git diff HEAD~1 .github/workflows/[problematic-file].yml

# Or revert entire Phase 3
git reset --hard HEAD~1
```

---

## Success Criteria for Phase 3

✅ All workflow files reviewed  
✅ All path references updated  
✅ All script references updated  
✅ All workflows pass syntax check  
✅ All workflows execute successfully on branch  
✅ No "file not found" errors  
✅ Build/test results correct  
✅ Ready to merge to main  

---

## Next Steps

1. **Execute Phase 3 updates** (this session or next)
2. **Test each workflow** as updated
3. **Monitor CI/CD** for any failures
4. **Document any issues** for Phase 4
5. **Prepare for Phase 4** (integration testing)
6. **Plan Phase 5** (merge to main)

---

**Estimated Total Time**: 4-6 hours  
**Risk Level**: 🟡 MODERATE (well-mitigated)  
**Status**: ✅ READY FOR EXECUTION
