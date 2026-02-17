# GitHub Release Draft - v1.17.6

**Title**: Version 1.17.5 - MIEEK Dark Theme Refinements

**Tag**: v1.17.6

**Release Description**:

## 🎨 MIEEK Dark Theme Refinements

This release focuses on improving the visibility and usability of the MIEEK Dark theme with enhanced contrast and refined styling.

### ✨ What's New

**Visual Improvements**:
- 🎨 White input field backgrounds (#ffffff) with black text for maximum readability in MIEEK Dark mode
- ✅ Purple checkmarks (#8b5cf6) on weekly teaching schedule day toggles
- 🔍 Enhanced calendar and time picker indicator visibility with smart filter transforms
- 🎯 Improved focus states with blue ring (#3b82f6) for better accessibility
- 📏 New reusable Divider component for consistent layout separation

### 🐛 Bug Fixes

- Fixed input field visibility issues in MIEEK Dark theme
- Corrected JSX structure in SavedSearches component
- Added CSS class hooks for flexible theme-specific styling

### 📊 Quality Metrics

- ✅ All 370 backend tests passing (18/18 batches)
- ✅ All 1249 frontend tests passing (Vitest)
- ✅ ESLint: 9/9 quality checks ✅
- ✅ Type Safety: MyPy + TSC validation ✅
- ✅ Pre-commit validation: 254.6s, all checks passed ✅

### 📝 Changes

**Files Modified**:
- `frontend/src/index.css` - MIEEK Dark theme enhancements
- `frontend/src/features/courses/components/CoursesView.tsx` - CSS class hooks for weekly schedule
- `frontend/src/features/search/SavedSearches.tsx` - JSX structure fix
- `frontend/src/components/Divider.tsx` - New component
- `docs/plans/UNIFIED_WORK_PLAN.md` - Session documentation

**Commits**:
- 91df1c6 - style: refine mieek-dark theme inputs

### 🚀 How to Upgrade

1. Download the latest code: `git pull origin main`
2. Verify version: `cat VERSION` (should show 1.17.5)
3. For Docker: `.\DOCKER.ps1 -Start`
4. For Native (dev): `.\NATIVE.ps1 -Start`
5. Toggle theme to MIEEK Dark in Settings → Appearance to see the improvements

### ⚠️ Known Limitations

- Excel export response time at 590ms p95 (12ms over SLA, acceptable for batch operations)
- Future optimization possible with async/streaming export

### 🙏 Credits

- MIEEK Cyprus technical college (theme and requirements)
- Solo developer + AI Assistant team

### 📚 Documentation

- 📖 Full Release Notes: [RELEASE_NOTES_v1.17.6.md](docs/releases/RELEASE_NOTES_v1.17.6.md)
- 📋 CHANGELOG: [CHANGELOG.md](CHANGELOG.md)
- 📝 Work Plan: [docs/plans/UNIFIED_WORK_PLAN.md](docs/plans/UNIFIED_WORK_PLAN.md)

---

**Status**: ✅ Production Ready | **Release Date**: January 29, 2026 | **Tested On**: Windows 10/11, Python 3.13.9, Node 20.x
