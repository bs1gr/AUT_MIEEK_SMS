# Installer Documentation Parameter Audit - v1.18.3

**Date**: February 22, 2026
**Current Version**: 1.18.3
**Purpose**: Comprehensive audit of all parameters and version references in installer documentation

---

## ✅ Files Already Updated to v1.18.3

### Core Installer Files
1. **SMS_Installer.iss** - Header version: 1.18.3 ✅
2. **README.md** - Main version reference: v1.18.3 ✅
3. **INSTALLER_CHANGELOG.md** - Added v1.18.3, v1.18.2, v1.18.0-1.18.1 sections ✅
4. **INSTALLER_v1.18.3_DEPLOYMENT_UPDATE.md** - New deployment doc for v1.18.3 ✅
5. **INSTALLER_TESTING_GUIDE.md** - All scenarios updated to v1.18.3 ✅

---

## 📊 Key System Parameters (Current Values as of v1.18.3)

### Test Suite Statistics
- **Total Tests**: 2579+ tests
  - Backend: 742 tests (31+ batches)
  - Frontend: 1813 tests (99 test files)
  - Auto-Activation: 34 tests
- **Test Batch Size**: Default 5 files per batch
- **Test Success Rate**: 100% (all tests passing)

### System Requirements
- **OS**: Windows 10/11 (64-bit)
- **Docker**: Docker Desktop required (mandatory)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: ~500MB for application + Docker images
- **Installer Size**: ~119 MB (v1.18.3), was ~9.39 MB (v1.15.1)
- **SMS_Manager.exe Size**: 28.51 MB (self-contained .NET 5.0)

### Port Configuration
- **Production Port**: 8080 (Docker mode)
- **Development Ports**:
  - Backend: 8000
  - Frontend: 5173 (Vite dev server)
- **PostgreSQL Port**: 5432 (internal container)

### Database Configuration
- **Primary**: PostgreSQL (mandatory from v1.18.1+)
- **Deprecated**: SQLite (no longer supported for fresh installs)
- **Environment Variables**:
  - `DATABASE_ENGINE=postgresql`
  - `DATABASE_URL=postgresql://user:pass@host:port/db`
  - `POSTGRES_HOST=sms-postgres`
  - `POSTGRES_PORT=5432`
  - `POSTGRES_DB=sms`
  - `POSTGRES_USER=sms_user`
  - `POSTGRES_PASSWORD=<secure>`

### Docker Configuration
- **Container Names**:
  - Main: `sms-app`
  - Database: `sms-postgres`
- **Image Name**: `sms-fullstack` (version-tagged)
- **Compose Command**: `docker compose up -d`
- **Legacy Images Removed**: 1.12.3, 1.17.6, 1.17.7

### Course Auto-Activation (NEW in v1.18.0)
- **Scheduler**: Daily at 3:00 AM UTC
- **UI Indicators**: Green/Amber/Blue badges
- **Test Coverage**: 34 comprehensive unit tests

### RBAC Configuration (v1.18.3)
- **Legacy Admin Fallback**: Scoped to `imports:*` permissions only
- **Auth Modes**: `disabled`, `permissive`, `strict`
- **Default Mode**: `permissive`

### Release Integrity (v1.18.2+)
- **Code Signing**: AUT MIEEK self-signed certificate (mandatory)
- **Certificate Validity**: November 27, 2025 - November 27, 2028
- **Payload Validation**: Minimum size gates enforced
- **Hash Algorithm**: SHA256
- **Release Assets**: Installer + `.sha256` sidecar only

---

## 📂 Historical Version References (Archive Files - Do Not Update)

### Files Containing Historical Version Numbers (Preserved as Documentation)

#### VALIDATION_TEST_PLAN_JAN9.md
- Version: v1.14.2 (historical validation document from January 9, 2026)
- Expected Version: 1.15.1
- Purpose: Documents version mismatch issue that was resolved
- **Status**: Archive document - DO NOT UPDATE

#### VALIDATION_COMPLETE_JAN9.md
- Old Version: v1.14.2
- New Version: v1.15.1
- Purpose: Documents successful rebuild to v1.15.1
- **Status**: Archive document - DO NOT UPDATE

#### SMS_MANAGER_IMPLEMENTATION_SUMMARY.md
- Date: February 14, 2026
- References version 1.17.8 (hypothetical future version examples)
- Example upgrade scenarios: 1.17.7 → 1.17.8
- **Status**: Implementation documentation - version examples are illustrative
- **Decision**: LEAVE AS-IS (examples, not current version references)

#### SESSION_COMPLETION_REPORT.md
- Date: February 14, 2026
- References version 1.17.8 (hypothetical examples)
- **Status**: Session report - version examples are illustrative
- **Decision**: LEAVE AS-IS (examples, not current version references)

#### MANUAL_CLEANUP_GUIDE.md
- Date: February 3, 2026
- Issue: Old files from upgrade to v1.17.7
- Cleanup for versions: 1.12.3, 1.17.6, 1.17.7
- **Status**: Historical troubleshooting guide
- **Decision**: LEAVE AS-IS (documents specific historical issue)

#### INSTALLER_v1.17.7_DEPLOYMENT_UPDATE.md
- Version-specific deployment documentation
- **Status**: Historical deployment documentation
- **Decision**: LEAVE AS-IS (version-specific archive)

---

## 🔍 Old Version References in SMS_Installer.iss (Intentional)

These old version references in the main installer script are **INTENTIONAL** for cleanup/upgrade logic:

