# Phase 4 Issue #147 - Frontend Advanced Search UI Implementation Guide

**Date**: January 25, 2026
**Issue**: #147 (Phase 4 Feature - Frontend Advanced Search UI & Filters)
**Parent Feature**: #142 (Advanced Search & Filtering)
**Status**: 🔄 **READY TO BEGIN** (Awaiting PR #150 merge)
**Timeline**: 1-2 weeks target
**Effort**: 40-60 hours estimated

---

## 🎯 Executive Summary

Issue #147 implements the **frontend user interface for advanced search**, building on the completed backend API (Issue #145). This issue focuses on creating an intuitive, performant UI that leverages the full-text search backend while maintaining 100% test coverage.

### Key Metrics
- **Backend API**: Ready ✅ (Issue #145 - 112 tests passing)
- **Database Schema**: Ready ✅ (Indexes and migrations complete)
- **Frontend Infrastructure**: Stable ✅ (Vitest, i18n, tests)
- **Target Tests**: 100+ (component + integration)
- **Performance Target**: < 500ms search response

---

## 📋 Acceptance Criteria

All must be satisfied before closing Issue #147:

- [ ] **Advanced search page** renders with all filter controls
- [ ] **Search queries** execute against all entity types (students, courses, grades)
- [ ] **Filter combinations** work correctly (status + enrollment type + date range)
- [ ] **Results display** with proper sorting (relevance, name, date)
- [ ] **Pagination** navigates correctly through result sets
- [ ] **Facets display** accurate value counts for each field
- [ ] **Saved searches** load and execute from history
- [ ] **100+ test cases** passing (component + integration + E2E)
- [ ] **Performance benchmarks** met (< 500ms typical query)
- [ ] **Full i18n support** (EN/EL translations complete)
- [ ] **WCAG 2.1 accessibility** compliance verified

---

## 🏗️ Architecture Overview

### Component Hierarchy

```
<AdvancedSearchPage>
  ├─ <SearchBar>                    # Main search input with debouncing
  │  └─ useSearch() hook
  ├─ <AdvancedFilters>              # Multi-criteria filter builder
  │  ├─ <FilterCondition> × N
  │  └─ <FilterBuilder>
  ├─ <SearchResults>                # Results display area
  │  ├─ <StudentResultCard> × N
  │  ├─ <CourseResultCard> × N
  │  └─ <GradeResultCard> × N
  ├─ <FacetedNavigation>            # Facet sidebar with counts
  │  └─ <FacetItem> × N
  ├─ <SavedSearches>                # Search history management
  │  └─ <SavedSearchItem> × N
  └─ <Pagination>                   # Result navigation
```

### API Integration Flow

```
User Input (Search + Filters)
         ↓
SearchBar Component (debounce 300ms)
         ↓
useSearch Hook (React Query)
         ↓
POST /api/v1/search/advanced
         ↓
Backend Search Service
         ↓
SQLAlchemy ORM Query
         ↓
Database (with indexes)
         ↓
APIResponse Wrapper
         ↓
Extract Data (safe unwrapping)
         ↓
Display Results + Facets + Pagination
```

---

## 📂 Implementation Structure

### File Organization

```
frontend/src/features/advanced-search/
├── AdvancedSearchPage.tsx          # Main page component
├── components/
│  ├── SearchBar.tsx                # Search input (real-time)
│  ├── AdvancedFilters.tsx          # Filter builder
│  ├── FilterCondition.tsx          # Single filter row
│  ├── FilterBuilder.tsx            # Dynamic filter UI
│  ├── SearchResults.tsx            # Results container
│  ├── StudentResultCard.tsx        # Student result item
│  ├── CourseResultCard.tsx         # Course result item
│  ├── GradeResultCard.tsx          # Grade result item
│  ├── FacetedNavigation.tsx        # Facet sidebar
│  ├── SavedSearches.tsx            # Search history
│  └── Pagination.tsx               # Result pagination
├── hooks/
│  ├── useSearch.ts                 # Main search hook
│  ├── useAdvancedFilters.ts        # Filter state management
│  ├── usePagination.ts             # Pagination logic
│  └── useSearchHistory.ts          # Saved searches management
├── types/
│  ├── search.ts                    # TypeScript interfaces
│  ├── filters.ts                   # Filter type definitions
│  └── results.ts                   # Result data types
└── __tests__/
   ├── AdvancedSearchPage.test.tsx
   ├── SearchBar.test.tsx
   ├── AdvancedFilters.test.tsx
   ├── SearchResults.test.tsx
   └── integration/
      └── AdvancedSearch.integration.test.tsx
```

---

## 🔄 Implementation Plan (10 Steps)

### Phase 1: Foundation (Days 1-2)

#### Step 1: Type Definitions & Data Models
**File**: `frontend/src/features/advanced-search/types/`

```typescript
// types/search.ts
export interface SearchQuery {
  q: string;
  entity_type?: 'students' | 'courses' | 'grades';
  filters: FilterCondition[];
  sort_by?: 'relevance' | 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page: number;
  page_size: number;
}

export interface SearchResult<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    facets: Record<string, FacetValue[]>;
  };
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | [number, number];
}
```

**Deliverable**: ✅ Type safety foundation for entire feature

#### Step 2: API Client Integration
**File**: `frontend/src/api/search-client.ts` (NEW)

```typescript
export const searchAPI = {
  searchStudents: (query: SearchQuery) => 
    apiClient.post('/search/students', query),
  
  searchCourses: (query: SearchQuery) => 
    apiClient.post('/search/courses', query),
  
  getSearchFacets: (entityType: string) => 
    apiClient.get(`/search/${entityType}/facets`),
  
  advancedSearch: (query: SearchQuery) => 
    apiClient.post('/search/advanced', query),
};
```

**Deliverable**: ✅ API client methods for all search endpoints

#### Step 3: Translation Keys Setup
**File**: `frontend/src/locales/{en,el}/search.ts` (VERIFY/EXPAND)

```typescript
// en/search.ts
export default {
  page_title: 'Advanced Search',
  search_placeholder: 'Search students, courses, or grades...',
  filters: {
    title: 'Filters',
    add_condition: 'Add Filter Condition',
    remove_condition: 'Remove Filter',
    field: 'Field',
    operator: 'Operator',
    value: 'Value',
  },
  results: {
    title: 'Search Results',
    no_results: 'No results found. Try adjusting your filters.',
    loading: 'Searching...',
    error: 'Error executing search. Please try again.',
  },
  pagination: {
    page: 'Page',
    of: 'of',
    results_per_page: 'Results per page',
  },
  saved_searches: {
    title: 'Saved Searches',
    no_saved: 'No saved searches yet.',
    save_current: 'Save This Search',
    load_search: 'Load Search',
    delete_search: 'Delete Search',
  },
  facets: {
    title: 'Refine Results',
  },
};
```

**Deliverable**: ✅ Complete i18n setup (EN + EL)

### Phase 2: Core Components (Days 3-5)

#### Step 4: SearchBar Component
**File**: `frontend/src/features/advanced-search/components/SearchBar.tsx`

**Key Features**:
- Real-time search with 300ms debounce
- Entity type selector (students/courses/grades)
- Icon and visual feedback
- Clear button
- Search history dropdown

**Test Cases** (8 tests):
- Renders with placeholder
- Updates on input change
- Debounces search requests
- Entity type selection works
- Clear button resets input
- Shows search history
- Keyboard navigation
- Accessibility (aria-labels, roles)

**Deliverable**: ✅ SearchBar component + tests

#### Step 5: AdvancedFilters Component
**File**: `frontend/src/features/advanced-search/components/AdvancedFilters.tsx`

**Key Features**:
- Dynamic filter condition builder
- 6 operator types (equals, contains, startsWith, greaterThan, lessThan, between)
- Add/remove filter conditions
- Filter count badge
- Expandable UI for complex queries

**Test Cases** (12 tests):
- Renders filter panel
- Add filter condition
- Remove filter condition
- Operator selection changes input type
- Between operator shows min/max fields
- Filter count badge updates
- Expandable panel toggle
- Clear all filters
- Validation feedback
- Keyboard navigation
- Accessibility compliance
- Proper error handling

**Deliverable**: ✅ AdvancedFilters component + tests

#### Step 6: SearchResults Component
**File**: `frontend/src/features/advanced-search/components/SearchResults.tsx`

**Key Features**:
- Display results by entity type
- Loading skeleton states
- Empty state message
- Error handling with retry
- Result card selection (highlight on click)
- Virtual scrolling for large result sets

**Test Cases** (10 tests):
- Renders results list
- Shows loading state
- Shows empty state
- Shows error state with retry button
- Renders student/course/grade cards
- Card click handling
- Virtual scrolling initialization
- Sort dropdown changes results order
- Results per page dropdown works
- Error recovery flow

**Deliverable**: ✅ SearchResults component + tests

### Phase 3: Advanced Features (Days 6-8)

#### Step 7: Faceted Navigation
**File**: `frontend/src/features/advanced-search/components/FacetedNavigation.tsx`

**Key Features**:
- Facet sidebar with field value counts
- Facet selection/deselection
- Facet count updates based on filters
- Collapsible facet groups
- Clear facet selection

**Test Cases** (8 tests):
- Renders facet sidebar
- Displays facet counts
- Facet selection filters results
- Multiple facet selection works
- Clear facet selection
- Facet count updates dynamically
- Collapsible groups toggle
- Accessibility compliance

**Deliverable**: ✅ FacetedNavigation component + tests

#### Step 8: SavedSearches Management
**File**: `frontend/src/features/advanced-search/components/SavedSearches.tsx`

**Key Features**:
- List saved searches with timestamps
- Save current search with custom name
- Load saved search (restores filters + query)
- Delete saved search
- Favorite/unfavorite searches
- Filter by search type or favorites-only view

**Test Cases** (9 tests):
- Renders saved searches list
- Save current search mutation
- Load saved search restores state
- Delete saved search mutation
- Toggle favorite status
- Show/hide search details
- Filter by type works
- Filter by favorite only works
- Empty state message

**Deliverable**: ✅ SavedSearches component + tests

#### Step 9: Pagination & Result Navigation
**File**: `frontend/src/features/advanced-search/components/Pagination.tsx`

**Key Features**:
- Page number navigation
- First/previous/next/last buttons
- Results per page dropdown
- Result count display
- Disabled state for first/last pages

**Test Cases** (8 tests):
- Renders pagination controls
- Navigate to page works
- First/previous/next/last buttons
- Results per page dropdown
- Disabled states (first/last page)
- Page validation (no negative pages)
- Result count display
- Keyboard navigation

**Deliverable**: ✅ Pagination component + tests

### Phase 4: Integration & Optimization (Days 9-10)

#### Step 10: AdvancedSearchPage Integration
**File**: `frontend/src/features/advanced-search/AdvancedSearchPage.tsx`

**Key Features**:
- Orchestrate all components
- State management (filters, results, pagination)
- API integration with error handling
- URL state management (query params for bookmarking)
- Performance optimization (memoization, code splitting)

**Integration Points**:
1. SearchBar input → useSearch hook
2. AdvancedFilters → useAdvancedFilters hook
3. SearchResults → Display API response
4. FacetedNavigation → Filter results
5. SavedSearches → Load/save search
6. Pagination → Handle page changes

**Test Cases** (15+ integration tests):
- Page renders with all components
- Search executes with filters
- Results display correctly
- Pagination works end-to-end
- Facet selection filters results
- Save/load search flow
- URL state persistence
- Error handling and recovery
- Performance benchmarks
- i18n language switching
- Responsive layout (mobile/tablet/desktop)
- Accessibility audit
- Keyboard navigation
- Browser history navigation
- Component lifecycle cleanup

**Deliverable**: ✅ AdvancedSearchPage + full integration tests

---

## 🧪 Testing Strategy

### Test Pyramid

```
Integration Tests (15 tests)
         ↑
   ├─────┼─────┐
   │     │     │
Component Tests (50 tests)
   │     │     │
   ├─────┼─────┤
   │     │     │
Unit Tests (20 tests)
   └─────┴─────┘
```

### Test Coverage Goals

| Category | Target | Type |
|----------|--------|------|
| **Unit Tests** | 20 | Hooks, utilities, helpers |
| **Component Tests** | 50+ | Individual component logic |
| **Integration Tests** | 15+ | Component interactions |
| **E2E Smoke Tests** | 5+ | Critical user flows |
| **Total Target** | 100+ | Comprehensive coverage |

### Critical Test Scenarios

1. **Search Flow**
   - User enters search query
   - System debounces and executes search
   - Results display with correct entity type
   - Facets update based on results

2. **Filter Application**
   - Add filter condition
   - Select operator and value
   - Results filter correctly
   - Facets update
   - Save search captures filter state

3. **Pagination Flow**
   - Navigate through pages
   - Results per page changes
   - Page resets when filters change
   - URL state updates

4. **Saved Searches**
   - Save current search with name
   - Load saved search (restores full state)
   - Delete saved search
   - Toggle favorite status

5. **Error Handling**
   - API error → Show error message with retry
   - Invalid filter → Show validation error
   - Empty results → Show "no results" message
   - Network timeout → Show retry prompt

---

## 🎨 UI/UX Considerations

### Layout Design

```
┌─────────────────────────────────────────────┐
│         Advanced Search Page Header          │
│          "Advanced Search & Discovery"       │
└─────────────────────────────────────────────┘
┌─────────────────┬──────────────────────────┐
│   Facets Sidebar │      Main Content Area   │
│ ├─ Status       │  ┌───────────────────┐   │
│ ├─ Type         │  │  Search Bar        │   │
│ ├─ Date Range   │  │ [Search] [Type▼]   │   │
│ ├─ Grade        │  └───────────────────┘   │
│                 │  ┌───────────────────┐   │
│                 │  │ Advanced Filters   │   │
│                 │  │ ├─ Status [▼]     │   │
│                 │  │ ├─ Type [▼]       │   │
│                 │  │ ├─ Date [▼]       │   │
│                 │  │ └─ [+ Add Filter] │   │
│                 │  └───────────────────┘   │
│                 │  ┌───────────────────┐   │
│                 │  │ Saved Searches    │   │
│                 │  │ ├─ Search 1       │   │
│                 │  │ ├─ Search 2       │   │
│                 │  │ └─ [Save Current] │   │
│                 │  └───────────────────┘   │
│                 │  ┌───────────────────┐   │
│                 │  │ Results (125)      │   │
│                 │  │ ├─ Student Card   │   │
│                 │  │ ├─ Course Card    │   │
│                 │  │ ├─ Grade Card     │   │
│                 │  │ └─ ...            │   │
│                 │  └───────────────────┘   │
│                 │  ┌───────────────────┐   │
│                 │  │ Pagination        │   │
│                 │  │ [< 1 2 3 ... >]   │   │
│                 │  │ Results per page  │   │
│                 │  └───────────────────┘   │
└─────────────────┴──────────────────────────┘
```

### Mobile Responsive Design

**Mobile Layout** (< 640px):
- Search bar: Full width
- Filters: Expandable accordion
- Facets: Collapsible sidebar
- Results: Stacked cards (full width)
- Pagination: Simplified controls

**Tablet Layout** (640px - 1024px):
- Search bar: Full width
- Two-column layout:
  - Left: Filters + Facets (collapsible)
  - Right: Results + Pagination

**Desktop Layout** (> 1024px):
- Standard three-column layout
- Fixed sidebar widths
- Full filter controls
- Expanded result cards

---

## 🚀 Performance Optimization Strategy

### Frontend Performance Targets

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| **Search Response** | < 500ms | Backend: ~200-300ms |
| **Component Render** | < 100ms | N/A (new component) |
| **Page Load** | < 1s | N/A (new page) |
| **Filter Update** | < 50ms | N/A (new filter) |

### Optimization Techniques

1. **React Optimization**
   - useMemo() for filter computations
   - useCallback() for event handlers
   - React.memo() for result cards
   - Code splitting for advanced search feature

2. **React Query Optimization**
   - Cache search results (5 minute TTL)
   - Prefetch adjacent pages
   - Keep previous data while loading
   - Stale-while-revalidate strategy

3. **Virtual Scrolling**
   - Display 20 results per page (minimum)
   - Virtual scroll for large result sets
   - Lazy load result details

4. **API Optimization**
   - Backend indexes (already done in Issue #145)
   - Pagination (50 results max per page)
   - Facet aggregation at database level
   - Response caching

---

## 📋 Dependency Check

### Required Completed Issues
- ✅ **Issue #145** - Backend full-text search API (COMPLETE)
- ✅ **Issue #146** - Backend saved searches CRUD (COMPLETE)
- ✅ **Database schema** - Indexes and migrations (COMPLETE)
- ✅ **Frontend infrastructure** - Vitest, i18n, tests (COMPLETE)

### External Dependencies
- ✅ React 18+ (installed)
- ✅ React Query (installed)
- ✅ React Router v7 (installed)
- ✅ Tailwind CSS (installed)
- ✅ React i18next (installed)
- ✅ Vitest (configured)

### No Blocking Issues Found ✅

---

## 📊 Estimation & Timeline

### Effort Breakdown

| Task | Effort | Duration |
|------|--------|----------|
| Type definitions & setup | 4 hours | Day 1 |
| API client + i18n | 3 hours | Day 1 |
| SearchBar component | 6 hours | Day 2 |
| AdvancedFilters component | 8 hours | Day 3 |
| SearchResults component | 8 hours | Day 3-4 |
| Faceted navigation | 6 hours | Day 4 |
| Saved searches | 6 hours | Day 5 |
| Pagination | 4 hours | Day 5 |
| Integration & testing | 12 hours | Day 6-7 |
| Performance optimization | 4 hours | Day 7 |
| Documentation | 3 hours | Day 8 |
| **Total** | **60 hours** | **8 calendar days** |

### Realistic Timeline
- **Sprint Duration**: 1-2 weeks (accounting for testing, debugging, review)
- **Completion Target**: Early February 2026
- **Critical Path**: Backend API ready → Frontend implementation → Testing → Merge

---

## ✅ Pre-Implementation Checklist

Before starting Issue #147, verify:

- [ ] PR #150 merged to main
- [ ] All backend tests passing (18/18 batches)
- [ ] All frontend infrastructure tests passing
- [ ] Database migrations applied
- [ ] Backend search API endpoints verified working
- [ ] Translation keys ready for EN/EL
- [ ] Development environment clean (git status clean)
- [ ] NATIVE or DOCKER deployment ready
- [ ] Feature branch created: `feature/phase4-issue-147`
- [ ] Issue #147 assigned and ready

---

## 🔄 Next Steps

### Immediate Actions (Upon PR #150 Merge)

1. **Create feature branch**
   ```powershell
   git checkout main
   git pull origin main
   git checkout -b feature/phase4-issue-147
   ```

2. **Set up development environment**
   ```powershell
   .\NATIVE.ps1 -Start  # Backend (8000) + Frontend (5173)
   ```

3. **Start implementation**
   - Begin with Step 1: Type definitions
   - Follow 10-step implementation plan
   - Commit frequently with descriptive messages

4. **Daily workflow**
   ```powershell
   # Morning
   git pull origin feature/phase4-issue-147
   .\NATIVE.ps1 -Start
   
   # Before committing
   .\RUN_TESTS_BATCH.ps1
   .\COMMIT_READY.ps1 -Quick
   
   # End of day
   git push origin feature/phase4-issue-147
   ```

### Testing Workflow

1. **Write component** → Run component tests
2. **Integrate with hooks** → Run integration tests
3. **Connect to API** → Run full test suite
4. **Optimize performance** → Run benchmarks
5. **Before merge** → Run full COMMIT_READY.ps1

---

## 📚 Reference Documentation

- [Backend Search API Documentation](../../backend/routers/routers_search.py)
- [Search Service Implementation](../../backend/services/search_service.py)
- [Frontend Testing Guide](../E2E_TESTING_GUIDE.md)
- [Localization Guide](../user/LOCALIZATION.md)
- [Component Architecture](../development/ARCHITECTURE.md)

---

## 🎯 Success Criteria

Issue #147 is **COMPLETE** when:

✅ All 10 implementation steps delivered
✅ 100+ test cases passing
✅ Performance targets met (< 500ms)
✅ Full i18n support (EN/EL)
✅ Accessibility compliance (WCAG 2.1)
✅ Code review approved
✅ Merged to main branch
✅ Documented in UNIFIED_WORK_PLAN.md
✅ Ready for v1.18.0 release

---

**Status**: 🟢 **READY TO BEGIN**
**Depends On**: PR #150 merge (status: open for review)
**Urgency**: High (unblocks Phase 4 completion)
**Next Milestone**: Issue #147 completion → v1.18.0 release

