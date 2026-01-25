# Phase 4 #147 Implementation Plan - Advanced Search Frontend

**Status**: 🚀 READY TO BEGIN
**Prerequisite**: Phase 4 #145 backend tests validation (in progress)
**Timeline**: 4-6 hours for complete Phase 1 implementation
**Components Ready**: SearchView, SearchFacets, SearchSortControls, SearchPagination, useSearchFacets, SearchPage

---

## Phase 1: Component Lifecycle & Core Integration (Phase 4 #147 - Current)

### What's Already Done ✅

**Component Stubs Created**:
- `frontend/src/features/search/SearchView.tsx` - Parent orchestrator (60 lines)
- `frontend/src/features/search/SearchFacets.tsx` - Sidebar filtering (40 lines)
- `frontend/src/features/search/SearchSortControls.tsx` - Sort controls (35 lines)
- `frontend/src/features/search/SearchPagination.tsx` - Pagination (45 lines)
- `frontend/src/features/search/useSearchFacets.ts` - Custom hook (50 lines)
- `frontend/src/pages/SearchPage.tsx` - Page routing (30 lines)

**Design Documentation**:
- `docs/development/PHASE4_ISSUE147_DESIGN.md` - Complete specifications (1,155 lines)
- `docs/development/PHASE4_ISSUE147_REVIEW_SUMMARY.md` - Infrastructure review (433 lines)
- `docs/development/PHASE4_CONTINUATION_GUIDE.md` - Implementation guide

**Tests Staged But Need Completion**:
- Component unit tests (need adding)
- Integration tests (need creating)
- E2E tests (need creating)

---

## Phase 1 Detailed Tasks

### Task 1.1: SearchView Component - Lifecycle Implementation

**Current State**:
```tsx
// Stub with basic structure
export const SearchView: React.FC<SearchViewProps> = ({ onSearch }) => {
  return <div className="search-view">Search View</div>;
};
```

**Implementation Requirements**:

1. **React Query Integration**:
   ```tsx
   const { data, isLoading, error } = useQuery({
     queryKey: ['search', filters, sortBy, page],
     queryFn: () => apiClient.post('/api/v1/search/advanced', {
       query,
       filters,
       sortBy,
       page
     }),
     enabled: !!query,
     staleTime: 30000 // 30 seconds
   });
   ```

2. **State Management**:
   - `query` - Search input string
   - `filters` - Active filter criteria
   - `sortBy` - Current sort order
   - `page` - Current page number
   - `results` - Search results array

3. **Debouncing**:
   ```tsx
   const debouncedSearch = useMemo(
     () => debounce((q: string) => setQuery(q), 300),
     []
   );
   ```

4. **Error Handling**:
   - Network errors → Show error banner with retry
   - No results → Show "No results found" state
   - Invalid filters → Show validation errors

5. **Performance**:
   - Virtual scrolling for large result sets
   - Lazy load facet options
   - Memoize filter components

**Acceptance Criteria**:
- [ ] Renders without errors
- [ ] Search query updates state
- [ ] Debouncing works (300ms)
- [ ] Results display when available
- [ ] Loading state shows spinner
- [ ] Error state shows error message with retry
- [ ] Empty state shows when no results
- [ ] Performance: <1500ms total render time

**Files to Modify**:
- `frontend/src/features/search/SearchView.tsx` (expand from 60 → ~250 lines)
- `frontend/src/hooks/useSearch.ts` (ensure hook exports properly)

---

### Task 1.2: SearchFacets Component - Sidebar Filtering

**Current State**: Empty stub (40 lines)

**Implementation Requirements**:

1. **Facet Data Structure**:
   ```tsx
   interface SearchFacet {
     field: string;
     label: string;
     type: 'checkbox' | 'select' | 'range' | 'date-range';
     values?: Array<{ label: string; count: number; value: string }>;
     min?: number;
     max?: number;
   }
   ```

2. **Facet Groups**:
   - **Student Filters**: Status, enrollment type, grade level
   - **Course Filters**: Department, academic year, credits
   - **Date Filters**: Enrollment date range, updated date
   - **Custom Ranges**: GPA range, attendance percentage

3. **Interactive Features**:
   - Checkbox selection with live counts
   - Expandable/collapsible groups
   - "Show more/less" for long lists
   - Search within facet values
   - Clear all button

4. **State Management**:
   ```tsx
   const [selectedFacets, setSelectedFacets] = useState<Record<string, any>>({});
   const handleFacetChange = (field: string, value: any) => {
     setSelectedFacets(prev => ({...prev, [field]: value}));
     onFiltersChange(selectedFacets);
   };
   ```

