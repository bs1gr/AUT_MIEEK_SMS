# Phase 1: Migration Mapping & Baseline Metrics
**Date**: 2026-06-12  
**Status**: 🟢 IN PROGRESS  
**Phase**: Planning & Preparation (Week 1)

---

## Executive Summary

Phase 1 establishes the foundation for codebase reorganization by:
1. Creating comprehensive migration mapping document
2. Establishing baseline metrics (current state)
3. Identifying all files that need to move
4. Planning dependencies and execution order
5. Setting up test infrastructure

---

## Baseline Metrics (Current State)

### Directory Count
- **Total directories**: 32 (as of 2026-06-12)
- **Root-level directories**: 32 (should be ~10)
- **Nested depth**: Max 4 levels in some places

### File Count
- **Root-level files**: 90+ (should be <20)
- **Total files in repo**: ~2,500
- **Documentation files**: 57+ in .github/ + scattered root

### CI/CD Workflows
- **Total workflows**: 38 (target: 18)
- **Largest workflows**: ci-cd-pipeline.yml (1000+ lines)
- **Average workflow lines**: ~300

### Configuration Files at Root
- `.env` files: 5 (.env, .env.example, .env.production, .env.production.example, .env.qnap.example)
- `.env.production.SECURE`: 1
- `.env.qnap.postgres-only.example`: 1
- **Total env files**: 7

### Scripts at Root Level
- PowerShell scripts (.ps1): 19
- Bash/Shell scripts (.sh): 1
- Python scripts (.py): 3
- **Total scripts**: 23

---

## Migration Mapping: Files & Directories

### Category 1: Source Code (No Move - Already Organized)

**Backend**
- `backend/` → `src/backend/` (MOVE)
  - Contains: Python application, models, routes, services
  - Size: ~45 MB
  - Test location: backend/tests/ → `src/backend/tests/`

**Frontend**
- `frontend/` → `src/frontend/` (MOVE)
  - Contains: React application, components, styles
  - Size: ~80 MB (with node_modules)
  - Test location: frontend/src/**/*.test.tsx → `src/frontend/src/**/*.test.tsx`

**Action**: Create `src/` directory, move both into it

---

### Category 2: Infrastructure & Deployment

#### Docker Files (Currently scattered)
- `docker/` → `infra/docker/` (MOVE)
- `Dockerfile` (at root) → `infra/docker/Dockerfile` (MOVE)
- `.dockerignore` (at root) → `infra/docker/.dockerignore` (MOVE)
- `docker-compose.yml` (if exists) → `infra/docker/docker-compose.yml`

#### Deployment Scripts
- `deploy/` → `infra/deployment/` (MOVE)
- `installer/` → `infra/installer/` (MOVE, installer builder code)
- `SMS_Native_Lite_Edition/` → `infra/native-lite/` (MOVE)

#### Configuration Files
- `.env` → `config/.env` (MOVE)
- `.env.example` → `config/.env.example` (MOVE)
- `.env.production` → `config/environments/production.env` (MOVE)
- `.env.production.example` → `config/environments/production.env.example` (MOVE)
- `.env.production.SECURE` → `config/environments/production.env.SECURE` (MOVE)
- `.env.qnap.example` → `config/environments/qnap.env.example` (MOVE)
- `.env.qnap.postgres-only.example` → `config/environments/qnap-postgres-only.env.example` (MOVE)
- `codecov.yml` → `config/codecov.yml` (MOVE)
- `.coveragerc` → `config/.coveragerc` (MOVE)
- `.gitleaks.toml` → `config/.gitleaks.toml` (MOVE)
- `.trivyignore` → `config/.trivyignore` (MOVE)
- `pyproject.toml` → Keep at root (Python project file)
- `package.json` → Keep at root (Node project file)

**Action**: Create `infra/` and `config/` directories, move files accordingly

---

### Category 3: Scripts (Root Clutter - Reorganize)

#### Release Scripts
- `RELEASE_HELPER.ps1` → `infra/scripts/release/RELEASE_HELPER.ps1`
- `RELEASE_WITH_DOCS.ps1` → `infra/scripts/release/RELEASE_WITH_DOCS.ps1`
- `RELEASE_READY.ps1` → `infra/scripts/release/RELEASE_READY.ps1`
- `INSTALLER_BUILDER.ps1` → `infra/scripts/release/INSTALLER_BUILDER.ps1`
- `GENERATE_RELEASE_DOCS.ps1` → `infra/scripts/release/GENERATE_RELEASE_DOCS.ps1`

#### Development Scripts
- `NATIVE_TOGGLE.ps1` → `infra/scripts/dev/NATIVE_TOGGLE.ps1`
- `NATIVE.ps1` → `infra/scripts/dev/NATIVE.ps1`
- `CREATE_NATIVE_SHORTCUT.ps1` → `infra/scripts/dev/CREATE_NATIVE_SHORTCUT.ps1`
- `setup_lite_qnap.ps1` → `infra/scripts/dev/setup_lite_qnap.ps1`
- `setup_lite_qnap_remote.ps1` → `infra/scripts/dev/setup_lite_qnap_remote.ps1`
- `DOCKER.ps1` → `infra/scripts/dev/DOCKER.ps1`

