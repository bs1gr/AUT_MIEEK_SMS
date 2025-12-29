# Major Release Preparation Plan $11.14.0

**Created:** 2025-12-29
**Target Release:** $11.14.0 (Next Major Release)
**Current Version:** 1.12.9
**Status:** Planning Phase

---

## 🎯 Release Objectives

This major release aims to achieve a **"new solid status"** by:

1. **Comprehensive Improvement Report** - Document all enhancements from $11.14.0 to $11.14.0
2. **Workspace Decluttering** - Archive old artifacts and cleanup failed/incomplete tests
3. **GitHub Repository Cleanup** - Remove draft releases and archive old tags
4. **Backward Compatibility** - Preserve all critical information in organized archives
5. **Fresh Baseline** - Establish $11.14.0 as clean starting point for future development

---

## 📊 Current State Audit

### Version Information
- **Current Version:** 1.12.9
- **Total Git Tags:** 22 tags
- **Recent Release Series:** v1.12.x (9 tags), v1.11.x (3 tags), v1.10.x (2 tags), v1.9.x (7 tags)
- **Test Tag:** v-test-1

### GitHub Release Status
**Total Releases:** 24+ releases found

**Active Published Releases:**
- $11.14.0 (Latest - published ~1 hour ago)
- $11.14.0, $11.14.0, $11.14.0, $11.14.0, $11.14.0, $11.14.0, $11.14.0
- $11.14.0, $11.14.0, $11.14.0
- $11.14.0, $11.14.0
- $11.14.0, $11.14.0, $11.14.0, $11.14.0, $11.14.0, $11.14.0

**Draft Releases (CLEANUP CANDIDATES):**
- ❌ $11.14.0 (Draft - duplicate, published ~1 hour ago)
- ❌ $11.14.0 (Draft - duplicate)
- ❌ $11.14.0 (Draft - duplicate)
- ❌ pr-45-load-report-20251222-175218 (PR draft from Dec 22)

**Observation:** Multiple duplicate draft releases exist for recent versions

### Local Workspace Artifacts

**Directory Sizes:**
```
artifacts/     2.75 MB   - Build artifacts, installers
backups/       364.16 MB - Database backups (LARGEST)
templates/     0.07 MB   - Template files
test-results/  0.31 MB   - E2E test artifacts
```

**Cache Directories:**
```
backend/.pytest_cache/      0.03 MB
frontend/node_modules/      271.71 MB (IGNORE - managed by npm)
.mypy_cache/                (Present)
.ruff_cache/                (Present)
.pytest_cache/              (Root - present)
```

**Scripts at Root:** 10 PowerShell scripts (245.95 KB total)
- COMMIT_READY.ps1 (75 KB) ✅ Keep
- DOCKER.ps1 (41 KB) ✅ Keep
- NATIVE.ps1 (35 KB) ✅ Keep
- WORKSPACE_CLEANUP.ps1 (29 KB) ✅ Keep
- INSTALLER_BUILDER.ps1 (23 KB) ✅ Keep
- GENERATE_RELEASE_DOCS.ps1 (17 KB) ✅ Keep
- RELEASE_PREPARATION.ps1 (11 KB) ✅ Keep
- RELEASE_WITH_DOCS.ps1 (7 KB) ✅ Keep
- RELEASE_READY.ps1 (7 KB) ✅ Keep
- start-backend.ps1 (0.26 KB) ❓ Review

**Root Markdown Files:** 11 files (all whitelisted, sizes vary)
- CHANGELOG.md ✅ Keep
- README.md ✅ Keep
- RELEASE_PREPARATION_CHECKLIST.md ✅ Keep
- RELEASE_DOCUMENTATION_GUIDE.md ✅ Keep
- RELEASE_PREPARATION_SCRIPT_GUIDE.md ✅ Keep
- DOCUMENTATION_INDEX.md ✅ Keep
- RELEASE_COMMAND_REFERENCE.md ✅ Keep
- SECURITY_AUDIT_SUMMARY.md ✅ Keep
- CODE_OF_CONDUCT.md ✅ Keep
- QUICK_RELEASE_GUIDE.md ✅ Keep
- CONTRIBUTING.md ✅ Keep

### Existing Archive Structure
```
docs/archive/
├── documentation/     - Historical documentation files
├── pr-updates/        - PR update documentation
└── reports-2025-12/   - December 2025 audit reports
```

