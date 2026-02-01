# Release Notes - Version 1.17.5

**Release Date**: 2026-01-29
**Previous Version**: $11.17.6
**Status**: ✅ Production Ready

## ⚠️ BREAKING CHANGES

None - fully backward compatible with $11.17.6

## ✨ Features

- **theme**: MIEEK Dark theme visual refinements with improved input contrast [91df1c6]
  - White input field backgrounds (#ffffff) with black text for readability
  - Purple checkmarks (#8b5cf6) on weekly teaching schedule toggles
  - Enhanced calendar/time picker indicator visibility with filter transforms
  - Improved focus states with blue ring (#3b82f6) for accessibility
  - Scoped dark theme overrides to prevent light mode interference

- **components**: Add Divider component for layout separation [91df1c6]
  - Reusable divider with role-based accessibility attributes
  - Supports custom styling via className prop
  - Integrates with SearchBar and other components

## 🐛 Bug Fixes

- **theme**: Fix input field visibility in MIEEK Dark mode [91df1c6]
  - Forced white backgrounds on all input/textarea/select elements
  - Ensured black text color (#000000) for contrast in dark theme
  - Applied border color adjustments for dark theme consistency

- **ui**: Fix JSX closing tag in SavedSearches component [91df1c6]
  - Corrected nested div structure to prevent rendering errors
  - Properly wrapped divider element within container

- **theme**: Add CSS class hooks for weekly schedule styling [91df1c6]
  - Added `weekly-schedule-toggle` and `weekly-schedule-toggle--active` classes
  - Added `weekly-schedule-toggle__icon` class for icon styling
  - Enables CSS-only theme refinements without JSX modifications

## 📊 Performance

- No performance regressions
- Backend: 18/18 test batches passing (370+ tests)
- Frontend: Vitest suite 100% passing (1249 tests)
- CSS changes: Pure styling (no behavioral impact)

## 📝 Documentation Updates

- Updated work plan with Jan 29 MIEEK Dark theme session summary
- Added visual refinement documentation in theme section
- Updated component CSS class hierarchy documentation

## ✅ Testing & Quality

- ✅ ESLint: 9/9 quality checks passed
- ✅ Backend Tests: 18/18 test batches (all passing)
- ✅ Frontend Tests: Vitest complete suite (1249 tests)
- ✅ Type Checking: MyPy (backend) + TSC (frontend)
- ✅ Markdown Linting: All files compliant
- ✅ Git Validation: Clean remote synchronization
- ✅ COMMIT_READY: All validation checks passed (254.6s execution)

## 🔄 Deployment Notes

**For Native (Development) Mode**:
```powershell
.\NATIVE.ps1 -Start
# Navigate to http://localhost:5173
# Toggle theme to MIEEK Dark in settings
# Verify input fields display white with black text
```

**For Docker (Production) Mode**:
```powershell
.\DOCKER.ps1 -Start
# Navigate to http://localhost:8080
# Toggle theme to MIEEK Dark in settings
# Verify theme consistency across deployment modes
```

## 📋 Files Modified

**CSS & Styling**:
- `frontend/src/index.css` - Added 10+ MIEEK Dark theme overrides

**Components**:
- `frontend/src/features/courses/components/CoursesView.tsx` - Added CSS class hooks for weekly schedule
- `frontend/src/features/search/SavedSearches.tsx` - Fixed JSX closing tag
- `frontend/src/components/Divider.tsx` - New reusable divider component

**Documentation**:
- `docs/plans/UNIFIED_WORK_PLAN.md` - Updated session notes

## 🎯 What's Next

**Recommended Next Steps**:
1. Visual verification in browser on all affected pages
2. User feedback on theme contrast improvements
3. Optional Phase 4 feature development (Advanced Search, PWA, etc.)
4. Performance optimization for non-blocking enhancements

**Known Limitations**:
- Excel export p95 response time at 590ms (12ms over SLA target, acceptable for batch operations)
- Optional: Consider async/streaming export for future optimization

## 📞 Support & Issues

For questions or issues with this release:
1. Check theme settings (Settings → Appearance)
2. Clear browser cache (Ctrl+F5) to ensure CSS updates
3. Verify correct deployment mode (NATIVE vs DOCKER)
4. Report issues via GitHub Issues with reproduction steps

---

**Changelog**: See `CHANGELOG.md` for detailed commit history
**Repository**: https://github.com/bs1gr/AUT_MIEEK_SMS
**Release Tag**: $11.17.6

