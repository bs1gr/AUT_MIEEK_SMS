# Continuation Guide - Session 3: Batch 5 (i18n Hardcoded Strings)

**Created**: January 18, 2026
**For Next Session**: Start from Batch 5
**Status**: Ready to Begin ✅

---

## Quick Start (5 Minutes)

### Step 1: Verify State

```powershell
cd d:\SMS\student-management-system
git status
git log --oneline -5

```text
**Expected Output**:

```text
On branch main
Your branch is ahead of 'origin/main' by 0 commits.
Working tree clean

ecaaaa49f fix: Add missing useEffect dependencies (Batch 4)
751d66610 fix: Replace any types (Batch 3)
9a34cad8c fix: Remove 10 unused imports (Batch 2)

```text
### Step 2: Check ESLint Baseline

```powershell
cd frontend
npm run lint 2>&1 | tail -1

```text
**Expected**: ~125 warnings (down from 170 at start)

### Step 3: Verify Tests

```powershell
npm run test -- --run 2>&1 | tail -5

```text
**Expected**: All 1,249/1,249 tests passing ✅

---

## Batch 5: i18n Hardcoded Strings (50+ warnings)

### What You're Fixing

**Problem**: Components have hardcoded English strings that should be translated.

**Example (WRONG)**:

```tsx
<button>Save Student</button>  // ❌ Hardcoded
<p>No results found</p>        // ❌ Hardcoded

```text
**Example (CORRECT)**:

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <button>{t('buttons.saveStudent')}</button>;  // ✅ Translated
}

```text
### Priority Files (In Order of Impact)

**HIGH IMPACT** (10+ strings each):
1. `frontend/src/features/search/components/SavedSearches.tsx` - 15 strings
2. `frontend/src/features/search/AdvancedSearch.tsx` - 10 strings
3. `frontend/src/features/search/SearchBar.tsx` - 8 strings

**MEDIUM IMPACT** (5+ strings each):
4. `frontend/src/features/calendar/` - Multiple components
5. `frontend/src/features/analytics/` - Dashboard components
6. `frontend/src/features/reports/` - Report components

**LOW IMPACT** (1-3 strings):
7. Various test files and utility components

### Process for Each File

```text
FOR EACH FILE:
1. Read the file completely
2. Identify all hardcoded strings
3. Check if translation keys exist in src/locales/
4. If missing: Add to en.ts and el.ts (Greek)
5. Replace hardcoded strings with t('key') calls
6. Verify: npm run lint (should have fewer warnings)
7. Commit when file complete

```text
### Translation File Structure

**Location**: `frontend/src/locales/`
```text
en/
  common.ts       - Common phrases (Save, Cancel, Delete)
  buttons.ts      - Button labels
  messages.ts     - Messages and alerts
  student.ts      - Student-related text
  search.ts       - Search feature text
  calendar.ts     - Calendar feature text
  ...
el/
  (same structure in Greek)

```text
### Example: Adding Translation

**File**: `frontend/src/locales/en/search.ts`
```typescript
export default {
  noResultsFound: 'No results found',
  saveSearch: 'Save this search',
  advancedSearch: 'Advanced Search',
  // ... etc
};

```text
**File**: `frontend/src/locales/el/search.ts`
```typescript
export default {
  noResultsFound: 'Δεν βρέθηκαν αποτελέσματα',
  saveSearch: 'Αποθήκευση αναζήτησης',
  advancedSearch: 'Προηγμένη Αναζήτηση',
  // ... etc
};

```text
**Usage**: `frontend/src/features/search/SavedSearches.tsx`
```tsx
const { t } = useTranslation();
return <p>{t('search.noResultsFound')}</p>;

```text
### Common Hardcoded String Patterns to Find

**Buttons**:

```tsx
<button>Save</button>
<button>Delete</button>
<button>Cancel</button>

```text
**Messages**:

```tsx
<p>No results found</p>
<p>Error loading data</p>
<p>Loading...</p>

```text
**Labels**:

```tsx
<label>Student Name</label>
<label>Course</label>
<label>Grade</label>

```text
**Placeholders**:

```tsx
<input placeholder="Enter name" />
<input placeholder="Search..." />

```text
### Tools to Help

**Find all hardcoded strings in a file**:

```bash
cd frontend
grep -n '"[A-Z]' src/features/search/SavedSearches.tsx
grep -n "'[A-Z]" src/features/search/SavedSearches.tsx