### Database Migrations
- **Migration Directory:** `backend/alembic/versions/` (path not found - check actual location)
- **Migration Status:** Migrations run automatically on startup via lifespan

---

## 🎬 Phase 1: Pre-Release Audit & Documentation

### Task 1.1: Comprehensive Improvement Report
**Create:** `docs/releases/reports/IMPROVEMENTS_$11.14.0_to_$11.14.0.md`

**Content Sections:**
1. **Executive Summary**
   - Version progression: $11.14.0 → $11.14.0
   - Total commits, PRs, issues closed
   - Key feature highlights

2. **Major Features Added**
   - Async Job Queue & Audit Logging (Phase 2.3)
   - Import Preview/Validation endpoint
   - Job Progress Monitor (frontend)
   - Import Preview UI
   - E2E comprehensive logging
   - RBAC admin endpoints and guides (EN/EL)

3. **Bug Fixes & Security**
   - Path traversal protection in backup operations
   - E2E test stabilization
   - Docker entrypoint import order
   - Database path configuration unification
   - SECRET_KEY validation handling

4. **CI/CD & Testing**
   - npm dependency caching (30-45s savings)
   - E2E test improvements (logging, seed validation, page-ready indicators)
   - Backend test coverage: 65% (390 tests)
   - Frontend test suite passing

5. **Documentation & Release Automation**
   - Complete release automation (RELEASE_READY.ps1, RELEASE_WITH_DOCS.ps1)
   - Comprehensive deployment reports
   - Session completion summaries
   - Documentation organization into canonical folders

6. **Performance & Infrastructure**
   - Load testing infrastructure complete
   - Monitoring stack integration (Grafana/Prometheus)
   - Database indexing strategy (email, student_id, course_code, date, semester)

**Source Data:**
- CHANGELOG.md (lines 1-100, full file 1642 lines)
- TODO.md (Phase 2.3 completion markers)
- Git log: `git log $11.14.0..$11.14.0 --oneline`
- GitHub PR history

**Timeline:** 2-3 hours research + documentation

---

### Task 1.2: Failed Test Artifacts Audit
**Search for:**
- E2E test failure artifacts: `frontend/test-diagnostics/`, `frontend/test-logs/`
- Playwright reports: `playwright-report/` (none found in current scan)
- Coverage reports: `.coverage`, `htmlcov/`, `coverage/`
- Test output files: `*output*.txt` (none found at root)
- Backend test artifacts: `backend/.pytest_cache/`, `backend/htmlcov/`

