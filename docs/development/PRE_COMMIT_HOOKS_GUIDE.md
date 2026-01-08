# Enhanced Pre-commit Hooks for SMS (v1.15.1+)

**Created**: January 8, 2026
**Status**: ✅ Ready for use
**Reference**: `.pre-commit-config.yaml`

---

## Overview

Three new custom pre-commit hooks have been added to the SMS repository to enhance code quality and deployment readiness validation:

| Hook | Purpose | Trigger | Stage |
|------|---------|---------|-------|
| `validate-rbac-decorators` | Ensure RBAC permissions are properly applied | Modified `backend/routers/*.py` | commit |
| `validate-migrations` | Check database migration consistency | Modified `backend/models.py` or migration files | commit |
| `validate-deployment-readiness` | Verify deployment files and config present | Manual trigger | manual |

---

## Hook Details

### 1. **validate-rbac-decorators**

**Purpose**: Prevent deploying endpoints without proper RBAC permission decorators

**What it checks**:
- All admin endpoints have `@require_permission()` decorator
- POST/PUT/DELETE operations are protected
- Decorator syntax is valid and properly formatted

**Trigger**: Commits modifying `backend/routers/*.py`

**Example output** (errors):
```
❌ ERRORS (must fix):
  Missing @require_permission before @router.post("/students/") (routers_students.py:45)
  Check decorator format: @require_permission('invalid') (routers_courses.py:120)
```

**Fix**: Add missing `@require_permission()` decorator to endpoint

**Stage**: `commit` (runs automatically before commit)

---

### 2. **validate-migrations**

**Purpose**: Ensure database migrations are properly structured and consistent

**What it checks**:
- Migration files follow Alembic naming convention
- Each migration has `revision =` marker
- Both `upgrade()` and `downgrade()` functions present
- No orphaned migration files

**Trigger**: Commits modifying `backend/models.py` or migration files

**Example output** (warnings):
```
⚠️  WARNINGS (informational):
  Note: If you modified models.py, run 'alembic revision --autogenerate'
```

**Fix**: Run migration command if needed:
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

**Stage**: `commit` (runs automatically before commit)

---

### 3. **validate-deployment-readiness**

**Purpose**: Verify all deployment documentation and RBAC configuration files exist

**What it checks**:
- ✅ Deployment guides present (staging, CI/CD monitoring)
- ✅ RBAC configuration complete (decorator module, seeding script, permission matrix)
- ✅ Testing infrastructure in place (E2E, backend tests, load testing)
- ✅ Critical configuration files (Docker compose, environment templates)

**Trigger**: Manual execution

**Example output** (success):
```
✅ PASSED:
  ✅ Staging validation guide
  ✅ CI/CD monitoring guide
  ✅ Deployment readiness summary
  ... (more checks)

✅ All deployment readiness checks passed!
```

**Example output** (missing files):
```
❌ Missing files required for deployment:
  • Staging validation guide (docs/deployment/STAGING_DEPLOYMENT_VALIDATION_JAN8.md)
  • CI/CD monitoring guide (docs/deployment/CI_CD_MONITORING_JAN8.md)
```

**Stage**: `manual` (must be run explicitly)

---

## Usage

### Running Pre-commit Hooks

#### Automatic on Commit (Stages: `commit`)

All hooks with `stages: [commit]` run automatically when you execute:
```bash
git commit -m "your message"
```

#### Manual Deployment Readiness Check

To check deployment readiness before deployment:
```bash
# Run all manual-stage hooks
pre-commit run --hook-stage manual

# Or run just the deployment readiness hook
pre-commit run validate-deployment-readiness --all-files
```

#### Run All Hooks (Including Manual)

```bash
# Run all hooks (all stages)
pre-commit run --all-files --hook-stage manual
```

#### Run Specific Hook

```bash
# Just RBAC validation
pre-commit run validate-rbac-decorators --all-files

# Just migrations validation
pre-commit run validate-migrations --all-files

# Just deployment readiness
pre-commit run validate-deployment-readiness --all-files
```

