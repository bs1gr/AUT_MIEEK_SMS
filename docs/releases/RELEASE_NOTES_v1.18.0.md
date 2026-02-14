# Release Notes v1.18.0 - Major Maintenance & UX Consolidation

**Date:** February 15, 2026
**Version:** v1.18.0 (target)
**Status:** Release documentation prepared (pre-tag)
**Focus:** Student lifecycle UX, reporting terminology alignment, i18n consistency, and CI stability

## 🚀 Highlights

This major maintenance release consolidates recent production-hardening work after `v1.17.9`.

- ✅ Cascaded student list experience (active/inactive)
- ✅ Safer deactivate/reactivate enrollment lifecycle
- ✅ Student profile highlight authoring and class-label consistency
- ✅ Reporting terminology migration (`study_year` → `academic_year` / Class)
- ✅ EN/EL i18n key synchronization
- ✅ CI pipeline stability fixes (frontend TypeScript + backend MyPy)

## ✨ Features

### Students

- Added cascaded active/inactive student list views in both student list implementations.
- Added profile highlight authoring flow with role-aware access (admin/teacher).
- Added reusable highlight quick-template authoring support.
- Aligned class labeling to `academic_year` semantics across student card/profile surfaces.

### Reports

- Migrated report templates and copy from `study_year` naming to `academic_year` / “Class”.
- Added report template migration utility for existing template data.

## 🐛 Fixes

### Functional Fixes

- Stabilized analytics dashboard rendering behavior.
- Corrected attendance active filtering behavior.
- Deactivate flow now unenrolls active enrollments with optional re-enroll on reactivation.
- Normalized assignment/category translation handling in grading views.

### Localization

- Synchronized EN/EL dashboard keys.
- Synchronized EN/EL student locale keys and resolved key-structure mismatches.

### CI/CD Stability

- Fixed frontend CI TypeScript failure by using supported enrollment API method in cascaded view.
- Fixed backend CI MyPy failure on reenrollment soft-delete restoration assignment.

## 🔧 Tooling & Operations

- Launcher integration updates for `SMS_Manager.exe` Docker controller workflow.
- Snapshot verification script hardened with timeout-safe behavior in admin workflows.
- Dependency cleanup to keep ASGI-aligned socket stack usage.

## 🔄 Upgrade Notes

- No database migration is required specifically for this documentation update set.
- Existing student/report data remains compatible.
- Frontend and backend should be deployed together to keep API/type contracts aligned.

## ✅ Validation Summary

- CI/CD pipeline rerun after targeted fixes completed successfully.
- Frontend TypeScript and backend MyPy checks were validated against the same gates used by CI.

## 📦 Recommended Release Artifacts

- `docs/releases/RELEASE_NOTES_v1.18.0.md`
- `docs/releases/GITHUB_RELEASE_v1.18.0.md`
- `docs/releases/RELEASE_MANIFEST_v1.18.0.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_v1.18.0.md`

---

**Prepared for:** next major release cut from `main`
