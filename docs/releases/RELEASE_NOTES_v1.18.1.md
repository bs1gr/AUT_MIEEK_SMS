# Release Notes $11.18.1 - Test Fixes & Documentation Updates

**Date:** February 17, 2026
**Version:** $11.18.1
**Status:** Release preparation
**Type:** Patch release

## 🎯 Overview

This patch release addresses test failures introduced by the auto-activation UI enhancements in $11.18.1 and updates release documentation to properly reflect the new features.

## 🐛 Bug Fixes

### Tests
- **course modals**: fix test suite failures caused by UI structure changes in auto-activation enhancement
  - Updated `AddCourseModal.test.tsx` to use correct selectors for semester year input
  - Updated `EditCourseModal.test.tsx` to match new input field structure
  - Fixed 5 failing tests across both modal components
  - All tests now properly validate the new semester-based UI with data-testid attributes

**Impact**: Restores frontend test suite to 100% passing (1854/1854 tests)

### Documentation
- **releases**: update $11.18.1 documentation to include auto-activation features
  - Added comprehensive coverage of scheduled job (3:00 AM UTC daily)
  - Documented UI indicators (color-coded badges)
  - Added monitoring and audit logging details
  - Listed all 4 auto-activation commits

## 📋 Changes Since $11.18.1

### Fixed Tests (5 failures)
1. `AddCourseModal > Rendering > renders credits and year fields with default values`
2. `AddCourseModal > Accessibility > has proper input types for numeric fields`
3. `EditCourseModal > Semester Detection > extracts year from semester string`
4. `EditCourseModal > Accessibility > has proper input types for numeric fields`
5. `EditCourseModal > Edge Cases > handles semester without year`

### Test Changes Summary
- Updated selectors from `input[name="year"]` to `[data-testid="semester-year-input"]`
- Changed expectations from `type="number"` to `type="text"` for year inputs
- Fixed value assertions to expect string format instead of number format

## ✅ Validation

- Backend tests: 742/742 passing (33 batches, 100%)
- Frontend tests: 1854/1854 passing (101 files, 100%)
- All course auto-activation unit tests: 34/34 passing

## 🔄 Upgrade Notes

- No breaking changes
- No database migrations required
- Frontend and backend compatible with $11.18.1
- Drop-in replacement for $11.18.1

## 📦 Files Changed

**Tests**:
- `frontend/src/features/courses/components/AddCourseModal.test.tsx`
- `frontend/src/features/courses/components/EditCourseModal.test.tsx`

**Documentation**:
- `docs/releases/RELEASE_NOTES_$11.18.1.md`
- `docs/releases/GITHUB_RELEASE_$11.18.1.md`

## 🔗 Related

- Parent release: [$11.18.1](RELEASE_NOTES_$11.18.1.md)
- Auto-activation feature: Implemented in $11.18.1
- Test framework: Vitest + React Testing Library

---

**Commit**: fix(tests): update course modal tests for auto-activation UI changes
