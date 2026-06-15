# v1.18.3 - Test Fixes & Documentation Updates

## 🐛 Bug Fixes

This patch release addresses test failures and documentation gaps from the v1.18.3 auto-activation enhancement:

- **5 test failures fixed** in course modal components (`AddCourseModal.test.tsx`, `EditCourseModal.test.tsx`)
- **Test suite restoration**: Frontend tests now 100% passing (1854/1854)
- **Documentation updates**: v1.18.3 release notes enhanced with auto-activation details

## 🔧 What Was Fixed

### Course Modal Test Failures
The v1.18.3 auto-activation enhancement changed the UI structure for semester year inputs, causing test selector mismatches:

**Before**: Tests used `input[name="year"]` selectors expecting `type="number"` inputs
**After**: Tests now use `[data-testid="semester-year-input"]` expecting `type="text"` inputs

All 5 failing tests across both course modal components are now passing.

### Updated Tests
- ✅ `AddCourseModal > renders credits and year fields with default values`
- ✅ `AddCourseModal > has proper input types for numeric fields`
- ✅ `EditCourseModal > extracts year from semester string`
- ✅ `EditCourseModal > has proper input types for numeric fields`
- ✅ `EditCourseModal > handles semester without year`

## ✅ Validation

- **Backend**: 742/742 tests passing (33 batches, 100%)
- **Frontend**: 1854/1854 tests passing (101 files, 100%)
- **Auto-activation**: 34/34 comprehensive unit tests passing

## 📦 Installation

No changes to deployment or installation procedures. This is a drop-in replacement for v1.18.3.

## 🪟 Windows Installer Verification

- Installer: `SMS_Installer_1.18.1.exe`
- Size: `114 MB`
- SHA256: `92A826E2DD76DB12617B66DA890810AF59E7993AC537C4A7E29961FF6A1E54DD`
- Signature: `Valid (Authenticode)`
- Publisher: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`

## 🔄 Upgrade Instructions

### From v1.18.3
No special steps required - v1.18.3 is fully compatible:

```powershell
# Docker mode (production)
.\DOCKER.ps1 -Stop
git pull origin main
.\DOCKER.ps1 -Start

# Native mode (development)
.\NATIVE.ps1 -Stop
git pull origin main
.\NATIVE.ps1 -Start
```

## 🔗 Related

- **Parent release**: [v1.18.3](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.3)
- **Auto-activation feature**: Implemented in v1.18.3 with 4 commits

---

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.3...v1.18.3
