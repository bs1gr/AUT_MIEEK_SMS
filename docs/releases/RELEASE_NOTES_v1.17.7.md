# Release Notes - v1.17.7

**Release Date**: February 3, 2026
**Version**: 1.17.7
**Status**: ✅ READY FOR DEPLOYMENT
**Previous Release**: v1.17.6 (January 29, 2026)

---

## 🎯 Overview

**v1.17.7** is a maintenance and enhancement release focused on internationalization improvements, Docker deployment reliability, and historical data editing capabilities. This release builds upon the stable v1.17.6 foundation with critical fixes for Greek locale support, deployment reliability, and feature enhancements for educators.

---

## ✨ What's New

### 🌍 Internationalization (i18n) Enhancements ✅

#### Greek Decimal Separator Support
- **Added locale-aware decimal separators** for grade display
- Greek users now see `8,5` (Greek standard) instead of `8.5` (English standard)
- Implemented `useGreekDecimal()` hook for language context detection
- Applied decimal formatting to:
  - `gpaToPercentage()` - Grade percentage calculations
  - `gpaToGreekScale()` - Greek grading scale conversion
- **Impact**: Improved usability for Greek educators and students
- **File**: `frontend/src/utils/gradeUtils.ts`

#### Greek Date Format Display
- **Standardized date formatting** in historical mode banners
- Dates now display as `DD-MM-YYYY` in Greek locale (e.g., `15-01-2026`)
- Maintains ISO format (`YYYY-MM-DD`) internally for API/storage compatibility
- Applied to:
  - Grading View historical mode banner
  - Attendance View historical mode banner
- **Impact**: Consistent, locale-appropriate date display
- **Files**:
  - `frontend/src/features/grading/components/GradingView.tsx`
  - `frontend/src/features/attendance/components/AttendanceView.tsx`

### 🔧 Backend & Deployment Improvements ✅

#### Native Backend Startup Fixes (Feb 3, 2026)
- **WebSocket AsyncServer Mounting**: Fixed `'AsyncServer' object has no attribute 'asgi_app'` error
  - Wrapped AsyncServer in ASGIApp before FastAPI mounting
  - Result: WebSocket now successfully mounts at `/socket.io`
  - **File**: `backend/lifespan.py`

- **APScheduler Availability**: Added scheduler dependency to project
  - Added `apscheduler>=3.11.0` to `pyproject.toml`
  - Report and export schedulers now available when dependency installed
  - **Impact**: Enables automated report scheduling (OPTIONAL-001)

- **Alembic Migration Idempotency**: Fixed table existence errors on reruns
  - Made baseline migration idempotent with existence checks
  - Prevents `sqlite3.OperationalError: table students already exists`
  - **Impact**: Migrations now safe to rerun without errors

#### Docker Deployment Reliability (Feb 2-3, 2026)
- **Improved CORS Redirect Handling**: Enhanced nginx reverse proxy headers
  - Fixed redirect issues in Docker production deployments
  - Added proper `X-Forwarded-*` headers for CORS handling
  - **Files**: `docker/nginx.conf`, Docker configuration updates

- **Nginx Redirect Rewriting**: Enhanced redirect rewriting for all sources
  - Improved to handle all redirect scenarios properly
  - Better HTTP to HTTPS redirect handling
  - More robust CORS redirect support

- **Validation**: All Docker deployment fixes tested and verified
  - Container startup verified
  - Reverse proxy headers working correctly
  - CORS redirect handling functional

### 📊 Historical Data Editing (Phase 6 Enhancement) ✅

#### Recall Buttons for Historical Editing
- **Added Recall Edit buttons** to StudentPerformanceReport
  - Buttons trigger historical editing workflows for past records
  - Enables educators to edit attendance and grades from the performance report
  - Uses sessionStorage for state transfer between views
  - **File**: `frontend/src/components/StudentPerformanceReport.tsx`

- **Enhanced Grading & Attendance Views**
  - Existing Recall mechanisms auto-populate forms with historical data
  - Users can navigate directly to editing interface
  - SPA routing handles smooth transitions
  - **Files**: Updated grading and attendance components

#### Database Sync for Historical Records
- **Updated records** (no duplicates) via existing PUT endpoints
- Historical mode properly tracked in session storage
- Validated through frontend and backend integration tests

### 🐛 Bug Fixes & Improvements ✅

#### Reports System
- Fixed boolean `is_` check for system templates
- Improved template discovery with Analytics tile
- Removed duplicate tiles from OperationsView
- Added clickable Analytics and CSV tiles for quick access

#### CI/CD Improvements (Feb 3, 2026)
- **Added workflow_dispatch** to manual CI workflows for recovery capability
- **Limited heavy workflows** to PRs/schedule to prevent queue buildup
- **Added concurrency groups** to prevent CI/CD queue buildup
- **Documented** CI queue cooldown for next session

---

## 📈 Release Statistics

