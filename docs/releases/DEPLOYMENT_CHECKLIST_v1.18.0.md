# Deployment Checklist $11.18.0

**Release Date:** January 22, 2026
**Version:** $11.18.0
**Focus:** PWA, Offline Support, Mobile UX

## 📋 Pre-Deployment Verification

### 1. Automated Testing
- [ ] Run PWA audit:
  ```powershell
  .\frontend\tests\e2e\run-pwa-audit.ps1
  ```
  - [ ] Manifest validation passed
  - [ ] Service Worker registration passed
  - [ ] Install prompt trigger passed
  - [ ] Mobile optimizations passed

### 2. Build Verification
- [ ] Run production build: `npm run build`
- [ ] Verify `dist/manifest.json` exists
- [ ] Verify `dist/sw.js` (or similar service worker file) exists
- [ ] Verify icons in `dist/`

## 🚀 Deployment Steps

### 1. Backend Deployment
- [ ] Deploy updated backend code (no schema changes).
- [ ] Restart backend service.

### 2. Frontend Deployment
- [ ] Deploy contents of `frontend/dist/` to static file server.
- [ ] Ensure web server serves `sw.js` with `Cache-Control: no-cache` or short max-age.

## 🔍 Post-Deployment Verification

### 1. PWA Checks
- [ ] Open app in new private window.
- [ ] Verify "Install App" icon/prompt appears.
- [ ] Verify "App ready to work offline" toast appears (if configured).

### 2. Offline Check
- [ ] Go offline (Airplane mode or DevTools).
- [ ] Refresh page.
- [ ] App should load.
- [ ] Navigate to Students list (should show cached data).
