# Quick Start: Issue #147 Implementation

**Date**: January 25, 2026 23:50 UTC
**Status**: 🚀 READY TO BEGIN
**Branch**: feature/phase4-issue-147
**Next Step**: SearchBar Component (Step 4)

---

## ⚡ Quick Setup (2 minutes)

```powershell
# Verify branch is active
git branch -vv

# Verify clean working tree
git status

# Start development servers (separate terminals)
.\NATIVE.ps1 -Start                    # Backend (8000) + Frontend (5173)

# In another terminal, start tests
.\RUN_TESTS_BATCH.ps1 -BatchSize 3     # Run tests in batches
```

---

## 🎯 What's Ready

**Foundation (✅ COMPLETE)**:
- [x] Type definitions (types/search.ts - 333 lines)
- [x] API client (api/search-client.ts - 60 lines)
- [x] React hooks (hooks/useSearch.ts - 220 lines)
- [x] Main page scaffold (AdvancedSearchPage.tsx - 85 lines)
- [x] Test fixtures (tests/fixtures.ts - 85 lines)
- [x] Directory structure (5 directories created)

**Total Foundation**: 783 lines of production-ready code

---

## 📋 Step 4: SearchBar Component (START HERE)

**File**: `frontend/src/features/advanced-search/components/SearchBar.tsx`

**Features to Implement**:
1. Real-time search input
2. Entity type selector
3. 300ms debounce
4. Clear button
5. Search history dropdown
6. Keyboard navigation

**Test File**: `frontend/src/features/advanced-search/__tests__/SearchBar.test.tsx`

**Test Cases** (8 minimum):
- [ ] Renders with placeholder
- [ ] Updates on input change
- [ ] Debounces search requests
- [ ] Entity type selection works
- [ ] Clear button resets input
- [ ] Shows search history
- [ ] Keyboard navigation works
- [ ] Accessibility compliance

**Estimated Time**: 6 hours

---

## 📖 Full Implementation Plan

See these documents for details:

1. **ISSUE147_IMPLEMENTATION_STATUS.md** (this session)
   - Complete checklist for all 10 steps
   - Testing strategy
   - Performance targets
   - i18n requirements
   - Daily progress log

2. **PHASE4_ISSUE147_PREPARATION_GUIDE.md** (earlier)
   - Detailed specifications for each component
   - UI/UX mockups and layout
   - API integration points
   - 10-step roadmap

3. **PHASE4_PR150_REVIEW_SUMMARY.md** (earlier)
   - Backend infrastructure overview
   - Database schema
   - API endpoints

---

## 🧪 Testing Commands

```powershell
# Run all backend tests (required before commit)
.\RUN_TESTS_BATCH.ps1

# Run frontend tests only
npm --prefix frontend run test -- --run

# Run specific test file
npm --prefix frontend run test -- SearchBar.test.tsx --run

# Run tests in watch mode (development)
npm --prefix frontend run test  # without --run flag

# Pre-commit validation
.\COMMIT_READY.ps1 -Quick
```

---

## 🔗 Related Branches & PRs

- **PR #150**: Infrastructure (open, awaiting review)
  - Contains backend search API (Issue #145)
  - Contains saved searches CRUD (Issue #146)
  - All acceptance criteria met
  - URL: https://github.com/bs1gr/AUT_MIEEK_SMS/pull/150

- **Current Branch**: feature/phase4-issue-147
  - Where SearchBar will be implemented
  - Scaffolding already pushed to origin

---

## ⚙️ Architecture Quick Reference

**Type System** (already defined):
```typescript
interface SearchQuery {
  q: string;
  entity_type?: 'students' | 'courses' | 'grades' | 'all';
  filters: FilterCondition[];
  sort_by?: 'relevance' | 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page: number;
  page_size: number;
}
```

**API Client** (already defined):
```typescript
searchAPI = {
  searchStudents(query),
  searchCourses(query),
  searchGrades(query),
  advancedSearch(query),
  getSearchFacets(entityType),
  // ... more endpoints
}
```

**Search Hook** (already defined):
```typescript
const {
  state, results, isLoading, isError,
  setQuery, addFilter, removeFilter, clearFilters,
  setSort, setCurrentPage, setPageSize,
  // ... more methods
} = useSearch(initialState, debounceMs);
```

---

## 📝 Git Workflow

```powershell
# Before starting work
git pull origin main              # Get latest from main
git checkout feature/phase4-issue-147  # Switch to feature branch
git pull origin feature/phase4-issue-147  # Get remote changes

# During development (frequent commits)
git add .
git commit -m "feat(searchbar): Add real-time search input with debouncing"

# Push progress regularly
git push origin feature/phase4-issue-447

# Before submitting PR
.\COMMIT_READY.ps1 -Quick         # Validate changes

# Create PR when Step 4-7 complete
# PR description should reference Issue #147
```

---

## 🎯 Immediate Actions

1. **Read preparation guide** (10 min)
   - PHASE4_ISSUE147_PREPARATION_GUIDE.md

2. **Understand component specs** (15 min)
   - SearchBar specifications
   - Component props and state
   - Test requirements

3. **Create SearchBar component** (2-4 hours)
   - Implement all features
   - Add TypeScript types
   - Write 8 test cases

4. **Test locally** (30 min)
   - Run tests: `npm --prefix frontend run test`
   - Browser verification: http://localhost:5173

5. **Commit progress** (10 min)
   - Git add and commit
   - Push to origin

---

## ✅ Success Criteria (Daily)

- [ ] Feature branch is active (`git branch` shows *)
- [ ] New component files created in correct directory
- [ ] TypeScript types defined (no `any` types)
- [ ] Component renders without errors
- [ ] Test file created with minimum tests
- [ ] All tests passing (`npm run test -- --run`)
- [ ] Git changes committed to feature/phase4-issue-147
- [ ] Changes pushed to origin

---

## 🚨 Important Reminders

**DO**:
- ✅ Use TypeScript types throughout
- ✅ Write tests for each feature
- ✅ Use i18n for all strings
- ✅ Commit frequently
- ✅ Run tests before commit
- ✅ Check accessibility

**DON'T**:
- ❌ Use `any` types
- ❌ Hardcode strings (use i18n)
- ❌ Skip tests
- ❌ Make massive commits
- ❌ Run `pytest` directly (use batch runner)

---

## 📞 Key Contacts

**Documentation**:
- Implementation guide: PHASE4_ISSUE147_PREPARATION_GUIDE.md
- Status checklist: ISSUE147_IMPLEMENTATION_STATUS.md
- Work plan: docs/plans/UNIFIED_WORK_PLAN.md

**Code**:
- Type definitions: frontend/src/features/advanced-search/types/search.ts
- API client: frontend/src/api/search-client.ts
- React hooks: frontend/src/features/advanced-search/hooks/useSearch.ts

---

## ⏱️ Timeline

| Day | Target | Hours |
|-----|--------|-------|
| 1-2 | SearchBar (Step 4) + AdvancedFilters (Step 5) | 14 |
| 3 | SearchResults (Step 6) | 8 |
| 4-5 | FacetedNav (Step 7) + SavedSearches (Step 8) | 12 |
| 6 | Pagination (Step 9) | 4 |
| 7 | Page Integration (Step 10) | 12 |
| 8-10 | Testing, optimization, QA | 24 |
| **Total** | **10 steps → 100+ tests** | **~60 hours** |

---

**Ready?** Start with SearchBar component. See PHASE4_ISSUE147_PREPARATION_GUIDE.md for detailed specifications.

**Good luck!** 🚀

