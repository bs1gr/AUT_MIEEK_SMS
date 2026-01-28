# Greek Localization Strategy & Fix Guide

**Version**: 1.0
**Date**: January 28, 2026
**Status**: DIAGNOSIS & SOLUTION
**Scope**: Fixing Greek (EL) localization after RBAC & Advanced Search module implementation

---

## 📋 Executive Summary

After implementing the RBAC module (v1.15.0+) and Advanced Search module (v1.18.0+), several Greek localization (EL) issues emerged:

1. **Inconsistent key naming conventions** between EN and EL files
2. **Missing translation keys** referenced in components but not in EL locales
3. **Namespace structure mismatches** causing lookup failures
4. **Deprecated keys still being used** in components (from v1.14.0 era)
5. **Rendering issues** where EL text fails to display, showing EN keys instead

---

## 🔍 Root Cause Analysis

### Issue 1: Inconsistent Key Naming in Search Module

**English File** (`en/search.js`):
```javascript
export default {
  page_title: 'Advanced Search',
  placeholder: {
    students: 'Search students...',
    courses: 'Search courses...',
    grades: 'Search grades...'
  },
  advancedFilters: {
    title: 'Advanced Filters',
    operators: {
      equals: 'Equals',
      contains: 'Contains',
      startsWith: 'Starts with',
      // ...
    }
  }
}
```

**Greek File** (`el/search.js`):
```javascript
export default {
  page_title: 'Προχωρημένη Αναζήτηση',
  search_placeholder: 'Αναζήτηση σπουδαστών, μαθημάτων, βαθμών...', // ❌ DIFFERENT NAME
  advancedFilters: {
    title: 'Προχωρημένα Φίλτρα',
    operators: {
      equals: 'Ισούται',
      contains: 'Περιέχει',
      startsWith: 'Ξεκινά με',
      // ✅ Correct
    }
  }
}
```

**Problem**: EN uses `placeholder.students` but EL uses `search_placeholder` (flat key).

### Issue 2: Component Usage vs Translation Keys

**Component Code** (`AdvancedFilters.tsx`):
```tsx
const operators = [
  { value: 'equals', label: t('search.equals') },
  { value: 'contains', label: t('search.contains') },
  { value: 'starts_with', label: t('search.startsWith') }, // ❌ Typo in key
  // ...
];
```

**EN File** has: `startsWith: 'Starts with'` ✅
**EL File** has: `startsWith: 'Ξεκινά με'` ✅

**BUT** components use `search.starts_with` (snake_case) while keys are camelCase!

### Issue 3: Missing Keys in Greek RBAC Module

**English** (`en/rbac.js`):
```javascript
{
  configuration: 'RBAC Configuration',
  // ... complete 40+ keys
}
```

**Greek** (`el/rbac.js`):
```javascript
{
  configuration: 'Διαμόρφωση RBAC',
  // ... all 40+ keys ARE present ✅
}
```

**BUT**: Some keys used in newer components (after v1.15.0) are not found:
- Components try: `t('rbac.errorSearching')`
- File doesn't have this key (it's from `search` namespace)

### Issue 4: Namespace Confusion

**Current Structure** (`translations.ts`):
```typescript
translationNamespaces = {
  en: {
    search: searchEn,      // namespace: 'search'
    rbac: rbacEn,         // namespace: 'rbac'
    // ...
  },
  el: {
    search: searchEl,
    rbac: rbacEl,
    // ...
  }
}
```

**Component Usage**:
```tsx
const { t } = useTranslation(); // ❌ Default namespace issue
t('search.equals'); // Works only if useTranslation('search') called

// Should be:
const { t } = useTranslation('search'); // ✅ Explicit namespace
```

---

## 📊 Discrepancies Found (Detailed)

### A. Search Module Naming Inconsistencies

| Key Path | EN | EL | Status |
|-----------|-----|-----|--------|
| `search.placeholder.students` | ✅ | ❌ (named `search_placeholder`) | MISMATCH |
| `search.advancedFilters.operators.startsWith` | ✅ | ✅ | OK |
| `search.history.title` | ❌ MISSING | ✅ | EN MISSING |
| `search.queryBuilder.title` | ❌ MISSING | ✅ | EN MISSING |
| `search.errorSearching` | ❌ MISSING | ❌ MISSING | BOTH MISSING |