---

## Configuration

### Hook Configuration (`.pre-commit-config.yaml`)

```yaml
- id: validate-rbac-decorators
  name: "RBAC: Validate decorator usage consistency"
  entry: python scripts/validate_rbac_decorators.py
  language: system
  files: ^backend/routers/.*\.py$    # Only runs on router files
  pass_filenames: false              # Doesn't pass filenames
  stages: [commit]                   # Runs on git commit

- id: validate-migrations
  name: "Database: Validate migration consistency"
  entry: python scripts/validate_migrations.py
  language: system
  files: ^backend/(models\.py|migrations/).*$  # Runs on model/migration changes
  pass_filenames: false
  stages: [commit]

- id: validate-deployment-readiness
  name: "Deployment: Validate readiness checklist"
  entry: python scripts/validate_deployment_readiness.py
  language: system
  pass_filenames: false
  stages: [manual]   # Must be run manually
```

### Customizing Hooks

To modify hook behavior, edit the configuration in `.pre-commit-config.yaml`:

```yaml
# Change files pattern to apply hook to different files
files: ^backend/routers/.*\.py$

# Change stages (when hook runs)
stages: [commit]  # commit, push, or manual

# Modify entry point/script
entry: python scripts/your_script.py
```

---

## Integration with Deployment

### Pre-deployment Workflow

1. **Before committing code**:
   ```bash
   # Automatic checks (RBAC, migrations)
   git add backend/routers/
   git commit -m "feat: Add new endpoint"
   # Hooks validate automatically
   ```

2. **Before deploying to staging**:
   ```bash
   # Manual readiness check
   pre-commit run validate-deployment-readiness --all-files

   # Output should show ✅ All deployment readiness checks passed!
   ```

3. **As part of CI/CD pipeline**:
   ```yaml
   # In GitHub Actions workflow
   - name: Validate Pre-commit Hooks
     run: |
       pre-commit run --all-files --hook-stage manual
   ```

---

## Common Issues & Solutions

### Issue: Hook doesn't run
**Solution**: Check that hook stage matches:
```bash
# If manual hook didn't run:
pre-commit run validate-deployment-readiness --hook-stage manual

# If commit hook didn't run:
git add your_file.py
git commit -m "message"  # Should run automatically
```

### Issue: "Python not found"
**Solution**: Ensure Python is in PATH and pre-commit is installed:
```bash
python --version
pre-commit --version

# Reinstall pre-commit if needed
pip install pre-commit
pre-commit install
```

### Issue: Hook gives false positive
**Solution**: Check error message and fix reported issue, or override:
```bash
# Skip pre-commit checks (not recommended):
git commit --no-verify -m "message"

# But better: Fix the issue and retry
```

---

## Hook Scripts Location

All new hook scripts are located in `scripts/`:
- `validate_rbac_decorators.py` - RBAC decorator validation
- `validate_migrations.py` - Database migration validation
- `validate_deployment_readiness.py` - Deployment readiness checklist

Each script is self-contained and can be run directly:
```bash
python scripts/validate_rbac_decorators.py
python scripts/validate_migrations.py
python scripts/validate_deployment_readiness.py
```

---

## Future Enhancements

Potential additions to pre-commit framework:

1. **E2E Test Validation Hook** - Verify E2E tests pass before commit
2. **Performance Regression Detection** - Check for API latency regressions
3. **API Endpoint Documentation** - Ensure all endpoints are documented
4. **Security Check Hook** - Enhanced secret scanning and vulnerability detection
5. **Code Coverage Hook** - Verify test coverage meets thresholds

---

## Reference

- **Pre-commit Framework**: https://pre-commit.com/
- **Configuration**: `.pre-commit-config.yaml`
- **Hook Scripts**: `scripts/validate_*.py`
- **SMS Deployment Guide**: `docs/deployment/STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md`

---

**Last Updated**: January 8, 2026
**Status**: ✅ Tested and ready for production use