#### Testing Scripts
- `RUN_E2E_TESTS.ps1` → `infra/scripts/testing/RUN_E2E_TESTS.ps1`
- `RUN_FRONTEND_TESTS.ps1` → `infra/scripts/testing/RUN_FRONTEND_TESTS.ps1`
- `RUN_TESTS_BATCH.ps1` → `infra/scripts/testing/RUN_TESTS_BATCH.ps1`
- `RUN_TESTS_CATEGORY.ps1` → `infra/scripts/testing/RUN_TESTS_CATEGORY.ps1`
- `RUN_CURATED_LOAD_TEST.ps1` → `infra/scripts/testing/RUN_CURATED_LOAD_TEST.ps1`
- `MONITOR_BATCH_TESTS.ps1` → `infra/scripts/testing/MONITOR_BATCH_TESTS.ps1`
- `test_e2e_fixes.sh` → `infra/scripts/testing/test_e2e_fixes.sh`

#### Operations/Maintenance Scripts
- `COMMIT_READY.ps1` → `infra/scripts/ops/COMMIT_READY.ps1`
- `WORKSPACE_CLEANUP.ps1` → `infra/scripts/ops/WORKSPACE_CLEANUP.ps1`
- `WORKSPACE_RECOVERY.ps1` → `infra/scripts/ops/WORKSPACE_RECOVERY.ps1`
- `CLEAR_PYCACHE.ps1` → `infra/scripts/ops/CLEAR_PYCACHE.ps1`
- `UNINSTALL_SMS_MANUALLY.ps1` → `infra/scripts/ops/UNINSTALL_SMS_MANUALLY.ps1`

#### Deployment Scripts
- `DEPLOY_PHASE2_NOW.ps1` → `infra/scripts/deploy/DEPLOY_PHASE2_NOW.ps1`
- `DEPLOY_PHASE2_NOW.sh` → `infra/scripts/deploy/DEPLOY_PHASE2_NOW.sh`

#### Diagnostic Scripts
- `diagnose_migration.py` → `infra/scripts/diagnostics/diagnose_migration.py`
- `fix_admin_account.py` → `infra/scripts/diagnostics/fix_admin_account.py`
- `fix_greek_encoding_permanent.py` → `infra/scripts/diagnostics/fix_greek_encoding_permanent.py`
- `fix_test_credentials.py` → `infra/scripts/diagnostics/fix_test_credentials.py`

**Action**: Create `infra/scripts/` with subdirectories, move all scripts

---

### Category 4: Documentation (Root Level - Move)

#### Status Reports & Session Logs
These should go to `docs/reports/` (new directory):
- `CI_CD_STAGING_CLEANUP_SUMMARY_2026_06_12.md` → `docs/reports/ci-cd-staging-cleanup-2026-06-12.md`
- `STAGING_CLEANUP_GUIDE.md` → `docs/guides/staging-cleanup-guide.md`
- `STAGING_CLEANUP_REPORT_2026_06_12.md` → `docs/reports/staging-cleanup-2026-06-12.md`
- `STAGING_COMPLETE_CLEANUP_2026_06_12.md` → `docs/reports/staging-complete-cleanup-2026-06-12.md`
- `SESSION_COMPLETE_2026_06_12.md` → `.archive/session-logs/SESSION_COMPLETE_2026_06_12.md`
- `CODEBASE_REORGANIZATION_PLAN_2026_06_12.md` → `docs/planning/codebase-reorganization-plan-2026-06-12.md`
- `PHASE1_MIGRATION_MAPPING.md` → `docs/planning/phase1-migration-mapping.md`

#### Core Documentation (Keep at Root)
- `README.md` → Keep at root
- `CHANGELOG.md` → Keep at root (or move to `docs/release-notes/`)
- `LICENSE` → Keep at root
- `CODE_OF_CONDUCT.md` → Keep at root (or move to `docs/`)
- `CONTRIBUTING.md` → Keep at root (or move to `docs/`)

#### Log Files & Temporary Reports (Archive)
- `rebuild.log` → `.archive/logs/rebuild.log`
- `commit_ready_*.log` → `.archive/logs/commit-ready-logs/`
- `pr_output.txt` → `.archive/logs/pr_output.txt`
- `workflow_logs.txt` → `.archive/logs/workflow_logs.txt`
- `logs.zip` → `.archive/logs/logs.zip`
- `PHASE2_DEPLOYMENT_COMPLETE.txt` → `.archive/phase-logs/PHASE2_DEPLOYMENT_COMPLETE.txt`
- `PHASE2_FINAL.txt` → `.archive/phase-logs/PHASE2_FINAL.txt`
- `PHASE2_READY_FOR_MERGE.txt` → `.archive/phase-logs/PHASE2_READY_FOR_MERGE.txt`

**Action**: Create `docs/reports/`, `docs/guides/`, `docs/planning/`, `.archive/logs/`, `.archive/phase-logs/`