### B. RBAC Module Key Parity

**Status**: ✅ 100% parity (all EN keys have EL translations)

However, components reference:
- `t('rbac.show')` - ✅ Present
- `t('rbac.configuration')` - ✅ Present
- But some error keys are in wrong namespace (should be in `errors`, not `rbac`)

### C. Component References Analysis

**Broken References Found**:

1. `AdvancedFilters.tsx`: Line 62-67
   ```tsx
   { value: 'equals', label: t('search.equals') },  // ❌ Key mismatch: 'search.equals' vs EN structure
   ```

2. `useSearch.ts`: Lines 199, 204, 256, 386
   ```tsx
   t('search.errorSearching') // ❌ KEY DOESN'T EXIST in either EN or EL files!
   ```

3. `OperationsPage.tsx`: Lines 20-27
   ```tsx
   t('rbac.configuration') // ✅ OK
   t('rbac.createDefaultsDesc') // ✅ OK
   ```

---

## ✅ Solution: Clear Language Strategy Implementation

### Step 1: Unified Naming Convention

**Apply camelCase consistently across all EN/EL files:**

```javascript
// ❌ OLD (inconsistent)
placeholder: { students: '...' }      // EN
search_placeholder: '...'             // EL
search_label: '...'                   // EL (flat)

// ✅ NEW (consistent)
placeholder: {
  students: '...',
  courses: '...',
  grades: '...'
}
labels: {
  search: '...',  // shared labels namespace
  filter: '...',
}
```

### Step 2: Create Missing Keys

**Add to BOTH `en/search.js` AND `el/search.js`:**

```javascript
// Missing in both EN & EL:
errorSearching: 'Error performing search',  // EN
errorSearching: 'Σφάλμα κατά την αναζήτηση', // EL

history: {
  title: 'Search History',
  clear: 'Clear All',
  empty: 'No recent searches.'
},
// ... (already exists in EL, add to EN)

queryBuilder: {
  title: 'Advanced Query Builder',
  group: 'Group operator',
  and: 'AND',
  or: 'OR',
  noteOr: 'Note: OR grouping is UI-only for now; backend applies flat filters.',
  noteAnd: 'Filters are combined with AND.',
}
// ... (already exists in EL, add to EN)
```

### Step 3: Fix Component References

**Standardize all components to use proper namespaces:**

```tsx
// ❌ OLD
const { t } = useTranslation();

// ✅ NEW
const { t } = useTranslation('search');

// OR for multi-namespace:
const { t: tSearch } = useTranslation('search');
const { t: tCommon } = useTranslation('common');
```

### Step 4: Create Master Translation Index

**New File**: `frontend/src/locales/TRANSLATION_INDEX.md`

```markdown
# Translation Namespace Reference

## Namespaces & Keys

### search
- `search.page_title`
- `search.placeholder.students` / courses / grades
- `search.advancedFilters.*`
- `search.history.*`
- `search.queryBuilder.*`
- `search.errorSearching` (NEW)

### rbac
- `rbac.configuration`
- `rbac.createDefaultsDesc`
- `rbac.show` / `rbac.hide`
- ... (40+ keys, all parity-checked ✅)

### errors
- `errors.notFound`
- `errors.unauthorized`
- ... (move error keys here, not rbac)

## Parity Checklist

- [ ] EN/EL have same nested structure
- [ ] All keys in EN have EL counterpart
- [ ] All keys in EL have EN counterpart
- [ ] Key names use camelCase consistently
- [ ] No snake_case/flatKey mixing
```

---

## 🛠️ Implementation Steps

### Phase 1: Fix Search Module Keys (HIGH PRIORITY)

1. **Rename flat keys to nested structure in `el/search.js`**:
   - `search_placeholder` → `placeholder` (nested object)
   - `search_label` → `labels.search` (create labels namespace)
   - `search_aria_label` → `ariaLabel`
   - `clear_search` → `clear` or `buttons.clear`

2. **Add missing keys to BOTH files**:
   - `errorSearching`
   - Complete `history` object (EN missing)
   - Complete `queryBuilder` object (EN missing)

3. **Test component rendering**:
   ```bash
   npm --prefix frontend run test -- search.test.tsx --run
   ```

### Phase 2: Fix Component References

