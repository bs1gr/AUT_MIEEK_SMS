# Archive: Obsolete SMS Lite Editions

**Date Created:** June 3, 2026  
**Status:** OBSOLETE - Do not use

This archive contains deprecated versions of SMS Lite Edition that have been superseded by SMS_Lite.exe v1.18.24.

## Archived Items

### 1. SMS_Native_Lite_Edition_OBSOLETE_*.zip (70.16 MB)
- **What:** Original PyWebView-based Lite Edition implementation
- **Status:** Completely obsolete
- **Why archived:** Replaced by headless FastAPI version (SMS_Lite.exe)
- **Contains:** Full source code, PyInstaller specs, and executables for old PyWebView implementation

### 2. SMS_Native_Lite_Simple.exe (68.56 MB) - MULTIPLE COPIES
- **What:** Old executable with wrong naming
- **Status:** Obsolete - caused naming confusion
- **Why archived:** 
  - Was built as `SMS_Native_Lite_Simple.exe` instead of `SMS_Lite.exe`
  - Caused installation conflicts (couldn't overwrite old versions)
  - Led to version mismatch issues (v1.18.23 vs v1.18.24)
- **Replaced by:** `SMS_Lite.exe` (correct name, v1.18.24)

### 3. SMS_Native_Lite.exe (577.34 MB)
- **What:** Large executable from earlier development
- **Status:** Obsolete
- **Why archived:** Superseded by SMS_Lite.exe

## Current Production Version

**SMS_Lite.exe v1.18.24** is the current and correct version:
- ✅ Correct naming (SMS_Lite, not SMS_Native_Lite_Simple)
- ✅ Latest code version (v1.18.24)
- ✅ QNAP PostgreSQL support
- ✅ File selection for credentials (.json/.env)
- ✅ Proper installation and overwrite behavior

**Location:** `dist\SMS_Lite.exe` (68.56 MB)

**Installer:** `dist\SMS_Installer_1.18.24.exe` (92.95 MB)

## Do Not Use These Archived Versions

These archived versions are kept only for historical reference. **Always use SMS_Lite.exe v1.18.24** from the current installer.

### Why these were archived:
1. **Naming inconsistency** - Led to installation conflicts
2. **Version mismatch** - Old v1.18.23 exe remained installed
3. **QNAP configuration** - Not properly implemented in old versions
4. **No file selection** - Required manual credential entry

## Future Maintenance

If additional obsolete versions need to be archived:
1. Create a new timestamped folder: `archive/obsolete_lite_editions/`
2. Compress with descriptive names including dates
3. Update this README with details
4. Keep archives for 6-12 months, then delete

---

**Archive Created By:** Claude Code  
**Date:** 2026-06-03  
**Purpose:** Clean up obsolete versions to avoid confusion