```text
**Find all files with hardcoded strings**:

```bash
grep -r '>"[A-Z]' src/features/
grep -r ">'\w" src/features/

```text
---

## Session Execution Plan

### Phase 1: HIGH IMPACT Files (2 hours)

1. **SavedSearches.tsx** (15 strings)
   - Read file → Identify strings → Add translations → Replace → Test
   - Expected lint reduction: ~15 warnings

2. **AdvancedSearch.tsx** (10 strings)
   - Same process
   - Expected lint reduction: ~10 warnings

3. **SearchBar.tsx** (8 strings)
   - Same process
   - Expected lint reduction: ~8 warnings

**Checkpoint after Phase 1**:
- 33 strings fixed
- ESLint: ~125 → ~92 warnings
- All tests passing

### Phase 2: MEDIUM IMPACT Files (1.5 hours)

4. **Calendar Components** (5+ strings)
5. **Analytics Components** (5+ strings)
6. **Report Components** (5+ strings)

**Checkpoint after Phase 2**:
- 50+ strings fixed total
- ESLint: ~92 → ~75 warnings
- All tests passing

### Phase 3: LOW IMPACT & Polish (1 hour)

7. Remaining files with 1-3 strings
8. Run full lint
9. Final commit

**Final Status**:
- ESLint: 75+ warnings reduced
- Total i18n fixes: 50+
- All tests passing

---

## Key Commands

**Check ESLint warnings**:

```powershell
npm run lint 2>&1 | grep "problem"

```text
**Check specific file for i18n issues**:

```powershell
npx eslint src/features/search/SavedSearches.tsx

```text
**Add all staged changes**:

```powershell
git add frontend/src/

```text
**Commit Batch 5 when complete**:

```powershell
git commit -m "fix: Replace hardcoded strings with i18n translations (Phase 2 - Batch 5)

- SavedSearches.tsx: 15 strings
- AdvancedSearch.tsx: 10 strings
- SearchBar.tsx: 8 strings
- Added translations to en.ts and el.ts files
- All 1,249 frontend tests passing"

```text
---

## Success Criteria

✅ All hardcoded strings in priority files replaced with t() calls
✅ All translation keys exist in EN and EL files (not Greek-only)
✅ ESLint warnings reduced to <80 (from ~125)
✅ All 1,249 frontend tests still passing
✅ No console warnings about missing i18n keys
✅ Batch 5 changes committed and pushed

---

## Reference: ESLint Rule

**Rule**: `@intlify/vue-i18n/no-missing-keys` + text hardcoding detection
**Config**: `.eslintrc.cjs`
**Why It Matters**:
- Ensures all text is translatable
- Supports bilingual EN/EL user base
- Required for production deployment

---

## Troubleshooting

**If string doesn't have t() call**:

```typescript
// ❌ WRONG
<p>Loading...</p>

// ✅ RIGHT
<p>{t('common.loading')}</p>

```text
**If translation key missing**:

```text
Error: i18n key 'search.saveSearch' not found

```text
Solution:
1. Add key to `frontend/src/locales/en/search.ts`
2. Add Greek translation to `frontend/src/locales/el/search.ts`
3. Use t('search.saveSearch') in component

**If ESLint still shows warnings**:

```powershell
npm run lint -- --fix

```text
This auto-fixes some ESLint issues (formatting, imports).

---

## Next Steps After Batch 5

**If ESLint < 80 warnings**:
→ Continue to Batch 6: Final Polish

**If ESLint still > 80 warnings**:
→ Review PHASE2_BATCH5_COMPLETE.md for status
→ Identify remaining issues
→ Create follow-up batch if needed

---

## Quick Reference: i18n Keys Pattern

**Common Pattern**: `feature.action` or `feature.noun`

Examples:

```text
search.noResultsFound
search.saveSearch
buttons.save
buttons.cancel
messages.loading
student.nameRequired

```text
**File Organization**:

```text
locales/
  en/
    common.ts       // Generic: save, cancel, yes, no
    buttons.ts      // Button labels
    messages.ts     // Messages: loading, error, success
    student.ts      // Student feature
    search.ts       // Search feature
    calendar.ts     // Calendar feature
  el/
    (same structure in Greek)

```text
---

**Session Ready**: Yes ✅
**Estimated Duration**: 4-5 hours
**Success Rate Expected**: 95%+ (well-defined task)

**Remember**: One file at a time, commit after each file group.

