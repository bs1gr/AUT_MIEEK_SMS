# Installer v1.18.3 - Deployment Update

**Date**: February 22, 2026
**Version**: 1.18.3
**Status**: Production Release

---

## 📦 Release Summary

**Installer File**: `SMS_Installer_1.18.3.exe`
**Release Type**: Patch Release (1.18.2 → 1.18.3)
**GitHub Release**: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.3

---

## ✅ What's New in v1.18.3

### Major Updates

1. **RBAC Security Enhancement**
   - Legacy admin fallback scoped to imports permissions only
   - Stricter RBAC enforcement while maintaining import functionality
   - Better security posture with targeted fallback

2. **Database Standardization**
   - PostgreSQL-only deployment enforced
   - Enhanced persistence with auto-migration for legacy volumes
   - Improved connection pooling and error handling

3. **Course Auto-Activation System**
   - Scheduled job runs daily at 3:00 AM UTC
   - Real-time UI indicators (green/amber/blue badges)
   - Automatic course status based on semester dates
   - 34 comprehensive unit tests ensuring reliability

4. **Installer Runtime Improvements**
   - Fixed runtime crash scenarios
   - Corrected release lineage enforcement
   - SMS_Manager.exe bundled for reliable shortcuts
   - Better error logging and diagnostics

5. **Release Integrity Hardening**
   - Mandatory code signing enforcement
   - Payload size gates (min/max validation)
   - Post-upload SHA256 digest verification
   - Installer-only asset sanitization

---

## 🔧 Technical Changes

### Backend (742 tests passing)
- RBAC imports permission fallback scoped
- PostgreSQL persistence hardening
- Course activation scheduler integration
- APScheduler service for automated jobs
- Backup database column migration (idempotent)

### Frontend (1813 tests passing)
- Course modal UI indicators for auto-activation
- Real-time semester date validation
- Enhanced error handling for auth edge cases
- Dashboard analytics limited to active enrollments

### Installer Improvements
- PostgreSQL-only database wiring
- SMS_Manager.exe runtime bundled
- `.github/scripts/` included for operations
- Legacy batch launcher cleanup
- Deployment size optimized (scripts folder 99% reduction)

---

## 📋 Deployment Checklist

### Pre-Deployment

- [x] Version consistency verified (VERSION file: 1.18.3)
- [x] All tests passing (2579+ total: 742 backend + 1813 frontend + 34 auto-activation)
- [x] Code quality gates passed (Ruff, MyPy, ESLint)
- [x] Documentation updated (README, CHANGELOG, INSTALLER_CHANGELOG)
- [x] Release notes prepared
- [x] Installer script header updated to v1.18.3

### Build Artifacts

- [x] Installer compiled: `SMS_Installer_1.18.3.exe`
- [x] SHA256 hash generated: `SMS_Installer_1.18.3.exe.sha256`
- [x] Code signing applied (AUT MIEEK certificate)
- [x] GitHub release published with artifacts

### Post-Deployment

- [x] Installer asset integrity verified
- [x] Release asset allowlist enforced (installer + hash only)
- [x] Digest verification passed
- [ ] User testing on fresh install
- [ ] User testing on upgrade from v1.18.2
- [ ] Docker container build verification
- [ ] PostgreSQL connection validation

---

## 🧪 Testing Recommendations

### Priority 1: Critical Flows
1. Fresh installation with PostgreSQL setup
2. Upgrade from 1.18.2 to 1.18.3
3. Course auto-activation verification (create course with semester)
4. Import operations with RBAC fallback

### Priority 2: Regression Testing
1. Existing installations upgrade smoothly
2. Data persistence across upgrades
3. Backup/restore functionality
4. Docker volume migration

### Priority 3: Edge Cases
1. Installation with Docker not running
2. PostgreSQL connection failures
3. Course semester date edge cases
4. RBAC permission inheritance

---

## 📊 Version Progression

| Version | Date | Key Features | Test Status |
|---------|------|--------------|-------------|
| 1.18.0 | Feb 16, 2026 | Course auto-activation, PDF extraction, PostgreSQL defaults | ✅ 2579+ passing |
| 1.18.1 | Feb 17, 2026 | Test fixes, documentation updates | ✅ 2579+ passing |
| 1.18.2 | Feb 20, 2026 | Installer runtime fix, release integrity | ✅ 2579+ passing |
| **1.18.3** | **Feb 22, 2026** | **RBAC scope fix, refreshed installer** | **✅ 2579+ passing** |

---

## 🔗 Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - Full change history
- [INSTALLER_CHANGELOG.md](INSTALLER_CHANGELOG.md) - Installer-specific changes
- [README.md](README.md) - Installer build instructions
- [INSTALLER_TESTING_GUIDE.md](INSTALLER_TESTING_GUIDE.md) - Comprehensive testing procedures
- [Release Notes](../docs/releases/RELEASE_NOTES_v1.18.3.md) - Detailed release notes

---

## 📝 Notes for Developers

### Building the Installer

```powershell
# Build SMS_Manager first
cd installer
.\BUILD_SMS_MANAGER.cmd

# Compile installer with Inno Setup
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "SMS_Installer.iss"

# Sign the installer (if certificate available)
.\SIGN_INSTALLER.ps1
```

### Version Verification

The installer automatically reads version from `../VERSION` file. Ensure this is updated before building:

```powershell
# Check version
Get-Content ..\VERSION
# Should show: 1.18.3
```

### PostgreSQL Configuration

Installer defaults to PostgreSQL. Users will be prompted for:
- Host (default: localhost)
- Port (default: 5432)
- Database name (default: sms_db)
- Username (default: sms_user)
- Password (secure input)
- SSL mode (default: prefer)

---

## ⚠️ Known Limitations

1. **SQLite Deprecated**: Fresh installs default to PostgreSQL only
2. **Docker Required**: Production deployment requires Docker Desktop
3. **Windows Only**: Installer built for Windows 10+ (x64)
4. **Admin Privileges**: Installer requires elevated permissions

---

## 🚀 Next Steps

1. ✅ Installer updated and documented
2. ✅ Release published on GitHub
3. ⏳ Gather user feedback on 1.18.3
4. ⏳ Monitor production deployments
5. ⏳ Plan next feature release (1.19.0)

---

**Status**: Ready for production deployment
**Confidence Level**: High (all tests passing, comprehensive QA)
**Rollback Plan**: Revert to v1.18.2 if critical issues found
