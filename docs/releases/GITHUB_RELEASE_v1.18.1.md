# $11.18.1 - Test Fixes & Documentation Updates

## 🐛 Bug Fixes

This patch release addresses test failures and documentation gaps from the $11.18.1 auto-activation enhancement:

- **5 test failures fixed** in course modal components (`AddCourseModal.test.tsx`, `EditCourseModal.test.tsx`)
- **Test suite restoration**: Frontend tests now 100% passing (1854/1854)
- **Documentation updates**: $11.18.1 release notes enhanced with auto-activation details

## 🔧 What Was Fixed

### Course Modal Test Failures
The $11.18.1 auto-activation enhancement changed the UI structure for semester year inputs, causing test selector mismatches:

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

No changes to deployment or installation procedures. This is a drop-in replacement for $11.18.1.

## 🔄 Upgrade Instructions

### From $11.18.1
No special steps required - $11.18.1 is fully compatible:

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

- **Parent release**: [$11.18.1](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$11.18.1)
- **Auto-activation feature**: Implemented in $11.18.1 with 4 commits

---

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/$11.18.1...$11.18.1

