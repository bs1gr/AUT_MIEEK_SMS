# Deployment Checklist v1.17.5

**Release**: v1.17.5 - MIEEK Dark Theme Refinements
**Date**: 2026-01-29
**Status**: Ready for Production

---

## Pre-Deployment Verification

### ✅ Code Quality
- [x] All 370 backend tests passing (18/18 batches)
- [x] All 1249 frontend tests passing (Vitest)
- [x] ESLint validation: 9/9 checks passed
- [x] MyPy type checking: Passed
- [x] TypeScript compilation: Passed
- [x] Markdown linting: Passed
- [x] COMMIT_READY validation: All checks passed (254.6s)

### ✅ Git & Version
- [x] VERSION file updated: 1.17.5
- [x] CHANGELOG.md updated with v1.17.5 entry
- [x] All changes committed to main branch
- [x] Git remote synchronized
- [x] No uncommitted changes in working directory
- [x] Release tag ready: v1.17.5

### ✅ Documentation
- [x] RELEASE_NOTES_v1.17.5.md created
- [x] GITHUB_RELEASE_v1.17.5.md created
- [x] Work plan updated with session notes
- [x] All untracked session files cleaned up

### ✅ Theme Changes
- [x] MIEEK Dark input styling applied
- [x] Weekly schedule toggles styled (white + purple)
- [x] Calendar indicators enhanced
- [x] Focus states improved (blue ring)
- [x] CSS class hooks added to components
- [x] No light mode interference (scoped properly)

### ✅ Component Changes
- [x] SavedSearches JSX structure fixed
- [x] Divider component created and integrated
- [x] CoursesView CSS classes added
- [x] No breaking changes to existing APIs

---

## Deployment Steps

### Step 1: Verify Release Artifacts
```powershell
# Check version consistency
Get-Content VERSION
Get-Content frontend/package.json | Select-String '"version"'
Get-Content backend/pyproject.toml | Select-String 'version ='

# Expected: All show 1.17.5
```

### Step 2: Create GitHub Release
```powershell
# Open GitHub and create release
# Use docs/releases/GITHUB_RELEASE_v1.17.5.md content
# Tag: v1.17.5
# Release Name: Version 1.17.5 - MIEEK Dark Theme Refinements
```

### Step 3: Tag Repository
```bash
git tag -a v1.17.5 -m "Release v1.17.5 - MIEEK Dark Theme Refinements"
git push origin v1.17.5
```

### Step 4: Deploy to Production (Docker)
```powershell
# Update production environment
.\DOCKER.ps1 -Start

# Or with clean rebuild
.\DOCKER.ps1 -UpdateClean
```

### Step 5: Deploy to Development (Native)
```powershell
# For local testing and verification
.\NATIVE.ps1 -Start

# Verify at http://localhost:5173
```

---

## Post-Deployment Verification

### ✅ Docker Deployment
- [ ] Application starts successfully on port 8080
- [ ] Health check endpoint responds: http://localhost:8080/health
- [ ] Database migrations apply automatically
- [ ] All API endpoints accessible
- [ ] Login functionality works
- [ ] MIEEK Dark theme loads correctly

### ✅ Native Deployment (Dev)
- [ ] Backend starts on port 8000
- [ ] Frontend Vite dev server starts on port 5173
- [ ] Hot reload working (CSS changes instant)
- [ ] All API endpoints accessible
- [ ] Login functionality works

### ✅ Theme Verification (Critical)
- [ ] Navigate to Settings → Appearance
- [ ] Select "MIEEK Dark"
- [ ] Verify on page: `/students`
  - [ ] Input fields display white background
  - [ ] Text is black and readable
  - [ ] Focus states show blue ring
- [ ] Verify on page: `/courses`
  - [ ] Weekly Teaching Schedule visible
  - [ ] Day toggle boxes are white
  - [ ] Checkmarks are purple
  - [ ] Calendar picker works
- [ ] Verify on page: `/attendance`
  - [ ] Input fields visible in dark theme
  - [ ] Date pickers functional
  - [ ] All UI controls accessible
- [ ] Toggle back to light theme
  - [ ] No residual dark theme styles
  - [ ] Light mode displays correctly

### ✅ Functionality Tests
- [ ] Create new student (form works in MIEEK Dark)
- [ ] Edit student details (inputs readable)
- [ ] Create course (inputs visible)
- [ ] Add grades (dark theme applied correctly)
- [ ] Export data (buttons accessible)
- [ ] Search functionality (search bar visible)
- [ ] Saved searches load (component renders)

### ✅ Performance
- [ ] Page load times normal
- [ ] No CSS cascading issues
- [ ] No JavaScript errors in console
- [ ] Network requests complete successfully

---

## Rollback Plan

If issues occur:

```powershell
# Revert to v1.17.4
git checkout v1.17.4
git tag -d v1.17.5
git push origin --delete v1.17.5

# Deploy previous version
.\DOCKER.ps1 -Start
```

---

## Release Sign-Off

- [x] Code Quality: PASSED
- [x] Testing: PASSED
- [x] Documentation: COMPLETE
- [x] Deployment Checklist: READY
- [x] Manual Verification: PENDING (user responsibility)

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

**Next Steps**:
1. User performs post-deployment verification above
2. User tests theme on http://localhost:8080 or target deployment
3. Confirm all functionality working as expected
4. Release notes available for stakeholder distribution

---

**Release**: v1.17.5
**Date**: January 29, 2026
**Repository**: https://github.com/bs1gr/AUT_MIEEK_SMS