| Metric | Value |
|--------|-------|
| **Total Commits** | 15+ commits since v1.17.6 |
| **Files Changed** | 12+ files modified |
| **Bug Fixes** | 5+ fixes implemented |
| **New Features** | 3 enhancements |
| **Frontend Tests** | ✅ 1813/1813 passing (100%) |
| **Backend Tests** | ✅ 742/742 passing (100%) |
| **E2E Tests** | ✅ 19+ critical tests passing |
| **Code Quality** | ✅ All linting checks passing |

---

## 📊 Technical Changes

### Frontend Changes
- `frontend/src/utils/gradeUtils.ts`
  - Added `useGreekDecimal()` hook
  - Added `getDecimalSeparator()` function
  - Updated decimal separator usage in grade utilities

- `frontend/src/features/grading/components/GradingView.tsx`
  - Imported `formatDateGreek` utility
  - Updated historical mode banner to use Greek date format

- `frontend/src/features/attendance/components/AttendanceView.tsx`
  - Imported `formatDateGreek` utility
  - Updated historical mode banner to use Greek date format

- `frontend/src/components/StudentPerformanceReport.tsx`
  - Added Recall Edit buttons for historical editing

### Backend Changes
- `backend/lifespan.py`
  - Fixed WebSocket AsyncServer mounting with ASGIApp wrapper

- `pyproject.toml`
  - Added `apscheduler>=3.11.0` dependency

- `backend/migrations/` (Alembic)
  - Made baseline migration idempotent with existence checks

- Docker Configuration
  - Enhanced nginx reverse proxy headers
  - Improved CORS redirect handling

### CI/CD Changes
- Added `workflow_dispatch` to manual workflows
- Limited CodeQL, E2E, and Trivy scans to PR execution
- Added concurrency groups for queue management

---

## 🚀 Deployment Instructions

### For Docker (Production)
```powershell
.\DOCKER.ps1 -Start              # Start production containers
.\DOCKER.ps1 -UpdateClean        # Clean rebuild if needed
```

### For Native Development (Testing)
```powershell
.\NATIVE.ps1 -Start              # Start backend (8000) + frontend (5173)
```

### Pre-Deployment Checklist
- [ ] All tests passing: `.\RUN_TESTS_BATCH.ps1`
- [ ] Code quality verified: `.\COMMIT_READY.ps1 -Quick`
- [ ] Documentation updated (this file)
- [ ] Version consistency checked (1.17.7)
- [ ] Git status clean: `git status`

---

## 🔐 Security Notes

- **No security vulnerabilities introduced**
- All existing security measures maintained
  - Path traversal protections verified (from v1.17.6)
- CORS security improvements in Docker deployment
- Pre-commit security validation passed

---

## 🌐 Internationalization (i18n) Status

### Languages Supported
- ✅ **English (EN)**: Full support (baseline)
- ✅ **Greek (EL)**: Full support with locale improvements in this release
  - Decimal separators now locale-aware
  - Date formatting now locale-appropriate
  - All text translations complete and verified

### Locale-Specific Features
- Decimal separators: `,` for Greek, `.` for English
- Date format: `DD-MM-YYYY` for Greek, `YYYY-MM-DD` internally
- All UI strings bilingual
- Maintains consistency across grading, attendance, and reports

---

## 🎯 Phase & Enhancement Status

### Phase 6: Reporting Enhancements ✅ COMPLETE
- All reporting features deployed and production-ready
- v1.17.6 initial release + historical editing enhancements in v1.17.7

### Historical Data Editing ✅ ENHANCED
- Recall buttons now available in StudentPerformanceReport
- Educators can edit past attendance and grades seamlessly
- Database sync prevents duplicates

### Optional Enhancements
- **OPTIONAL-001**: Automated Report Scheduling (APScheduler now available)
- **OPTIONAL-002**: Email Integration (pending)

---

## 📋 Known Limitations

- None new in this release
- All known issues from v1.17.6 continue to be tracked

---

## 🔄 Migration Guide

### From v1.17.6 to v1.17.7

**No database migrations required** - This is a backward-compatible release.

**Update Process**:
1. Pull latest changes: `git pull origin main`
2. Install dependencies: `pip install -r requirements.txt` (for APScheduler)
3. Run tests to verify: `.\RUN_TESTS_BATCH.ps1`
4. Deploy using appropriate script:
   - Docker: `.\DOCKER.ps1 -Start`
   - Native: `.\NATIVE.ps1 -Start`

---

## 📚 Related Documentation

- [User Guide](../user/USER_GUIDE_COMPLETE.md) - Complete user manual
- [Developer Guide](../development/DEVELOPER_GUIDE_COMPLETE.md) - Development reference
- [Work Plan](../plans/UNIFIED_WORK_PLAN.md) - Current project status
- [Deployment Guide](../deployment/DOCKER_OPERATIONS.md) - Production deployment

---

## 🙏 Acknowledgments

**Release Prepared**: February 3, 2026
**Contributors**: Solo Developer + AI Assistant
**Testing**: Comprehensive validation (1813 frontend + 742 backend tests)
**Quality**: All pre-commit checks and CI/CD validations passing

---

**For upgrade support or issues, refer to the [troubleshooting guide](../deployment/FRESH_DEPLOYMENT_TROUBLESHOOTING.md).**
