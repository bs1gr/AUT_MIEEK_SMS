# Path Migration Script & Reference Mapping
**Date**: 2026-06-12  
**Purpose**: Document all path changes needed for Phase 2 execution

---

## File Movement Summary

### Source Code Moves (Largest Impact)
```powershell
# Backend - will be the largest and most critical move
Move-Item -Path "backend" -Destination "src/backend" -Force

# Frontend - second largest
Move-Item -Path "frontend" -Destination "src/frontend" -Force
```

**Impact Analysis:**
- Backend: ~45 MB, contains: models/, routes/, services/, tests/
- Frontend: ~80 MB (with node_modules), contains: src/, public/, tests/

---

## Configuration File Moves

### .env Files
```powershell
Move-Item -Path ".env" -Destination "config/.env" -Force
Move-Item -Path ".env.example" -Destination "config/.env.example" -Force
Move-Item -Path ".env.production" -Destination "config/environments/production.env" -Force
Move-Item -Path ".env.production.example" -Destination "config/environments/production.env.example" -Force
Move-Item -Path ".env.production.SECURE" -Destination "config/environments/production.env.SECURE" -Force
Move-Item -Path ".env.qnap.example" -Destination "config/environments/qnap.env.example" -Force
Move-Item -Path ".env.qnap.postgres-only.example" -Destination "config/environments/qnap-postgres-only.env.example" -Force
```

### Config Files
```powershell
Move-Item -Path "codecov.yml" -Destination "config/codecov.yml" -Force
Move-Item -Path ".coveragerc" -Destination "config/.coveragerc" -Force
Move-Item -Path ".gitleaks.toml" -Destination "config/.gitleaks.toml" -Force
Move-Item -Path ".trivyignore" -Destination "config/.trivyignore" -Force
Move-Item -Path ".pre-commit-config.yaml" -Destination "config/.pre-commit-config.yaml" -Force
Move-Item -Path ".secrets.baseline" -Destination "config/.secrets.baseline" -Force
Move-Item -Path ".markdownlint.json" -Destination "config/.markdownlint.json" -Force
Move-Item -Path ".markdownlintignore" -Destination "config/.markdownlintignore" -Force
```

---

## Infrastructure Moves

### Docker Files
```powershell
Move-Item -Path "docker" -Destination "infra/docker" -Force
Move-Item -Path "Dockerfile" -Destination "infra/docker/Dockerfile" -Force
Move-Item -Path ".dockerignore" -Destination "infra/docker/.dockerignore" -Force
```

### Deployment Related
```powershell
Move-Item -Path "deploy" -Destination "infra/deployment" -Force
Move-Item -Path "installer" -Destination "infra/installer" -Force
Move-Item -Path "SMS_Native_Lite_Edition" -Destination "infra/native-lite" -Force
```

---

## Script Moves (23 files → infra/scripts/)

### Release Scripts
```powershell
Move-Item -Path "RELEASE_HELPER.ps1" -Destination "infra/scripts/release/" -Force
Move-Item -Path "RELEASE_WITH_DOCS.ps1" -Destination "infra/scripts/release/" -Force
Move-Item -Path "RELEASE_READY.ps1" -Destination "infra/scripts/release/" -Force
Move-Item -Path "INSTALLER_BUILDER.ps1" -Destination "infra/scripts/release/" -Force
Move-Item -Path "GENERATE_RELEASE_DOCS.ps1" -Destination "infra/scripts/release/" -Force
```

### Development Scripts
```powershell
Move-Item -Path "NATIVE_TOGGLE.ps1" -Destination "infra/scripts/dev/" -Force
Move-Item -Path "NATIVE.ps1" -Destination "infra/scripts/dev/" -Force
Move-Item -Path "CREATE_NATIVE_SHORTCUT.ps1" -Destination "infra/scripts/dev/" -Force
Move-Item -Path "setup_lite_qnap.ps1" -Destination "infra/scripts/dev/" -Force
Move-Item -Path "setup_lite_qnap_remote.ps1" -Destination "infra/scripts/dev/" -Force
Move-Item -Path "DOCKER.ps1" -Destination "infra/scripts/dev/" -Force
```