**Acceptance Criteria**:
- [ ] Displays all facet types correctly
- [ ] Checkbox facets work with multi-select
- [ ] Date range facets pick start/end dates
- [ ] Facet counts update based on selection
- [ ] Selected facets highlighted visually
- [ ] Clear button removes all selections
- [ ] Mobile responsive (<600px width)
- [ ] Accessibility: WCAG 2.1 AA compliant

**Files to Modify**:
- `frontend/src/features/search/SearchFacets.tsx` (expand from 40 → ~300 lines)

---

### Task 1.3: SearchSortControls Component - Result Ordering

**Current State**: Empty stub (35 lines)

**Implementation Requirements**:

1. **Sort Options**:
   - **Relevance** (default) - BM25 ranking
   - **Name** (A-Z, Z-A)
   - **Created** (Newest, Oldest)
   - **Updated** (Newest, Oldest)
   - **Match Score** (Highest, Lowest)

2. **UI Pattern**:
   ```tsx
   <div className="sort-controls">
     <select value={sortBy} onChange={handleSortChange}>
       <option value="relevance">Relevance</option>
       <option value="name_asc">Name (A-Z)</option>
       <option value="name_desc">Name (Z-A)</option>
       ...
     </select>
     <button onClick={() => toggleResultsView()}>
       {viewType === 'list' ? 'Grid' : 'List'}
     </button>
   </div>
   ```

3. **Result View Modes**:
   - **List View** - Full details per row
   - **Grid View** - Card-based layout
   - **Compact View** - Minimal information

4. **Per-Page Options**: 10, 25, 50, 100 results

**Acceptance Criteria**:
- [ ] Sort dropdown renders all options
- [ ] Selection updates results immediately
- [ ] View toggle switches layouts
- [ ] Per-page dropdown works
- [ ] Selections persist in URL params
- [ ] Mobile: Stacks vertically on small screens
- [ ] Accessibility: Keyboard navigable

**Files to Modify**:
- `frontend/src/features/search/SearchSortControls.tsx` (expand from 35 → ~150 lines)

---

### Task 1.4: SearchPagination Component - Result Navigation

**Current State**: Empty stub (45 lines)

**Implementation Requirements**:

1. **Pagination Modes**:
   - **Offset Pagination** (traditional) - Page 1, 2, 3...
   - **Cursor Pagination** (scroll) - Load more button
   - **Infinite Scroll** - Auto-load on scroll near bottom

2. **UI Components**:
   ```tsx
   <div className="pagination">
     <button onClick={prevPage} disabled={page === 1}>Prev</button>
     <span>{page} of {totalPages}</span>
     <button onClick={nextPage} disabled={page === totalPages}>Next</button>
     <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
       <option value={10}>10 per page</option>
       <option value={25}>25 per page</option>
       ...
     </select>
   </div>
   ```

3. **Performance**:
   - Loading state during page transitions
   - Scroll to top on page change
   - Prefetch next page data

**Acceptance Criteria**:
- [ ] Previous/Next buttons work
- [ ] Page info displays correctly
- [ ] Results update on page change
- [ ] Page size selector works
- [ ] Mobile: Sticky footer pagination
- [ ] Accessibility: Button labels clear

**Files to Modify**:
- `frontend/src/features/search/SearchPagination.tsx` (expand from 45 → ~200 lines)

---

### Task 1.5: useSearchFacets Hook - Facet Logic

**Current State**: Stub (50 lines)

**Implementation Requirements**:

1. **Hook API**:
   ```tsx
   const useSearchFacets = (filters?: any) => {
     const [facets, setFacets] = useState<SearchFacet[]>([]);
     const [loading, setLoading] = useState(false);

     useEffect(() => {
       const fetchFacets = async () => {
         const data = await apiClient.get('/api/v1/search/facets', {
           params: filters
         });
         setFacets(data);
       };
       fetchFacets();
     }, [filters]);

     return { facets, loading, error };
   };
   ```

2. **Facet Aggregation**:
   - Compute available facets based on search query
   - Include result counts per facet value
   - Cache facets for 5 minutes

3. **Filter Validation**:
   - Validate selected facet values
   - Remove invalid selections
   - Show validation errors

**Acceptance Criteria**:
- [ ] Hook returns facets array
- [ ] Facet counts accurate
- [ ] Caching works (5 min TTL)
- [ ] Error handling works
- [ ] Loading state updates
- [ ] Unit tests pass (8+ tests)

