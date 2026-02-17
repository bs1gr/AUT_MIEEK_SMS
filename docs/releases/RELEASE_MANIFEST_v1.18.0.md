# Release Manifest v1.18.1

**Version:** v1.18.1 (target)
**Date:** February 15, 2026
**Build Status:** Documentation + release packaging ready
**Base Tag:** `v1.18.1`
**Target Branch:** `main`

## Artifact Scope

- **Frontend:** `frontend/` (React + TypeScript application)
- **Backend:** `backend/` (FastAPI application)
- **Docs:**
  - `CHANGELOG.md`
  - `docs/releases/RELEASE_NOTES_v1.18.1.md`
  - `docs/releases/GITHUB_RELEASE_v1.18.1.md`
  - `docs/releases/DEPLOYMENT_CHECKLIST_v1.18.1.md`
  - `docs/plans/UNIFIED_WORK_PLAN.md`
  - `docs/DOCUMENTATION_INDEX.md`

## Included Change Themes

- Student lifecycle UX improvements (cascaded lists, enrollment lifecycle safety)
- Reporting terminology modernization (`academic_year` / Class)
- EN/EL i18n synchronization and structure corrections
- CI reliability fixes (TypeScript + MyPy)

## Validation Gates

- Frontend TypeScript compilation gate: pass
- Backend MyPy gate: pass
- CI/CD pipeline rerun after fixes: pass

## Deployment Configuration

- **Development/Test:** `NATIVE.ps1 -Start`
- **Production Deployment:** `DOCKER.ps1 -Start`
- **Environment:** Existing `.env` strategy remains unchanged

## Notes

- No dedicated schema migration is required solely for this release documentation package.
- Tag and publish only after final owner sign-off for release timing.
