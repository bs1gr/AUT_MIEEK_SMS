# Deployment Checklist - v1.18.1

**Version:** 1.18.1
**Date:** February 17, 2026
**Type:** Patch release (bug fixes)
**Deployment Risk:** LOW (test fixes only, no functional changes)
**Release Status:** Published and verified (Feb 18, 2026)

---

## Pre-Deployment Validation

### 1. Code Quality ✅ REQUIRED
- [ ] All linting passed: `python -m ruff check backend/ && npm --prefix frontend run lint`
- [ ] Type checking passed: `npx tsc --noEmit --skipLibCheck`
- [ ] All tests passing: `.\RUN_TESTS_BATCH.ps1` (backend) + `npm --prefix frontend run test -- --run` (frontend)
- [ ] COMMIT_READY validation: `.\COMMIT_READY.ps1 -Quick` passed

**Expected Results:**
- Ruff: "All checks passed!"
- ESLint: 0 errors (warnings acceptable)
- Backend: 742/742 tests passing (33 batches)
- Frontend: 1854/1854 tests passing (101 files)
- COMMIT_READY: All 9 checks passed

### 2. Version Consistency ✅ REQUIRED
- [ ] VERSION file: Contains `1.18.1`
- [ ] frontend/package.json: Version is `1.18.1`
- [ ] CHANGELOG.md: Has [1.18.1] section dated 2026-02-17
- [ ] Release notes: `docs/releases/RELEASE_NOTES_v1.18.1.md` exists

**Verification Command:**
```powershell
# Check version consistency
$version = Get-Content VERSION
$packageJson = Get-Content frontend/package.json | ConvertFrom-Json
Write-Host "VERSION: $version"
Write-Host "package.json: $($packageJson.version)"
```

### 3. Git Status ✅ REQUIRED
- [ ] On `main` branch: `git branch --show-current`
- [ ] All changes committed: `git status` shows "working tree clean"
- [ ] All commits pushed: `git status` shows "up to date with 'origin/main'"
- [ ] No conflicts with remote: `git pull --dry-run`

**Verification Command:**
```powershell
git status
git log --oneline -5
```

### 4. Documentation Complete ✅ REQUIRED
- [ ] Release notes: `docs/releases/RELEASE_NOTES_v1.18.1.md`
- [ ] GitHub release body: `docs/releases/GITHUB_RELEASE_v1.18.1.md`
- [ ] Release manifest: `docs/releases/RELEASE_MANIFEST_v1.18.1.md`
- [ ] Deployment checklist: This file
- [ ] CHANGELOG.md: [1.18.1] section added

---

## Release Execution

### 5. Create Release Tag ✅ REQUIRED
```powershell
# Create annotated tag
git tag -a v1.18.1 -m "Release v1.18.1 - Test fixes and documentation updates"

# Verify tag created
git tag -l v1.18.1

# Show tag details
git show v1.18.1
```

**Expected Output:**
- Tag created successfully
- Tag points to latest commit with release changes
- Tag message matches release summary

### 6. Push to Remote ✅ REQUIRED
```powershell
# Push commits and tags
git push origin main --tags

# Verify push succeeded
git log --oneline -1
git ls-remote --tags origin | Select-String "v1.18.1"
```

**Expected Output:**
- Commits pushed successfully
- Tag v1.18.1 visible on remote
- GitHub Actions CI/CD triggered

### 7. Create GitHub Release ✅ REQUIRED
1. Navigate to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new
2. Select tag: `v1.18.1`
3. Release title: `v1.18.1 - Test Fixes & Documentation Updates`
4. Copy body from: `docs/releases/GITHUB_RELEASE_v1.18.1.md`
5. Set as latest release: ✅ Yes
6. Set as pre-release: ❌ No
7. Click "Publish release"

**Verification:**
- [ ] Release visible at: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.1
- [ ] Release marked as "Latest"
- [ ] Full changelog link works

---

## Post-Deployment Validation