---

### Category 5: Configuration Files (Root Level - Move)

- `.editorconfig` → Keep at root (standard location)
- `.gitignore` → Keep at root (standard location)
- `.gitattributes` → Keep at root (standard location)
- `.pre-commit-config.yaml` → `config/.pre-commit-config.yaml`
- `.secrets.baseline` → `config/.secrets.baseline`
- `.markdownlint.json` → `config/.markdownlint.json`
- `.markdownlintignore` → `config/.markdownlintignore`
- `.mcp.json` → Keep at root (local config)
- `student-management-system.code-workspace` → Keep at root (IDE config)

**Action**: Move config files, keep standard Git/Editor files at root

---

### Category 6: Assets & Static Files

- `AUT_Logo.png` → Keep at root or move to `docs/assets/`
- `favicon.ico` → Move to appropriate asset directory
- `safari-pinned-tab.svg` → Move to appropriate asset directory
- `SMS_Native_Toggle.ico` → Move to `infra/native-lite/assets/`

**Action**: Organize assets consistently

---

### Category 7: Existing Organized Directories (Verify & Keep)

These are already well-organized; verify they follow new structure:
- `templates/` → Keep as-is (template files)
- `data/` → Keep as-is (runtime data)
- `backups/` → Keep as-is (database backups)
- `logs/` → Keep as-is (runtime logs)
- `monitoring/` → Keep as-is (monitoring configs)
- `seeds/` → Keep as-is (test data)
- `baseline-metrics/` → Keep as-is (metrics data)
- `artifacts/` → Keep as-is (build artifacts)
- `restore/` → Investigate - may be obsolete
- `archive/` → May already have legacy items
- `dist/` → Build artifacts, can be cleaned
- `.venv/` → Keep (Python virtual environment)
- `.tools/` → Keep as-is
- `.keys/` → Keep as-is (security keys)
- `.github/` → Will be reorganized in Phase 3
- `tools/` → May duplicate `.tools/` - verify

**Action**: Audit and consolidate duplicate directories

---

## Execution Order & Dependencies

### Phase 1 Tasks (This Week)

1. **Create directory structure** (no moves yet)
   - Create: `src/`, `infra/`, `infra/docker/`, `infra/deployment/`, `infra/installer/`, `infra/native-lite/`, `infra/scripts/` (with subdirs), `config/`, `config/environments/`, `docs/`, `docs/reports/`, `docs/guides/`, `docs/planning/`, `.archive/`, `.archive/logs/`, `.archive/phase-logs/`
   - Status: Ready to execute
   - Time: 5 minutes

2. **Document current import paths & references**
   - List all imports in backend/ that reference relative paths
   - List all imports in frontend/ that reference relative paths
   - Find all hardcoded paths in scripts
   - Find all .github/workflows references to file paths
   - Status: Ready to execute
   - Time: 20 minutes

3. **Create update mapping document** 
   - For every import/path change, create mapping
   - Build migration script to handle path updates
   - Status: Ready to execute
   - Time: 30 minutes

4. **Set up test infrastructure**
   - Create test suite to verify no broken imports after migration
   - Create path verification script
   - Status: Ready to execute
   - Time: 30 minutes

5. **Commit Phase 1 work**
   - Commit directory structure creation
   - Commit mapping documentation
   - Ready for Phase 2 review
   - Status: Ready to execute
   - Time: 5 minutes

---

## Path Updates Required (Phase 2 Preparation)

### Backend Python Imports
Scan `backend/` for references like:
- `from backend.something import X` → `from src.backend.something import X`
- Relative imports from scripts
- Config file paths like `.env` → `config/.env`

### Frontend JavaScript/TypeScript Imports
Scan `frontend/` for references like:
- Path-based imports
- Environment file references
- Asset references

### Script Path References
All scripts in `infra/scripts/` will need updates:
- References to `backend/` → `src/backend/`
- References to `frontend/` → `src/frontend/`
- References to config files

### Workflow References
All `.github/workflows/*.yml` will need path updates:
- Working directory references
- Script execution paths
- File input/output paths

---

## Risks & Mitigations (Phase 1)

| Risk | Mitigation |
|------|-----------|
| Missing directory dependencies | Create all directories in correct order |
| Import path compilation errors | Test suite to verify no broken imports |
| Workflow path mismatches | Build automated path validator |
| Script reference errors | Script to update all internal references |

---

## Success Criteria (Phase 1)

✅ All directories created  
✅ Migration mapping document complete  
✅ All file movements planned  
✅ Test infrastructure established  
✅ No broken references identified  
✅ Ready to proceed to Phase 2  

---

## Timeline

- **Phase 1 Start**: 2026-06-12
- **Phase 1 Target**: 2026-06-13 (by end of day)
- **Phase 2 Start**: 2026-06-14 (Monday)

---

## Next Steps

1. Create directory structure (5 min)
2. Document import paths (20 min)
3. Create migration mapping script (30 min)
4. Set up test infrastructure (30 min)
5. Commit Phase 1 work (5 min)

**Estimated Total**: 90 minutes
