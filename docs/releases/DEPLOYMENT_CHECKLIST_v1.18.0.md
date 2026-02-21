# Deployment Checklist $11.18.3

**Release Date:** February 2026 (target)
**Version:** $11.18.3
**Focus:** Student lifecycle UX + reporting terminology + localization consistency + CI stability

## 📋 Pre-Deployment Verification

### 1) Source & Version Checks

- [ ] `main` is clean (`git status`)
- [ ] Tag does **not** already exist before release creation (`$11.18.3`)
- [ ] `VERSION` and frontend package version are aligned with planned release

### 2) Quality Gates

- [ ] Backend batch tests completed via `RUN_TESTS_BATCH.ps1`
- [ ] Frontend test suite completed
- [ ] Frontend TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Backend MyPy passes (`mypy --config-file=config/mypy.ini backend --namespace-packages`)
- [ ] CI/CD pipeline on `main` is green

### 3) Documentation Gates

- [ ] `CHANGELOG.md` contains post-`$11.18.3` consolidated release notes
- [ ] `RELEASE_NOTES_$11.18.3.md` updated
- [ ] `GITHUB_RELEASE_$11.18.3.md` updated
- [ ] `RELEASE_MANIFEST_$11.18.3.md` updated
- [ ] `UNIFIED_WORK_PLAN.md` and `DOCUMENTATION_INDEX.md` synchronized

## 🚀 Deployment Steps

### Production

- [ ] Start/update production with `DOCKER.ps1 -Start` (or approved update workflow)
- [ ] Verify API health endpoint and UI accessibility
- [ ] Confirm auth, students, and reports critical paths are functional

### Native Validation (optional but recommended)

- [ ] Validate local test/dev flow with `NATIVE.ps1 -Start`
- [ ] Smoke-check student cascade views and report template terminology updates

## 🔍 Post-Deployment Verification

- [ ] Student active/inactive cascaded views render correctly
- [ ] Deactivate/reactivate enrollment lifecycle behaves as expected
- [ ] Report templates display `academic_year` / Class terminology
- [ ] EN/EL switching works for updated dashboard/student keys
- [ ] No new CI regressions after release tag

## 📦 Release Completion

- [ ] Create GitHub release using `GITHUB_RELEASE_$11.18.3.md`
- [ ] Attach release artifacts as needed
- [ ] Record release commit/tag references in work plan