### Testing Scripts
```powershell
Move-Item -Path "RUN_E2E_TESTS.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "RUN_FRONTEND_TESTS.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "RUN_TESTS_BATCH.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "RUN_TESTS_CATEGORY.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "RUN_CURATED_LOAD_TEST.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "MONITOR_BATCH_TESTS.ps1" -Destination "infra/scripts/testing/" -Force
Move-Item -Path "test_e2e_fixes.sh" -Destination "infra/scripts/testing/" -Force
```

### Operations Scripts
```powershell
Move-Item -Path "COMMIT_READY.ps1" -Destination "infra/scripts/ops/" -Force
Move-Item -Path "WORKSPACE_CLEANUP.ps1" -Destination "infra/scripts/ops/" -Force
Move-Item -Path "WORKSPACE_RECOVERY.ps1" -Destination "infra/scripts/ops/" -Force
Move-Item -Path "CLEAR_PYCACHE.ps1" -Destination "infra/scripts/ops/" -Force
Move-Item -Path "UNINSTALL_SMS_MANUALLY.ps1" -Destination "infra/scripts/ops/" -Force
```

### Deployment Scripts
```powershell
Move-Item -Path "DEPLOY_PHASE2_NOW.ps1" -Destination "infra/scripts/deploy/" -Force
Move-Item -Path "DEPLOY_PHASE2_NOW.sh" -Destination "infra/scripts/deploy/" -Force
```

### Diagnostics Scripts
```powershell
Move-Item -Path "diagnose_migration.py" -Destination "infra/scripts/diagnostics/" -Force
Move-Item -Path "fix_admin_account.py" -Destination "infra/scripts/diagnostics/" -Force
Move-Item -Path "fix_greek_encoding_permanent.py" -Destination "infra/scripts/diagnostics/" -Force
Move-Item -Path "fix_test_credentials.py" -Destination "infra/scripts/diagnostics/" -Force
```

---

## Documentation Moves

### Status & Planning Docs
```powershell
Move-Item -Path "CI_CD_STAGING_CLEANUP_SUMMARY_2026_06_12.md" -Destination "docs/reports/ci-cd-staging-cleanup-2026-06-12.md" -Force
Move-Item -Path "STAGING_CLEANUP_GUIDE.md" -Destination "docs/guides/staging-cleanup-guide.md" -Force
Move-Item -Path "STAGING_CLEANUP_REPORT_2026_06_12.md" -Destination "docs/reports/staging-cleanup-2026-06-12.md" -Force
Move-Item -Path "STAGING_COMPLETE_CLEANUP_2026_06_12.md" -Destination "docs/reports/staging-complete-cleanup-2026-06-12.md" -Force
Move-Item -Path "CODEBASE_REORGANIZATION_PLAN_2026_06_12.md" -Destination "docs/planning/codebase-reorganization-plan-2026-06-12.md" -Force
Move-Item -Path "PHASE1_MIGRATION_MAPPING.md" -Destination "docs/planning/phase1-migration-mapping.md" -Force
Move-Item -Path "SESSION_COMPLETE_2026_06_12.md" -Destination ".archive/phase-logs/SESSION_COMPLETE_2026_06_12.md" -Force
```

### Log Files & Artifacts
```powershell
Move-Item -Path "rebuild.log" -Destination ".archive/logs/rebuild.log" -Force
Move-Item -Path "pr_output.txt" -Destination ".archive/logs/pr_output.txt" -Force
Move-Item -Path "workflow_logs.txt" -Destination ".archive/logs/workflow_logs.txt" -Force
Move-Item -Path "logs.zip" -Destination ".archive/logs/logs.zip" -Force
Move-Item -Path "PHASE2_DEPLOYMENT_COMPLETE.txt" -Destination ".archive/phase-logs/PHASE2_DEPLOYMENT_COMPLETE.txt" -Force
Move-Item -Path "PHASE2_FINAL.txt" -Destination ".archive/phase-logs/PHASE2_FINAL.txt" -Force
Move-Item -Path "PHASE2_READY_FOR_MERGE.txt" -Destination ".archive/phase-logs/PHASE2_READY_FOR_MERGE.txt" -Force

# Commit ready logs - create subdirectory
New-Item -ItemType Directory -Path ".archive/logs/commit-ready-logs" -Force | Out-Null
Move-Item -Path "commit_ready_*.log" -Destination ".archive/logs/commit-ready-logs/" -Force
```

