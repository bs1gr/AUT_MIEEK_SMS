# GitHub Release Draft - v1.18.0

**Use this content to create the GitHub Release at:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new

---

## Tag Information

- **Tag version**: `v1.18.0`
- **Target**: `main`
- **Release title**: `v1.18.0 - Major Maintenance & UX Consolidation`

---

## Release Body

# v1.18.0 - Major Maintenance & UX Consolidation

**Release Date**: February 2026  
**Type**: Major maintenance release  
**Status**: Production-ready

---

## 🎉 Highlights

- ✅ Cascaded active/inactive student list experience
- ✅ Student deactivate/reactivate enrollment lifecycle hardening
- ✅ Student profile highlight authoring and class-label consistency
- ✅ Reporting terminology migration to `academic_year` / Class
- ✅ EN/EL i18n synchronization across dashboard and students modules
- ✅ CI stability fixes for frontend TypeScript and backend MyPy gates

---

## ✨ What’s Included

### Students
- Added cascaded views in both student-list implementations.
- Added profile highlight authoring with role-aware access.
- Aligned class labels to `academic_year` semantics across UI/tests.

### Reports
- Migrated templates/copy from `study_year` to `academic_year` / “Class”.
- Added migration utility for legacy report template terminology.

### Fixes
- Stabilized analytics/dashboard rendering and attendance filtering.
- Synced EN/EL locale keys and resolved key-structure mismatches.
- Normalized grading translation labels for assignment/category surfaces.
- Fixed CI gate failures:
  - Frontend TypeScript (`enrollmentsAPI` method mismatch)
  - Backend MyPy (soft-delete restore assignment annotation)

---

## 🚀 Upgrade Notes

- Deploy frontend and backend together.
- No special migration required for this release documentation set.
- Keep standard workflow:
  - Test/dev: `NATIVE.ps1 -Start`
  - Production: `DOCKER.ps1 -Start`

---

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.17.9...v1.18.0