### Line 551-555: Legacy Uninstaller Cleanup
```pascal
Patterns[3] := BasePath + '\unins1.12.3.exe';
Patterns[4] := BasePath + '\unins1.12.3.dat';
Patterns[5] := BasePath + '\unins1.17.6.exe';
Patterns[6] := BasePath + '\unins1.17.6.dat';
Patterns[7] := BasePath + '\unins1.17.7.exe';
```
**Purpose**: Remove old uninstaller files during upgrade
**Status**: KEEP (necessary for upgrade from old versions)

### Line 584-585: Legacy Docker Image Cleanup
```pascal
Exec('cmd', '/c docker rmi sms-fullstack:1.12.3 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
Exec('cmd', '/c docker rmi sms-fullstack:1.17.6 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
```
**Purpose**: Remove old Docker images to save disk space
**Status**: KEEP (necessary for cleanup from old installations)

### Line 783: External PostgreSQL Note
```pascal
// External PostgreSQL page removed in v1.18.1 integrity sweep.
```
**Purpose**: Documents when external PostgreSQL UI was removed
**Status**: KEEP (historical comment for maintainability)

### Line 1303: Upgrade Environment File Handling
```pascal
Log('  Action: New .env files from v1.17.7 installation will be used');
```
**Purpose**: Log message for debugging upgrade scenarios
**Status**: CONSIDER UPDATING to v1.18.x for accuracy

---

## 📋 README.md - Outdated Examples (Updated)

### Section: "Important Notes" (Previously Outdated)
- Lines 160-210 had outdated version references
- **Status**: ✅ Updated to v1.18.3 examples (Feb 22, 2026)
- **Note**: Previous references to invalid versions removed (some referenced versions never existed)

### Historical Context

The project's actual version history:
- 1.14.0 → 1.14.1 → 1.14.3 → 1.15.0 → 1.15.1 → 1.17.1+ → 1.18.0+
- **No 1.9.x or 1.16.x versions exist in this project**

### Section: File Size References
- Line 62: "30,528,817 bytes (30.5 MB)" - old installer size
- Line 71: "29.11 MB → 9.39 MB" - v1.15.1 size reduction
- Current v1.18.3 size: ~119 MB
- **Decision**: Should add v1.18.3 size note

---

## 🎯 Parameters That Changed in Recent Versions

### v1.18.3 (Current)
- RBAC: Legacy admin fallback scoped to `imports:*` only
- Release lineage: Corrected with installer refresh
- Installer size: 119,232,344 bytes

### v1.18.2 (February 19, 2026)
- Installer runtime crash fix
- SMS_Manager.exe bundled properly
- Release integrity hardening (signing + payload gates)

### v1.18.0-1.18.1 (February 17, 2026)
- **Course Auto-Activation**: Scheduler (3:00 AM UTC), UI badges
- **PostgreSQL Standardization**: SQLite deprecated
- **Database Migration**: Hardened migration helper
- **String Function Fix**: StringReplaceAll custom implementation
- **Scripts Optimization**: 99% size reduction (only backup-database.sh)
- **External PostgreSQL UI**: Removed (v1.18.1 integrity sweep)

### v1.17.7 (February 3, 2026)
- Installer upgrade fixes (parallel installations resolved)
- Robust detection and legacy handling
- Docker resource cleanup

### v1.15.1 (January 9, 2026)
- Installer size reduction: 29.11 MB → 9.39 MB
- Phase 1 improvements included

---

## 🔧 Recommended Updates

### High Priority
1. **README.md**: Update outdated version references to v1.18.3 examples
   - **Status**: ✅ COMPLETED (Feb 22, 2026)
2. **SMS_Installer.iss Line 1303**: Update `.env files from v1.17.7` log message
   - **Status**: ✅ COMPLETED (Feb 22, 2026)

### Medium Priority
3. **README.md**: Add v1.18.3 installer size note (119 MB)
   - **Status**: ✅ COMPLETED (Feb 22, 2026)
4. **README.md**: Update upgrade scenario examples to current versions
   - **Status**: ✅ COMPLETED (Feb 22, 2026)

### Low Priority (Optional)
5. Consider adding v1.18.3 specific testing checklist
6. Document SMS_Manager.exe size (28.51 MB) impact on installer size
7. Update Docker Desktop requirements (version compatibility notes)

---

## 📝 Configuration Files Excluded (Not in Installer Directory)

These configuration files are outside the installer directory but contain version-related parameters:

- `VERSION` file (root) - Source of truth for version number
- `frontend/package.json` - Frontend version field
- `CHANGELOG.md` - Complete version history
- `docs/plans/UNIFIED_WORK_PLAN.md` - Current version tracking

**Status**: Already updated by previous documentation update efforts

---

## ✅ Verification Checklist

- [x] Core installer files updated to v1.18.3
- [x] Testing guide scenarios updated
- [x] Deployment documentation created for v1.18.3
- [x] Historical documents identified and preserved
- [x] Intentional old version references documented
- [x] README.md outdated version references corrected (invalid v1.9.7 removed)
- [x] SMS_Installer.iss log message updated to version-agnostic
- [x] Installer size notes added (119 MB breakdown)

---

## 🎯 Summary

**Total Files Updated**: 5 core files
**Historical Files Preserved**: 6 archive documents
**Intentional Old References**: 8 locations in SMS_Installer.iss (cleanup logic)
**Recommended Updates**: 2-4 additional refinements

**Overall Status**: ✅ Core documentation aligned with v1.18.3
**Remaining Work**: Minor refinements to README.md examples and log messages

**Last Audit**: February 22, 2026 by AI Agent
