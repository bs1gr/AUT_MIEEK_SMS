# Deployment Checklist $11.17.6

**Release Date:** January 22, 2026
**Version:** $11.17.6
**Focus:** Frontend Performance, Security, Resilience

## 📋 Pre-Deployment Verification

### 1. Automated Testing

- [ ] Run full regression suite:

  ```powershell
  .\frontend\tests\e2e\run-full-regression.ps1
  ```
  - [ ] Saved Search Authorization tests passed
  - [ ] Student List Virtualization tests passed
  - [ ] Performance Benchmarks passed (< 1500ms render)
  - [ ] Resilience & Security tests passed

### 2. Code Quality

- [ ] Run linting: `npm run lint` (Frontend)
- [ ] Verify no console logs in production code (checked in Batch 10)
- [ ] Verify `VERSION` file is updated to `1.17.3`

### 3. Build Verification

- [ ] Run production build: `npm run build`
- [ ] Verify build output in `dist/`
- [ ] Check bundle size (optional but recommended)

## 🚀 Deployment Steps

### 1. Backend Deployment

*Note: This release includes backend changes for Saved Search authorization.*
- [ ] Deploy updated backend code.
- [ ] Restart backend service.
- [ ] Verify API health endpoint: `/health`

### 2. Frontend Deployment

- [ ] Deploy contents of `frontend/dist/` to static file server or backend static folder.
- [ ] Clear CDN cache (if applicable).

## 🔍 Post-Deployment Verification

### 1. Performance Checks

- [ ] **Student List**: Navigate to Students page. Verify list loads instantly. Scroll down to verify virtualization (DOM nodes should remain constant).
- [ ] **Navigation**: Navigate between Dashboard and Students. Verify Skeleton loaders appear briefly.

### 2. Security Checks

- [ ] **CSRF**: Verify `X-CSRF-TOKEN` header is present in network requests (e.g., POST /students).
- [ ] **Saved Searches**:
  - Login as User A, create a saved search.
  - Login as User B, verify User A's search is NOT visible.
- [ ] **Rate Limiting**:
  - Open "Add Student" modal.
  - Click "Save" multiple times rapidly.
  - Verify only one request is sent and button disables.

### 3. Resilience Checks

- [ ] **Error Recovery**:
  - Temporarily block network request (DevTools).
  - Verify "Try Again" button appears on Students list.
  - Unblock network and click "Try Again". Verify recovery.

## 🔄 Rollback Plan

If critical issues are found:
1. Revert frontend build to previous version (`$11.18.0`).
2. Revert backend code if database schema issues arise (none expected for this release).
3. Flush caches.