---

## Path References That Need Updates

### In Python Code (backend/)
Patterns to find:
```python
# Current format - BEFORE
from backend.models import User
from backend.services import EmailService
import backend.config

# New format - AFTER
from src.backend.models import User
from src.backend.services import EmailService
import src.backend.config

# .env file references
load_dotenv('.env')              # BEFORE
load_dotenv('config/.env')       # AFTER
```

### In JavaScript/TypeScript (frontend/)
```javascript
// Import references typically use relative paths, so less impacted
// But check for:
- process.env or environment variable references
- Path aliases in tsconfig.json
- Webpack/Vite config paths
```

### In PowerShell Scripts (will be in infra/scripts/)
```powershell
# Current format - BEFORE
cd backend
python -m pytest

# After moving to infra/scripts/testing/
cd "../../src/backend"
python -m pytest
```

### In GitHub Workflows (.github/workflows/)
```yaml
# Current format - BEFORE
- name: Run Tests
  working-directory: backend
  run: pytest

# New format - AFTER
- name: Run Tests
  working-directory: src/backend
  run: pytest
```

---

## Database & Runtime Files (NO MOVE)

These should remain at root or in their current locations:
- `.venv/` (Python virtual environment)
- `data/` (runtime data)
- `backups/` (database backups)
- `logs/` (runtime logs)
- `monitoring/` (monitoring configs)
- `seeds/` (test data)
- `baseline-metrics/` (metrics data)
- `templates/` (template files)
- `artifacts/` (build artifacts)

---

## Root Files That Stay (Standard Locations)

Files that should remain at repository root:
- `README.md` (project overview)
- `CHANGELOG.md` (version history)
- `LICENSE` (license file)
- `CODE_OF_CONDUCT.md` (community guidelines)
- `CONTRIBUTING.md` (contribution guidelines)
- `package.json` (Node.js project definition)
- `package-lock.json` (Node.js dependencies)
- `pyproject.toml` (Python project definition)
- `.gitignore` (Git ignore rules)
- `.gitattributes` (Git attributes)
- `.editorconfig` (Editor configuration)
- `.pre-commit-config.yaml` (Pre-commit hooks) → MOVE TO config/
- `student-management-system.code-workspace` (VS Code workspace)
- `.mcp.json` (Local configuration)

---

## Implementation Notes

### Phase 2 (Week 2-3) Execution Order
1. Move source code (`backend/` and `frontend/` → `src/`)
2. Move infrastructure files (`docker/`, `deploy/`, `installer/` → `infra/`)
3. Move configuration files (`.env` files → `config/`)
4. Move scripts to `infra/scripts/` (organized by purpose)
5. Move documentation files to `docs/`
6. Archive log files and old status reports to `.archive/`

### Phase 3 (Week 3-4) - Update References
1. Update Python imports in `src/backend/`
2. Update workflow paths in `.github/workflows/`
3. Update script paths in `infra/scripts/`
4. Update environment variable paths
5. Run comprehensive test suite to verify no broken references

### Testing Strategy
- Create automated path validator before moves
- Run tests after each major move
- Verify imports and paths with find/grep
- Test workflows in feature branch before merge

---

## Rollback Plan

If issues occur:
```powershell
# This is a feature branch - can delete and start over
git reset --hard HEAD
git checkout main
git branch -D feat/codebase-reorganization
```

All changes are atomic to the feature branch, making rollback safe.
