# Pending Fixes

## Current Status (Jan 16, 2026)

**Version**: v1.18.0 ✅ STABLE (Released Jan 14, 2026)
**Test Status**: All 370 backend + 1,249 frontend + 19 E2E passing ✅

## Frontend TypeScript Errors (If Any)

### To Investigate
- [ ] Run `npx tsc --noEmit` to verify current TypeScript status
- [ ] If errors found, document and prioritize
- [ ] Create issues for any critical type errors

**Last Verified**: Jan 16, 2026
**Status**: ✅ All known issues from previous session resolved

### Previously Resolved (in v1.18.0)
- [x] **hooks/index.ts**: Created barrel file to resolve module not found errors in views.
- [x] **useImportExport.ts**: Fixed `AxiosResponse` type mismatch.
- [x] **ProtectedRoute.tsx**: Fixed unused variable warnings.
- [x] **Backend Tests**: Added `admin_headers` fixture to `backend/tests/conftest.py`.
- [x] **README.md**: Updated version references to 1.18.0.
- [x] **Translation Integrity**: Fixed policy enforcement in COMMIT_READY.ps1.
- [x] **Websocket Tests**: Fixed deprecation warnings in backend/websocket_config.py.
- [x] **RBAC Schema Exports**: Added missing BulkAssignRolesRequest, BulkGrantPermissionsRequest.
- [x] **Database Setup**: Fixed table creation issues in test environment.

## Next Actions

1. **Verify Clean State**
   ```powershell
   npx tsc --noEmit  # Check TypeScript
   .\RUN_TESTS_BATCH.ps1  # Verify backend tests
   npm --prefix frontend run test  # Verify frontend tests
   ```

2. **If Issues Found**
   - Document in this file
   - Create GitHub issues
   - Prioritize based on severity

3. **For New Features**
   - Target v1.19.0 or v1.18.1
   - Update CHANGELOG.md Unreleased section
   - Follow development workflow

---

**Last Updated**: January 16, 2026
**Maintained By**: Solo Developer + AI Assistant