### 8. CI/CD Pipeline ✅ REQUIRED
- [ ] GitHub Actions workflow triggered: Check https://github.com/bs1gr/AUT_MIEEK_SMS/actions
- [ ] All workflow jobs passed (build, test, lint)
- [ ] No deployment failures or errors

**Verification:**
```powershell
# Check latest workflow run
gh run list --limit 1
# or visit: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
```

### 9. Deployment Verification (Docker Mode) ⚠️ OPTIONAL
If deploying to production environment:

```powershell
# Stop existing Docker deployment
.\DOCKER.ps1 -Stop

# Pull latest changes
git pull origin main

# Start with new version
.\DOCKER.ps1 -Start

# Verify version
docker exec sms-backend cat /app/VERSION
# Should output: 1.18.1
```

**Health Checks:**
- [ ] Backend API responding: http://localhost:8080/api/v1/health
- [ ] Frontend loads: http://localhost:8080
- [ ] Login works: Test with admin credentials
- [ ] Course modals render correctly (visual check)
- [ ] No console errors in browser dev tools

### 10. Deployment Verification (Native Mode) ⚠️ OPTIONAL
If using native development mode:

```powershell
# Stop existing native deployment
.\NATIVE.ps1 -Stop

# Pull latest changes
git pull origin main

# Start with new version
.\NATIVE.ps1 -Start

# Verify version
Get-Content VERSION
# Should output: 1.18.1
```

**Health Checks:**
- [ ] Backend API responding: http://localhost:8000/health
- [ ] Frontend loads: http://localhost:5173
- [ ] Hot reload working (edit a file, verify update)
- [ ] Course modals render correctly
- [ ] Tests still passing after deployment

---

## Rollback Procedure

### If Deployment Fails

**Scenario 1: Git tag created but release not published**
```powershell
# Delete local tag
git tag -d v1.18.1

# Delete remote tag (if pushed)
git push origin :refs/tags/v1.18.1

# Recommit fixes and retry
```

**Scenario 2: Release published but deployment broken**
```powershell
# Revert to previous version in Docker
git checkout v1.18.1
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Start

# Mark release as pre-release on GitHub (not latest)
# Investigate and fix issues
# Create v1.18.1 with fixes
```

**Scenario 3: Critical bug found after release**
```powershell
# Create hotfix branch
git checkout -b hotfix/v1.18.1

# Apply fixes
# ... make changes ...

# Test thoroughly
.\RUN_TESTS_BATCH.ps1
npm --prefix frontend run test -- --run

# Create v1.18.1 release
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.18.2"
# ... follow this checklist for v1.18.1 ...
```

---

## Communication

### Stakeholder Notification ⚠️ OPTIONAL

**Note:** This is a SOLO DEVELOPER project - no external stakeholders. The developer decides whether to notify anyone.

If notification is desired:
- [ ] Update internal changelog/notes
- [ ] Post in project chat/forum (if applicable)
- [ ] Email notification (if distribution list exists)

### Documentation Updates ✅ REQUIRED
- [ ] Update `docs/plans/UNIFIED_WORK_PLAN.md`: Mark v1.18.1 as released
- [ ] Update `docs/DOCUMENTATION_INDEX.md`: Add v1.18.1 release entry (if needed)
- [ ] Archive previous release docs (if policy requires)

---

## Sign-Off

### Deployment Approval
- [ ] All pre-deployment validation passed
- [ ] All tests passing (backend + frontend)
- [ ] Documentation complete
- [ ] Git tag created and pushed
- [ ] GitHub release published

### Post-Deployment Confirmation
- [ ] CI/CD pipeline passed
- [ ] Production deployment verified (if applicable)
- [ ] Health checks passed
- [ ] No critical issues detected
- [ ] Work plan updated

### Completion
- [ ] Deployment considered successful
- [ ] Ready for next release planning (v1.18.2)

---

**Deployment Date:** _________________
**Deployed By:** Solo Developer
**Deployment Time:** _______ minutes
**Issues Encountered:** _________________
**Rollback Required:** ☐ Yes  ☐ No

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

**Checklist Version:** 1.0
**Created:** February 17, 2026
**Last Updated:** February 18, 2026
