# Release Notes 1.14.2

**Release Date**: December 30, 2025
**Version**: 1.14.2
**Status**: ✅ Stable

---

## 🎯 Executive Summary

This release fixes critical issues in the **Rate Limiting Configuration Panel**, addressing translation errors, authentication header propagation, and role-based access control. The panel now loads reliably for administrators without showing errors to non-admin users.

**Quality Metrics**: ✅ All checks passed (linting, types, tests, translations)

---

## 🐛 Bugs Fixed

### 1. **Translation Key Error in Rate Limits Panel**

- **Issue**: "key 'controlPanel.rateLimits (en)' returned an object instead of string"
- **Root Cause**: Incomplete translation paths using `t('rateLimits.x')` instead of proper nested path
- **Files Changed**:
  - `frontend/src/components/ControlPanel/RateLimitAdjuster.tsx` (5 instances)
  - `frontend/src/locales/en/controlPanel.js`
  - `frontend/src/locales/el/controlPanel.js`
- **Solution**: Updated all references to use `t('controlPanel.rateLimits.x')`
- **Impact**: ✅ Rate Limits panel now displays correctly in both EN/EL

### 2. **HTTP 500 Error - JSON Serialization Failure**

- **Issue**: "Object of type function is not JSON serializable" on rate limit API calls
- **Root Cause**: FastAPI endpoints missing `Depends()` wrapper on dependency injection
- **Files Changed**:
  - `backend/routers/control/rate_limits.py` (4 endpoints)
  - `backend/error_handlers.py` (enhanced safety)
- **Solution**: Wrapped all `optional_require_role()` calls with `Depends()`
- **Impact**: ✅ API endpoints now return proper JSON responses

### 3. **Missing Authentication Headers**

- **Issue**: Frontend rate limit requests failing due to missing Authorization header
- **Root Cause**: Direct `fetch()` calls not using axios interceptor
- **Files Changed**:
  - `frontend/src/components/ControlPanel/RateLimitAdjuster.tsx` (3 methods)
- **Solution**: Added `attachAuthHeader()` to all fetch requests
- **Impact**: ✅ Authenticated requests now properly include JWT tokens

### 4. **HTTP 403 Error Visible to Non-Admin Users**

- **Issue**: Non-admin users seeing "Failed to load settings: 403" error message
- **Root Cause**: Rate Limits tab visible but protected at API level
- **Files Changed**:
  - `frontend/src/components/ControlPanel.tsx` (conditional rendering)
- **Solution**: Hide tab completely from non-admin users using role-based visibility
- **Impact**: ✅ Non-admins no longer see broken UI or error messages

---

## ✨ Enhancements

### Enhanced Error Handling

- **File**: `backend/error_handlers.py`
- **Improvement**: Better handling of non-serializable objects (functions, exceptions)
- **Benefit**: Prevents cascading JSON serialization errors

### Improved Rate Limit UI

- **File**: `frontend/src/components/ControlPanel/RateLimitAdjuster.tsx`
- **Improvement**: Clearer connection between API calls and user actions
- **Benefit**: Better visibility into rate limit adjustments

---

## 📊 Test Results

| Component | Status | Details |
|-----------|--------|---------|
| **Backend Tests** | ✅ PASS | All pytest suites passed |
| **Frontend Tests** | ✅ PASS | All vitest suites passed |
| **Linting (Ruff)** | ✅ PASS | 0 issues |
| **Type Checking (MyPy)** | ✅ PASS | 0 issues |
| **Linting (ESLint)** | ✅ PASS | 0 issues |
| **TypeScript Compilation** | ✅ PASS | 0 errors |
| **Translation Integrity** | ✅ PASS | EN/EL parity verified |
| **Pre-commit Hooks** | ✅ PASS | All checks passed |
| **Docker Build** | ✅ PASS | Image: `sms-fullstack:1.14.2` |

**Quality Duration**: 152.3 seconds (quick mode)

---

## 📁 Files Changed

### Backend (3 files)

```text
backend/routers/control/rate_limits.py       +42, -12
backend/error_handlers.py                     +8, -2
DOCKER.ps1                                    +2, -2

```text
### Frontend (4 files)

```text
frontend/src/components/ControlPanel.tsx                      +5, -3
frontend/src/components/ControlPanel/RateLimitAdjuster.tsx   +12, -8
frontend/src/locales/en/controlPanel.js                      +1, -1
frontend/src/locales/el/controlPanel.js                      +1, -1

```text
### Configuration & Documentation (4 files)

```text
CHANGELOG.md                                  +64, -0
frontend/src/index.css                        +2, -2
docs/releases/RELEASE_NOTES_$11.15.2.md       +3, -3
.github/docker_manager.bat                    +15, -5

```text
### Installation (2 files)

```text
SMS_Installer.iss                             +2, -2
installer/run_docker_install.cmd              +1, -1

```text
**Summary**: 13 files changed, ~160 insertions, ~45 deletions

---

## 🚀 Deployment Guide

### Docker Deployment

```powershell
.\DOCKER.ps1 -Start
# Application available at http://localhost:8080

```text
### Native Development

```powershell
.\NATIVE.ps1 -Start
# Backend: http://localhost:8000 (API)

# Frontend: http://localhost:5173 (Dev server)

```text
### Verification

1. Login as admin user
2. Navigate to `/power` → Advanced Settings
3. Click **Rate Limits** tab (now visible to admins only)
4. Verify settings load without errors
5. Test with non-admin account → tab should be hidden

---

## 🔐 Security

- ✅ Role-based access control enforced (admin-only)
- ✅ Authentication headers properly propagated
- ✅ Error messages don't leak sensitive data
- ✅ All validation checks passing

---

## 📚 Documentation Updates

- ✅ [CHANGELOG.md](../../CHANGELOG.md) - Updated with 1.14.2 fixes
- ✅ [COPILOT_INSTRUCTIONS.md](.github/copilot-instructions.md) - Rate limiting patterns documented
- ✅ [API Documentation](../../CONTROL_API.md) - Already covers rate limits

---

## 🔄 Migration Notes

**No database migrations required** - this is a pure code fix release.

**For existing deployments**:

```bash
# Docker: Just restart

.\DOCKER.ps1 -Update

# Native: Pull latest and restart

.\NATIVE.ps1 -Stop
git pull origin main
.\NATIVE.ps1 -Start

```text
---

## 🧪 Known Issues & Limitations

None identified. All reported issues resolved.

---

## 💡 Lessons Learned

1. **FastAPI Dependency Injection**: Always wrap dependency functions with `Depends()` in endpoint parameters
2. **Translation Key Hierarchy**: Use complete paths matching the translation object structure
3. **Frontend Auth**: Centralize authentication logic (use interceptors, not direct fetch)
4. **UI/API Parity**: Hide UI elements that users can't access instead of showing error states

---

## 🙏 Contributors

- **AI Copilot**: Implementation and testing
- **Code Quality**: COMMIT_READY.ps1 validation
- **QA**: Docker integration testing

---

## 📞 Support

For issues or questions:
1. Check `docs/DOCUMENTATION_INDEX.md` for documentation
2. Review `CHANGELOG.md` for previous fixes
3. Check Docker logs: `docker logs sms-app`

---

**Next Steps**: Consider this version for production deployment. All quality gates passed.

---

*Generated: 2025-12-30 19:15:00*
*Version Status: Release-Ready ✅*

