# Release Manifest - $11.18.3

**Version:** 1.18.1
**Date:** February 17, 2026
**Type:** Patch release
**Status:** Released

## Installer Artifact (Refreshed Feb 19, 2026)

- File: `SMS_Installer_1.18.1.exe`
- Location: `dist/SMS_Installer_1.18.1.exe`
- Size: `114 MB`
- Modified: `2026-02-19 13:05:45`
- SHA256: `92A826E2DD76DB12617B66DA890810AF59E7993AC537C4A7E29961FF6A1E54DD`
- Authenticode signature: `Valid`
- Signer: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`

---

## Release Artifacts

### Required Artifacts
- [x] Git tag: `$11.18.3`
- [x] GitHub Release: Published with release notes
- [x] VERSION file updated: `1.18.1`
- [x] CHANGELOG.md updated: [1.18.1] section added

### Documentation Updates
- [x] Release notes: `docs/releases/RELEASE_NOTES_$11.18.3.md`
- [x] GitHub release body: `docs/releases/GITHUB_RELEASE_$11.18.3.md`
- [x] Release manifest: `docs/releases/RELEASE_MANIFEST_$11.18.3.md`
- [x] Deployment checklist: `docs/releases/DEPLOYMENT_CHECKLIST_$11.18.3.md`

### Code Changes
- [x] Test fixes: Course modal test selectors and assertions
- [x] All tests passing: 742 backend + 1854 frontend = 2596 total

---

## Validation Gates

### Pre-Release Validation
- [x] `.\COMMIT_READY.ps1 -Quick` passed
- [x] All backend tests passing (33 batches)
- [x] All frontend tests passing (101 files)
- [x] All auto-activation tests passing (34 tests)
- [x] Git status clean (no uncommitted changes)
- [x] On correct branch: `main`

### Version Consistency Checks
- [x] VERSION file: `1.18.1`
- [x] frontend/package.json: `1.18.1`
- [x] backend/pyproject.toml: `1.18.1` (if versioned)
- [x] CHANGELOG.md: [1.18.1] section added

### Release Checklist
- [x] GENERATE_RELEASE_DOCS.ps1 executed (or manual equivalent complete)
- [x] All documentation files created
- [x] Git commit: "chore(release): prepare $11.18.3 release"
- [x] Git tag: `$11.18.3` created and signed
- [x] Git push: `origin main` with tags
- [x] GitHub release: Published at https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$11.18.3

---

## Change Summary

### Bug Fixes (1 commit)
- **fix(tests)**: Update course modal tests for auto-activation UI changes
  - Fixed 5 test failures across AddCourseModal and EditCourseModal
  - Updated selectors from `input[name="year"]` to `[data-testid="semester-year-input"]`
  - Changed type expectations from `number` to `text` for year inputs
  - Restored frontend test suite to 100% passing (1854/1854)

### Documentation Updates
- docs/releases/RELEASE_NOTES_$11.18.3.md: Enhanced with auto-activation details
- docs/releases/GITHUB_RELEASE_$11.18.3.md: Added auto-activation coverage

---

## Files Modified

### Test Files (2)
```
frontend/src/features/courses/components/AddCourseModal.test.tsx
frontend/src/features/courses/components/EditCourseModal.test.tsx
```

### Documentation Files (2)
```
docs/releases/RELEASE_NOTES_$11.18.3.md
docs/releases/GITHUB_RELEASE_$11.18.3.md
```

### Release Documentation (4 new)
```
docs/releases/RELEASE_NOTES_$11.18.3.md
docs/releases/GITHUB_RELEASE_$11.18.3.md
docs/releases/RELEASE_MANIFEST_$11.18.3.md
docs/releases/DEPLOYMENT_CHECKLIST_$11.18.3.md
```

---

## Verification Commands

### Test Validation
```powershell
# Backend tests (5-10 minutes)
.\RUN_TESTS_BATCH.ps1

# Frontend tests (40-50 seconds)
npm --prefix frontend run test -- --run

# Quick validation (2-3 minutes)
.\COMMIT_READY.ps1 -Quick
```

### Version Verification
```powershell
# Check VERSION file
Get-Content VERSION

# Check package.json
Get-Content frontend/package.json | Select-String "version"

# Verify git status
git status
```

---

## Release Decision Points

### Scope
- **Type**: Patch release (1.18.0 → 1.18.1)
- **Breaking changes**: None
- **Database migrations**: None
- **Deployment impact**: Drop-in replacement

### Testing
- **Backend**: 742/742 passing (33 batches)
- **Frontend**: 1854/1854 passing (101 files)
- **Auto-activation**: 34/34 passing (100%)
- **E2E**: Not required (UI changes only affect unit tests)

### Dependencies
- **Parent release**: $11.18.3 (2026-02-16)
- **Next release**: $11.18.3 (TBD)

---

## Post-Release Actions

### Immediate (within 1 hour)
- [x] Verify GitHub release published: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$11.18.3
- [x] Verify tag created: `git tag -l $11.18.3`
- [x] Verify CI/CD pipeline passed: GitHub Actions
- [x] Update work plan: Mark $11.18.3 as released in `docs/plans/UNIFIED_WORK_PLAN.md`

### Short-term (within 24 hours)
- [ ] Monitor for bug reports or issues
- [ ] Verify documentation accessible
- [ ] Check analytics for test failures (if monitoring enabled)

### Medium-term (within 1 week)
- [ ] Assess need for $11.18.3 (if critical issues found)
- [ ] Plan next feature release ($11.18.3)
- [ ] Update roadmap with completed work

---

**Last Updated:** February 18, 2026

---

**Created:** February 17, 2026
**Author:** AI Agent (following project release workflow)
**Approved by:** Solo Developer (owner)
