# Pending Fixes

## Frontend TypeScript Errors

### Critical
- [ ] **App.tsx**: Fix missing module imports.
  - `Cannot find module './pages/LoginPage'`
  - `Cannot find module './pages/admin/AdminDashboardPage'`
  - *Action*: Verify file locations and update import paths.

- [ ] **ImportExportPage.tsx**: Fix missing module `../components/import-export`.
  - *Action*: Check if `index.ts` exists in `components/import-export` or import specific components.

- [ ] **main.tsx**: Fix IntrinsicAttributes error.
  - `Type '{ children: Element; }' has no properties in common with type 'IntrinsicAttributes'`
  - *Action*: Check `AuthProvider` or the wrapping component definitions.

### Resolved (in this batch)
- [x] **hooks/index.ts**: Created barrel file to resolve module not found errors in views.
- [x] **useImportExport.ts**: Fixed `AxiosResponse` type mismatch.
- [x] **ProtectedRoute.tsx**: Fixed unused variable warnings.
- [x] **Backend Tests**: Added `admin_headers` fixture to `backend/tests/conftest.py`.
- [x] **README.md**: Updated version references to 1.18.0.
- [x] **Translation Integrity**: Fixed policy enforcement in COMMIT_READY.ps1.
- [x] **Websocket Tests**: Fixed deprecation warnings in backend/websocket_config.py.
- [x] **useImportExport.ts**: Fixed `AxiosResponse` type mismatch (removed `.success` property access).
- [x] **ProtectedRoute.tsx**: Fixed unused variable warnings for `roles` and `permissions`.