**Files to Modify**:
- `frontend/src/features/search/useSearchFacets.ts` (expand from 50 → ~200 lines)
- `frontend/src/hooks/useSearchFacets.ts` (ensure re-export)

---

### Task 1.6: SearchPage Component - Page Integration

**Current State**: Stub (30 lines)

**Implementation Requirements**:

1. **Page Layout**:
   ```tsx
   <div className="search-page">
     <SearchHeader /> {/* Title, breadcrumb */}
     <div className="search-container">
       <aside className="search-sidebar">
         <SearchFacets />
       </aside>
       <main className="search-content">
         <SearchBar />
         <SearchSortControls />
         <SearchResults /> {/* Search results */}
         <SearchPagination />
       </main>
     </div>
   </div>
   ```

2. **URL Routing**:
   - Route: `/search`
   - Query params: `q`, `filters`, `sort`, `page`
   - Sync state with URL

3. **Navigation Integration**:
   - Add "Search" link in main navigation
   - Update site structure

**Acceptance Criteria**:
- [ ] Route renders correctly
- [ ] Layout matches design specs
- [ ] All components integrated
- [ ] URL params sync properly
- [ ] Mobile responsive

**Files to Modify**:
- `frontend/src/pages/SearchPage.tsx` (expand from 30 → ~150 lines)
- `frontend/src/routes.ts` (add search route)

---

## Phase 1 Testing Requirements

### Unit Tests (30+ tests total)

**SearchView Tests** (10+ tests):
- Renders without crashing
- Search input updates state
- Debouncing works correctly
- Results display when available
- Loading state shows spinner
- Error state shows message
- Empty state displays
- Filter changes trigger search
- Sort changes trigger search

**SearchFacets Tests** (8+ tests):
- Renders facet groups
- Checkbox selection works
- Date range selection works
- Facet counts update
- Clear button works
- Mobile layout works

**SearchPagination Tests** (6+ tests):
- Page navigation works
- Page size changes work
- Previous/Next buttons work
- Results update on change

**useSearchFacets Hook Tests** (6+ tests):
- Hook returns facets
- Facets update correctly
- Error handling works
- Loading states correct
- Caching works

### Integration Tests (8+ tests)

- Full search flow (input → filter → sort → paginate)
- Filter changes trigger new search
- URL params sync with state
- Results display correctly
- Performance <1500ms render

### E2E Tests (5+ tests)

- User can perform full search
- User can filter results
- User can change sort order
- User can navigate pages
- Mobile search works

---

## Phase 1 Performance Targets

- **Search Query Time**: <500ms (from API call to results displayed)
- **Debounce Delay**: 300ms (prevents excessive API calls)
- **Render Time**: <1500ms (initial + all interactions)
- **Facet Load**: <300ms (facet sidebar rendering)
- **Page Switch**: <800ms (pagination switch)

---

## Phase 1 Timeline

| Task | Estimated Time | Dependencies |
|------|-----------------|--------------|
| 1.1 - SearchView | 1.5 hours | Backend API ready |
| 1.2 - SearchFacets | 1 hour | Task 1.1 |
| 1.3 - SortControls | 0.5 hours | Task 1.1 |
| 1.4 - Pagination | 0.75 hours | Task 1.1 |
| 1.5 - useSearchFacets | 0.75 hours | Task 1.2 |
| 1.6 - SearchPage | 0.5 hours | All components |
| Testing | 1 hour | All components |
| **Total** | **6 hours** | - |

---

## Success Criteria

✅ All 6 components fully implemented
✅ 30+ unit tests passing
✅ 8+ integration tests passing
✅ 5+ E2E tests passing
✅ Performance targets met
✅ WCAG 2.1 AA accessibility
✅ Full bilingual support (EN/EL)
✅ Mobile responsive (<600px)

---

## Next Steps After Phase 1

**Phase 2 (Issue #148)**: Saved Searches UI/UX
- Create SavedSearchesView component
- Implement save/load functionality
- Favorites management
- Sharing functionality

**Phase 3 (Issue #149)**: QA & Performance
- Load testing (100+ concurrent searches)
- Performance profiling
- Accessibility audit
- Browser compatibility testing

---

## File Summary

**Files to Create**: 0 (all stubs already created)
**Files to Modify**: 6 (expand stubs to full implementation)
**Test Files to Create/Modify**: 6
**Documentation**: Reference design documents

---

**Ready to Begin**: Once Phase 4 #145 backend tests pass ✅
