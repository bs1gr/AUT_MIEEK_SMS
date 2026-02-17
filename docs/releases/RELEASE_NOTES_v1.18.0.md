# Release Notes $11.18.1 - Major Maintenance & UX Consolidation

**Date:** February 17, 2026
**Version:** $11.18.1 (target)
**Status:** Release documentation prepared (pre-tag)
**Focus:** Course auto-activation, student lifecycle UX, reporting terminology alignment, i18n consistency, and CI stability

## 🚀 Highlights

This major maintenance release consolidates recent production-hardening work after `$11.18.1`.

- ✅ **NEW**: Course auto-activation enhancements (scheduled sync, UI indicators, monitoring)
- ✅ Cascaded student list experience (active/inactive)
- ✅ Safer deactivate/reactivate enrollment lifecycle
- ✅ Student profile highlight authoring and class-label consistency
- ✅ Reporting terminology migration (`study_year` → `academic_year` / Class)
- ✅ EN/EL i18n key synchronization
- ✅ CI pipeline stability fixes (frontend TypeScript + backend MyPy)

## ✨ Features

### Courses (NEW - $11.18.1)

**Semester-Based Auto-Activation System**:
- **Scheduled Job**: APScheduler service runs daily at 3:00 AM UTC to bulk-update course `is_active` status based on semester date ranges
- **UI Enhancement**: Real-time visual indicators in course modals showing auto-activation status
  - Green badge: active (current date within semester range)
  - Amber badge: inactive (current date outside semester range)
  - Blue badge: manual activation (unrecognized semester format)
- **Monitoring**: Comprehensive audit logging when auto-activation is applied (create/update operations, bulk scheduler)
- **Frontend Utility**: `courseAutoActivation.ts` (143 lines) - replicates backend semester parsing logic
- **i18n**: Added EN/EL translation keys for auto-activation labels and hints
- **Testing**: 34 comprehensive unit tests (100% passing) covering all utility functions

**Implementation**:
- Backend: `CourseActivationScheduler` service (178 lines) integrated into MaintenanceScheduler
- Frontend: Real-time preview in AddCourseModal and EditCourseModal components
- Date Range Logic:
  - Winter: Sept 15 → Jan 30 (next year)
  - Spring: Feb 1 → June 30
  - Academic Year: Sept 1 → June 30 (next year)
- Supports Greek text with diacritic normalization
- **Commits**: a4a74ba50, 170001597, 08625027a, f6c6df9c4

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

- `docs/releases/RELEASE_NOTES_$11.18.1.md`
- `docs/releases/GITHUB_RELEASE_$11.18.1.md`
- `docs/releases/RELEASE_MANIFEST_$11.18.1.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_$11.18.1.md`

---

**Prepared for:** next major release cut from `main`