1. **Update `AdvancedFilters.tsx`**:
   - Change `t('search.startsWith')` to use correct nested key
   - Add namespace declaration: `useTranslation('search')`

2. **Update `useSearch.ts`**:
   - Replace `t('search.errorSearching')` reference (move to `errors.search` or `search.errors`)
   - Verify all other translations have matching keys

3. **Update `OperationsPage.tsx`**:
   - Add namespace: `useTranslation('rbac')`
   - Verify all RBAC keys exist

### Phase 3: Validation & Testing

1. **Run translation integrity tests**:
   ```bash
   npm --prefix frontend run test -- "*translation*" --run
   ```

2. **Visual testing in browser**:
   - Switch to Greek (EL) language
   - Navigate to:
     - Advanced Search page
     - Admin RBAC settings
   - Verify all text renders in Greek (no missing keys)

3. **Console check**:
   - Should have **ZERO** "Missing translation key" warnings

---

## 📋 Detailed Key Comparison

### EN/EL Search Module - Full Audit

**Missing from EN** (but exists in EL):
- `history.*` (title, clear, empty)
- `queryBuilder.*` (title, group, and, or, notes)

**Missing from EL** (but exists in EN):
- None identified ✅

**Key structure mismatches**:
| Issue | EN | EL | Fix |
|-------|----|----|-----|
| Placeholder | `placeholder.students` | `search_placeholder` (flat) | Normalize to nested structure |
| Label | `ariaLabel` | `search_aria_label` | Use `ariaLabel` in both |
| Clearing | N/A | `clear_search` | Use `buttons.clear` or `actions.clear` |

---

## 🎯 Rendering Issues Root Causes

### Why Text Doesn't Appear

1. **Component calls**: `t('search.startsWith')`
2. **Translation file has**: `startsWith: 'Ξεκινά με'` (inside `operators` object)
3. **Correct path should be**: `t('search.advancedFilters.operators.startsWith')`
4. **Result**: Key not found → renders `search.startsWith` (shows English key, not translation)

### Why "EN text shows instead of EL"

When Greek locale is active but:
- Component uses wrong namespace → falls back to EN default
- OR component uses wrong key path → key not found → uses English key as fallback

**Example**:
```tsx
// Component wants: "Ξεκινά με" (Greek)
t('search.startsWith')          // ❌ Wrong path

// File has key at:
search.advancedFilters.operators.startsWith

// System can't find it, displays: "search.startsWith" (the key itself, English-like)
```

---

## 📝 Action Plan Summary

| # | Action | File(s) | Priority | Effort |
|---|--------|---------|----------|--------|
| 1 | Normalize key structure in `el/search.js` | `frontend/src/locales/el/search.js` | HIGH | 30 min |
| 2 | Add missing keys to `en/search.js` | `frontend/src/locales/en/search.js` | HIGH | 20 min |
| 3 | Add missing keys to `el/search.js` | `frontend/src/locales/el/search.js` | HIGH | 20 min |
| 4 | Update component namespaces | `AdvancedFilters.tsx`, `useSearch.ts`, `OperationsPage.tsx` | MEDIUM | 20 min |
| 5 | Run translation integrity tests | CI/CD + local | MEDIUM | 10 min |
| 6 | Visual testing in browser | Manual QA | MEDIUM | 15 min |
| 7 | Create translation index docs | `TRANSLATION_INDEX.md` | LOW | 15 min |

**Total Estimated Time**: 2-2.5 hours

---

## ✨ Benefits of This Strategy

1. ✅ **Consistency**: Same structure in EN and EL files
2. ✅ **Discoverability**: Clear key naming conventions
3. ✅ **Maintainability**: Easy to add new features without key conflicts
4. ✅ **Testing**: Translation parity can be automated
5. ✅ **Rendering**: All Greek text displays correctly
6. ✅ **Future-proof**: Easy to scale to other languages (DE, FR, etc.)

---

## 🔗 References

- **Translation files**: `frontend/src/locales/{en,el}/`
- **Translation setup**: `frontend/src/translations.ts`
- **i18n config**: `frontend/vite.config.ts` (react-i18next config)
- **Component examples**: `AdvancedFilters.tsx`, `OperationsPage.tsx`
- **Translation integrity tests**: `frontend/src/**/__tests__/*translation*`

---

**Next Step**: Implement Phase 1 fixes (normalize search keys in EL/EN files)