**Actions:**
- Catalog all found artifacts with sizes
- Determine which are gitignored (should be) vs. committed (shouldn't be)
- Plan archival strategy for historical test reports

**Timeline:** 30 minutes

---

### Task 1.3: Obsolete Configuration Files Audit
**Review:**
- `.env.production.example`, `.env.qnap.example` - Still relevant?
- Root config files moved to `config/`: already done (mypy.ini, pytest.ini, ruff.toml)
- Legacy scripts: Check if `start-backend.ps1` is still used
- Docker compose files: `docker/docker-compose.yml`, `docker/docker-compose.prod.yml`, `docker/docker-compose.monitoring.yml`

**Actions:**
- Verify each file's usage with `grep -r "filename" .` searches
- Move obsolete files to `archive/deprecated-configs/`
- Update documentation references

**Timeline:** 1 hour

---

## 🗄️ Phase 2: Archival Strategy

### Task 2.1: GitHub Release Cleanup
**Delete Draft Releases:**
```bash
# Identify drafts
gh release list --limit 50 | grep "Draft"

# Delete duplicate drafts (REQUIRES CONFIRMATION)
gh release delete $11.14.0 --yes  # Draft only, keep published
gh release delete $11.14.0 --yes  # Draft only
gh release delete $11.14.0 --yes  # Draft only
gh release delete pr-45-load-report-20251222-175218 --yes
```

**Archive Pre-1.12.0 Releases:**
- **Strategy:** Keep all published releases (tags remain in git)
- **Documentation:** Create `docs/archive/releases/PRE_$11.14.0_RELEASES.md`
  - List all v1.9.x, v1.10.x, v1.11.x releases with links
  - Preserve release notes text for offline reference
  - Document upgrade paths from old versions

**Delete Test Tag:**
```bash
# Local
git tag -d v-test-1

# Remote (REQUIRES CONFIRMATION)
git push origin :refs/tags/v-test-1
```

**Timeline:** 1 hour

---

### Task 2.2: Local Workspace Archival

#### 2.2.1: Database Backups (364 MB)
**Current Location:** `backups/`

**Strategy:**
- **Keep Latest:** Last 7 days of backups (rotate weekly)
- **Archive Older:** Move backups >30 days to external storage
- **Document:** Create `backups/README.md` with retention policy

**Actions:**
```powershell
# Identify old backups (>30 days)
Get-ChildItem -Path ".\backups" -Filter "*.db" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Select-Object Name, LastWriteTime, @{N="Size_MB";E={[math]::Round($_.Length/1MB,2)}}

# Create archive directory (manual copy to external drive)
New-Item -ItemType Directory -Path ".\backups\archive-2025-12" -Force

# Move old backups
Move-Item -Path ".\backups\*.db" -Destination ".\backups\archive-2025-12\" -Filter {$_.LastWriteTime -lt (Get-Date).AddDays(-30)}

# Document in .gitignore (already present: backups/)
```

**Expected Savings:** ~300 MB (if 80% are old)

**Timeline:** 30 minutes

---

#### 2.2.2: Build Artifacts (2.75 MB)
**Current Location:** `artifacts/`

**Strategy:**
- **Keep Latest:** Last 3 installer builds
- **Delete Older:** Remove artifacts from v1.11.x and earlier
- **Document:** Update `artifacts/README.md` with build process

**Actions:**
```powershell
# List artifacts with dates
Get-ChildItem -Path ".\artifacts" -Recurse |
  Select-Object Name, LastWriteTime, @{N="Size_MB";E={[math]::Round($_.Length/1MB,2)}}

# Remove old installer builds (manual review first)
# Keep only: SMS_Setup_1.12.9.exe, SMS_Setup_1.12.8.exe, SMS_Setup_1.12.7.exe
```

**Expected Savings:** ~2 MB

**Timeline:** 20 minutes

---

#### 2.2.3: Test Artifacts (0.31 MB)
**Current Location:** `test-results/`

**Strategy:**
- **Keep:** Last successful E2E run
- **Delete:** Failed test artifacts >7 days old
- **Gitignore:** Ensure `test-results/` is gitignored (already added in $11.14.0)

**Actions:**
```powershell
# Verify gitignore
Select-String -Path ".gitignore" -Pattern "test-results"

# Clean old test results
Remove-Item -Path ".\test-results\e2e\*" -Recurse -Force -ErrorAction SilentlyContinue

# Keep only latest successful run
```

**Expected Savings:** ~0.3 MB

**Timeline:** 10 minutes

---

#### 2.2.4: Cache Directories
**Locations:**
- `.pytest_cache/` (root)
- `backend/.pytest_cache/` (0.03 MB)
- `.mypy_cache/`
- `.ruff_cache/`
- `frontend/node_modules/` (271 MB - **DO NOT DELETE**, npm managed)

**Strategy:**
- **Clean:** All cache directories (safe to regenerate)
- **Gitignore:** Already present for all except root `.pytest_cache/`

**Actions:**
```powershell
# Clean Python caches
Remove-Item -Path ".\.pytest_cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\backend\.pytest_cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.mypy_cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.ruff_cache" -Recurse -Force -ErrorAction SilentlyContinue

# Verify gitignore covers these
```

**Expected Savings:** ~50-100 MB (mypy/ruff caches can grow)

**Timeline:** 5 minutes

---

#### 2.2.5: Obsolete Scripts Review
**Candidate:** `start-backend.ps1` (0.26 KB)

**Actions:**
```powershell
# Check usage
Select-String -Path "*.md","*.ps1" -Pattern "start-backend.ps1"

# If unused, move to archive
Move-Item -Path ".\start-backend.ps1" -Destination ".\archive\pre-$11.14.0\start-backend.ps1"
```

**Timeline:** 10 minutes

---

### Task 2.3: Archive Documentation
**Current Archives:**
- `docs/archive/documentation/` - Historical docs
- `docs/archive/pr-updates/` - PR update docs
- `docs/archive/reports-2025-12/` - December 2025 audit reports

**New Archives to Create:**
1. **`docs/archive/releases/PRE_$11.14.0_RELEASES.md`**
   - Consolidated list of all v1.9.x - v1.11.x releases
   - Release notes excerpts from CHANGELOG.md
   - Upgrade paths and breaking changes

2. **`docs/archive/reports-2025-12/WORKSPACE_CLEANUP_$11.14.0_PRE_RELEASE.md`**
   - Document what was cleaned up before $11.14.0
   - File counts, sizes, and locations
   - Archival decisions and rationale

3. **Move existing root reports:**
   - Run `WORKSPACE_CLEANUP.ps1` to organize any remaining root documentation

**Timeline:** 1 hour

---

## 📦 Phase 3: Version Bump & Release Preparation

### Task 3.1: Version Bump to $11.14.0
**Files to Update:**
- `VERSION` - Change to `1.13.0`
- `frontend/package.json` - Update `version` field
- `backend/main.py` - Update version constant
- `TODO.md` - Update "Current Version" line

**Verification:**
```powershell
.\scripts\VERIFY_VERSION.ps1 -ExpectedVersion "1.13.0"
```

**Timeline:** 15 minutes

---

### Task 3.2: CHANGELOG.md Consolidation
**Current Issue:** CHANGELOG.md has duplicate entries for $11.14.0

**Actions:**
1. Deduplicate $11.14.0 entries (merge into single section)
2. Add $11.14.0 section at top:
   ```markdown
   ## [1.13.0] - 2025-12-29

   **Release Type:** Major Release - Workspace & Repository Consolidation
   **Focus:** Comprehensive improvement report, archival cleanup, fresh baseline

   ### Added
   - Comprehensive improvement report ($11.14.0 → $11.14.0)
   - Release archival documentation for pre-$11.14.0 versions
   - Workspace cleanup automation enhancements

   ### Changed
   - Database backup retention policy (7-day rotation, 30-day archive)
   - Build artifact retention (keep last 3 releases)
   - GitHub release cleanup (removed duplicate drafts)

   ### Removed
   - Old test artifacts and cache directories
   - Duplicate GitHub draft releases ($11.14.0, $11.14.0, $11.14.0 drafts)
   - Test tag v-test-1
   - Obsolete configuration examples
   ```

**Timeline:** 30 minutes

---

### Task 3.3: Create Comprehensive Release Report
**File:** `docs/releases/reports/RELEASE_REPORT_$11.14.0.md`

**Sections:**
1. **Release Summary**
   - Version: 1.13.0
   - Release Date: 2025-12-29
   - Type: Major Release (Consolidation)
   - Upgrade Path: $11.14.0 → $11.14.0 (no breaking changes)

2. **Improvements Consolidated** (link to Task 1.1 report)
   - Phase 2.3 features summary
   - Bug fixes summary
   - CI/CD enhancements
   - Documentation improvements

3. **Cleanup Summary**
   - GitHub releases: 4 drafts deleted
   - Workspace size reduction: ~350 MB
   - Archived items: Database backups, build artifacts, test results
   - Retention policies established

4. **Migration Guide**
   - No breaking changes
   - Backup recommendations
   - Testing checklist

5. **Next Steps**
   - $11.14.0+ roadmap (Phase 2.4 RBAC if planned)
   - Deferred features from TODO.md
   - Community feedback integration

**Timeline:** 2 hours

---

### Task 3.4: Pre-Release Validation
**Run:** `COMMIT_READY.ps1 -Full`

**Checklist:**
- ✅ All tests passing (backend 390 tests, frontend suite)
- ✅ No linting errors (ruff, mypy)
- ✅ Version consistency verified
- ✅ CHANGELOG.md up to date
- ✅ Documentation index updated
- ✅ Root markdown whitelist compliance
- ✅ Git status clean

**Timeline:** 15 minutes

---

## 🚀 Phase 4: Release Execution

### Task 4.1: Automated Release
**Execute:**
```powershell
# Generate release documentation
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"

# Run release preparation
.\RELEASE_PREPARATION.ps1 -Mode Full

# Execute release with docs
.\RELEASE_WITH_DOCS.ps1 -Version "1.13.0"
```

**Expected Outputs:**
- Git tag `$11.14.0` created and pushed
- GitHub release published with:
  - Comprehensive release notes
  - Installer artifact (SMS_Setup_1.13.0.exe)
  - SHA256 checksum
  - Links to improvement reports
- CHANGELOG.md committed and pushed

**Timeline:** 30 minutes

---

### Task 4.2: Post-Release Verification
**Checklist:**
1. ✅ GitHub release visible and published
2. ✅ Installer downloadable and functional
3. ✅ Documentation updated on GitHub
4. ✅ No draft releases remaining (except intentional)
5. ✅ Git tag matches VERSION file
6. ✅ CHANGELOG.md consistent with release notes

**Actions:**
```bash
# Verify release
gh release view $11.14.0

# Verify tag
git tag -l $11.14.0
git show $11.14.0

# Verify documentation
gh browse  # Check GitHub web UI
```

**Timeline:** 15 minutes

---

### Task 4.3: Final Workspace Cleanup
**Run:** `WORKSPACE_CLEANUP.ps1`

**Expected Results:**
- All root documentation organized
- Test artifacts in `test-results/` only
- No residual build outputs
- Cache directories clean

**Timeline:** 10 minutes

---

## 📋 Execution Summary

### Total Estimated Time
- **Phase 1 (Audit & Docs):** 4.5 hours
- **Phase 2 (Archival):** 4 hours
- **Phase 3 (Version Bump & Prep):** 3.5 hours
- **Phase 4 (Release & Verify):** 1.25 hours
- **Total:** ~13.25 hours (can parallelize some tasks)

### Disk Space Savings
- Database backups: ~300 MB (archived externally)
- Build artifacts: ~2 MB (old installers deleted)
- Test artifacts: ~0.3 MB (cleaned)
- Cache directories: ~50-100 MB (regeneratable)
- **Total Expected Savings:** ~350-400 MB

### GitHub Cleanup
- Draft releases deleted: 4 ($11.14.0, $11.14.0, $11.14.0, pr-45-load-report)
- Test tags deleted: 1 (v-test-1)
- Archived documentation: Pre-$11.14.0 release history

---

## ⚠️ Critical Safeguards

### Backup Before Execution
```powershell
# Create full backup before starting
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\pre-$11.14.0-backup-$timestamp"

# Backup critical files
Copy-Item -Path ".\VERSION" -Destination "$backupDir\"
Copy-Item -Path ".\CHANGELOG.md" -Destination "$backupDir\"
Copy-Item -Path ".\backend\main.py" -Destination "$backupDir\"
Copy-Item -Path ".\frontend\package.json" -Destination "$backupDir\"

# Backup database
Copy-Item -Path ".\data\student_management.db" -Destination "$backupDir\"

Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green
```

### Rollback Plan
If issues occur during release:
1. **Revert Version:** `git checkout HEAD~1 VERSION CHANGELOG.md`
2. **Delete Tag:** `git tag -d $11.14.0 && git push origin :refs/tags/$11.14.0`
3. **Delete Release:** `gh release delete $11.14.0 --yes`
4. **Restore Backup:** Copy files from `pre-$11.14.0-backup-*/`

### User Approval Required
**Before executing these destructive actions, confirm with user:**
- [ ] Delete GitHub draft releases ($11.14.0, $11.14.0, $11.14.0, pr-45 drafts)
- [ ] Delete git tag v-test-1 (local + remote)
- [ ] Move database backups >30 days to external storage
- [ ] Delete old build artifacts from `artifacts/`
- [ ] Clean cache directories (regeneratable)

---

## 📝 Next Steps (User Action)

**Please review this plan and confirm:**
1. Are the archival strategies acceptable? (30-day backup retention, keep last 3 installers)
2. Should we delete the test tag `v-test-1`?
3. Are there any specific files/artifacts you want to preserve beyond this plan?
4. Should $11.14.0 be the version, or would you prefer $11.14.0 for a major consolidation?

**Once approved, I will:**
1. Create the comprehensive improvement report (Task 1.1)
2. Execute audit tasks (Task 1.2, 1.3)
3. Present findings for final confirmation before destructive actions
4. Execute Phase 2-4 with continuous updates

**Estimated completion:** 1-2 days (with user review checkpoints)

---

## 📎 References

- [CHANGELOG.md](../../CHANGELOG.md)
- [TODO.md](../misc/TODO.md)
- [WORKSPACE_CLEANUP.ps1](../../WORKSPACE_CLEANUP.ps1)
- [COMMIT_READY.ps1](../../COMMIT_READY.ps1)
- [RELEASE_READY.ps1](../../RELEASE_READY.ps1)
- [Git Tags Documentation](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)

**Plan Status:** ✅ **READY FOR USER REVIEW**
