# Batch 6 ESLint Warnings - Categorized for Cleanup

## Summary
- **Total Warnings**: 129
- **Categories**: 5 main types
- **Estimated Fixes**: 40-50 minutes
- **Target After Cleanup**: <90 warnings

---

## Category 1: Hardcoded Literal Strings (i18next/no-literal-string) - 49 warnings
> Status: Hardcoded text in UI that needs i18n wrapping with t()

**Files (7):**
1. UpdatesPanel.tsx (1 warning) - "SHA256:" label
2. StudentPerformanceReport.tsx (1 warning) - Attendance percentage display
3. RBACPanel.tsx (3 warnings) - Literal counts and legacy role label
4. AttendanceCard.tsx (1 warning) - ✓ symbol with status text
5. GradeDistributionChart.tsx (5 warnings) - Grade letter labels (A, B, C, D, F)
6. PerformanceCard.tsx (1 warning) - "days" text
7. ExportDialog.tsx (3 warnings) - "Export Data", button labels
8. HistoryTable.tsx (9 warnings) - Table headers, empty states, Import/Export labels
9. ImportWizard.tsx (20 warnings) - "Import Wizard", validation labels, section headers
10. AuthPage.tsx (1 warning) - Hidden test div "Loaded"

**Fix Strategy**: Add `t()` wrappers around hardcoded strings, create corresponding translation keys

---

## Category 2: Unused Variables/Imports - 26 warnings
> Status: Variables/functions imported or declared but never used

**Files (6):**
1. importExportApi.ts (1) - 'ImportExportResponse' type
2. AdvancedFilters.test.tsx (1) - 'container' variable
3. ImportExportComponents.test.tsx (2) - 'render', 'screen' imports
4. AnalyticsDashboard.test.tsx (4) - 'data' unused in mock callbacks
5. useFormValidation.test.ts (1) - 'TestData' type
6. usePerformanceMonitor.test.ts (2) - 'unmount' variable assigned but unused
7. useVirtualScroll.test.ts (1) - 'firstVirtualizer' variable
8. AdminPermissionsPage.test.tsx (1) - 'any' type
9. usePerformanceMonitor.ts (4) - 'callback', 'unmount' params/vars
10. useSearch.ts (2) - '_error' variables
11. usePerformanceMonitor.test.ts (2+) - Multiple 'unmount' unused

**Fix Strategy**: Remove unused imports or prefix with underscore (e.g., `_container`)

---

## Category 3: Unexpected `any` Types - 24 warnings
> Status: TypeScript types are too loose (should be explicit)

**Files (7):**
1. importExportApi.ts (1)
2. useImportExport.ts (1)
3. useNotifications.ts (3)
4. useNotifications.test.ts (2)
5. usePerformanceMonitor.test.ts (26+ instances)
6. usePerformanceMonitor.ts (2)
7. useSearch.ts (2)
8. AdminPermissionsPage.test.tsx (1)
9. notificationWebSocket.test.ts (1)
10. notification.ts (1)

**Fix Strategy**: Replace `any` with proper types (`unknown`, specific interface, or generics)

---

## Category 4: React Hooks Issues - 9 warnings
> Status: Missing dependencies in useEffect, useMemo, useCallback

**Files (4):**
1. AttendanceView.tsx (4) - Missing 'localCourses' and 'courses' dependencies
2. GradingView.tsx (2) - Missing 'courses' dependency, unnecessary 'language' dependency
3. useNotifications.ts (1) - Missing 'notifications' dependency
4. usePerformanceMonitor.ts (1) - Ref cleanup issue
5. useSearch.ts (1) - setState in effect (cascading renders)

**Fix Strategy**: Add missing dependencies to dependency arrays or refactor hooks

---

## Category 5: Miscellaneous - 21 warnings
> Status: Various patterns (empty interfaces, a11y, console logs, test patterns)

**Files (6):**
1. ExportDialog.tsx (1) - Empty interface (should be `object`)
2. ImportWizard.tsx (2) - Empty interface + a11y click handler
3. useNotifications.ts (5) - Unexpected console.log statements (should use console.warn/error)
4. usePerformanceMonitor.test.ts (Many) - 'any' in test mocks
5. GradingView.decimal.test.tsx (1) - Use `findByText` instead of `waitFor` + `findByText`
6. AdminPermissionsPage.test.tsx (2) - Use `findByText` instead of `waitFor` + `getByText`
7. useSearch.ts (1) - setState in effect causing cascading renders
8. usePerformanceMonitor.ts (3) - Ref issues in cleanup

**Fix Strategy**:
- Replace empty interfaces with `object` type
- Remove console.log or change to console.warn/error
- Use testing-library best practices
- Refactor refs and effects

---

## Recommended Fix Order (Efficiency)

### Phase 1: Quick Wins (10-15 min)
1. **Unused Variables** (26 warnings) - Quickest to fix (remove imports or prefix with `_`)
2. **Empty Interfaces** (2 warnings) - Change to `object` type
3. **Test Selectors** (3 warnings) - Use `findByText` instead of `waitFor`

### Phase 2: Pattern-Based (15-20 min)
4. **Hardcoded Literals** (49 warnings) - Bulk wrap with `t()` function
   - Group by file (8 files)
   - Identify common translation key patterns
   - Batch apply replacements

### Phase 3: Type Safety (10-15 min)
5. **Unexpected `any`** (24 warnings) - Replace with explicit types
   - Focus on test files first (easier to change)
   - Then production code with specific types

### Phase 4: Hooks & Logic (10-15 min)
6. **React Hooks** (9 warnings) - Add missing dependencies
   - Add missing deps to Arrays
   - Refactor setState in effects

### Phase 5: Polish (5-10 min)
7. **Console Statements** (5 warnings) - Change to warn/error
8. **Ref Issues** (remaining) - Fix cleanup functions

---

## Files by Priority (Complexity)

**Easy (5 min each):**
- importExportApi.ts - 1 unused import
- AdvancedFilters.test.tsx - 1 unused variable
- useFormValidation.test.ts - 1 unused type
- AuthPage.tsx - 1 hardcoded string
- ExportDialog.tsx - 1 empty interface

**Medium (10-15 min each):**
- HistoryTable.tsx - 9 hardcoded strings
- GradeDistributionChart.tsx - 5 hardcoded strings + 1 unused
- RBACPanel.tsx - 3 hardcoded strings
- GradingView.tsx - 2 hooks dependencies + 1 unused
- AttendanceView.tsx - 4 hooks dependencies

**Complex (20+ min):**
- ImportWizard.tsx - 20 hardcoded strings + empty interface + a11y
- usePerformanceMonitor.test.ts - 30+ warnings (many `any` in tests)
- useSearch.ts - 4 issues (any, unused, setState in effect)

---

## Expected Outcome After Batch 6

**Remaining Issues** (~40 warnings):
- Some intentional `any` in complex test mocks (acceptable)
- Complex library integration patterns (low priority)
- Advanced React patterns (edge cases)

**Target**: <90 warnings ✅
