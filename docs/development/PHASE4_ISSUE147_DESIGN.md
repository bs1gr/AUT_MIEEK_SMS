# Phase 4 Issue #147: Frontend Advanced Search UI & Filters

**Issue**: #147
**Feature**: #142 (Advanced Search & Filtering)
**Parent Issue**: #142
**Status**: 📋 PLANNING - Design Phase
**Date Started**: January 25, 2026
**Target Completion**: February 15, 2026

---

## 📋 Overview

Implement a comprehensive frontend UI for advanced search and filtering that integrates with the backend search API (Issue #145). The UI will provide users with an intuitive interface to search students, courses, and grades using multiple criteria with real-time feedback and saved search functionality.

**Key Objective**: Build upon existing `useSearch` hook, `SearchBar`, and `AdvancedFilters` components to create a complete, production-ready advanced search experience.

---

## 🎯 Acceptance Criteria

- [ ] Advanced search UI integrates with backend `/api/v1/search/advanced` endpoint
- [ ] Multi-criteria filter builder with dynamic field types (text, number, date, select)
- [ ] Real-time search suggestions with debouncing (< 300ms delay)
- [ ] Filter presets for common searches ("Active Students", "High Grades", etc.)
- [ ] Sorting controls (relevance, name, date) with ascending/descending toggle
- [ ] Responsive pagination with infinite scroll option
- [ ] Loading states, skeleton UI, and error handling
- [ ] Empty state messaging with helpful suggestions
- [ ] Full bilingual support (EN/EL) for all UI text
- [ ] WCAG 2.1 Level AA accessibility compliance
- [ ] Mobile-responsive design (320px+)
- [ ] 100% component test coverage
- [ ] E2E tests for critical user flows

---

## 🏗️ Architecture Design

### 1. Component Structure

```
frontend/src/features/search/
├── SearchView.tsx                    # Main search page/view (NEW)
├── components/
│   ├── SearchBar.tsx                 # EXISTING - Enhanced with advanced mode toggle
│   ├── AdvancedFilters.tsx           # EXISTING - Enhanced with backend integration
│   ├── SearchResults.tsx             # EXISTING - Enhanced with sorting UI
│   ├── SavedSearches.tsx             # EXISTING - Enhanced with backend sync
│   ├── SearchFacets.tsx              # NEW - Faceted navigation sidebar
│   ├── SearchSortControls.tsx        # NEW - Sort/order controls
│   └── SearchPagination.tsx          # NEW - Advanced pagination controls
├── hooks/
│   ├── useSearch.ts                  # EXISTING - Enhanced with backend API integration
│   ├── useSavedSearches.ts           # NEW - Backend saved search CRUD
│   └── useSearchFacets.ts            # NEW - Faceted search data
└── styles/
    ├── SearchView.css                # NEW - Main view styles
    ├── SearchFacets.css              # NEW - Facet sidebar styles
    └── SearchSortControls.css        # NEW - Sort controls styles
```

### 2. Existing Infrastructure (Leverage & Enhance)

#### useSearch Hook (428 lines - EXISTING)

**Current Capabilities**:
- `search(query: string, page?: number)` - Basic search with pagination
- `getSuggestions(query: string)` - Real-time suggestions
- `getSuggestionsDebounced(query, delay)` - Debounced suggestions (300ms)
- `advancedFilter(filters: SearchFilters, page?: number)` - Advanced filtering
- `loadMore()` - Pagination continuation
- Caching with `useRef(Map<string, SearchResult[]>)`
- Error handling with i18n messages
- Loading states management

**Enhancements Needed**:
- Integrate with `/api/v1/search/advanced` backend endpoint
- Add sorting parameter support (`sort_by`, `sort_direction`)
- Add faceted search support (`/api/v1/search/facets`)
- Add search performance metrics tracking
- Add filter validation and sanitization

#### SearchBar Component (265 lines - EXISTING)

**Current Capabilities**:
- Autocomplete dropdown with suggestions
- Keyboard navigation (Arrow Up/Down, Enter, Escape)
- Debounced API calls (300ms)
- Clear button functionality
- Click-outside detection
- Icon support (MagnifyingGlass, XMark)

**Enhancements Needed**:
- Add "Advanced Mode" toggle button
- Add search type selector (Students/Courses/Grades)
- Add recent searches quick access
- Add search scope indicator (e.g., "Searching in: Active Students")
- Add voice search button (optional - Phase 2)

#### AdvancedFilters Component (322 lines - EXISTING)

**Current Capabilities**:
- Dynamic filter controls per search type (students/courses/grades)
- Filter presets (Active Students, High Grades, etc.)
- Apply/Reset controls
- Expandable panel with open/close state
- Form validation
- Bilingual labels (EN/EL)

**Enhancements Needed**:
- Add date range picker (created_after/created_before)
- Add multi-select dropdowns for status/enrollment_type
- Add operator selection (equals, contains, greater than, less than)
- Add filter count badge on toggle button
- Add "Save as Preset" functionality
- Add backend filter schema integration

#### SearchResults Component (275 lines - EXISTING)

**Current Capabilities**:
- Results table with pagination
- Loading/error/empty states
- Result type icons (👤 📚 📊)
- Result click handling
- Accessible markup (ARIA labels)

**Enhancements Needed**:
- Add sorting column headers (clickable)
- Add relevance score display
- Add result metadata badges (status, type)
- Add bulk action selection (checkboxes)
- Add export results button (CSV/PDF)
- Add infinite scroll option

#### SavedSearches Component (401 lines - EXISTING)

**Current Capabilities**:
- Save/load/delete searches in localStorage
- Search name input with validation
- Last used timestamp display
- Max 10 saved searches per type
- Star icon indicator

**Enhancements Needed**:
- Migrate from localStorage to backend API (`/api/v1/search/saved`)
- Add favorites/unfavorites toggle
- Add search statistics (usage count, last used)
- Add duplicate search functionality
- Add share search URL generation
- Add search export/import

### 3. New Components to Build

#### SearchView.tsx (Main Orchestrator)

**Purpose**: Main container that orchestrates all search components

**Structure**:
```tsx
export const SearchView: React.FC = () => {
  const { t } = useTranslation();
  const [searchType, setSearchType] = useState<'students' | 'courses' | 'grades'>('students');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

  const {
    results,
    isLoading,
    error,
    search,
    advancedFilter,
    pagination
  } = useSearch(searchType);

  const {
    facets,
    isLoading: facetsLoading
  } = useSearchFacets(searchType, currentQuery);

  return (
    <div className="search-view">
      <div className="search-header">
        <SearchBar
          searchType={searchType}
          onSearch={handleSearch}
          onAdvancedToggle={setShowAdvanced}
          showAdvanced={showAdvanced}
        />
        <SavedSearches
          searchType={searchType}
          currentQuery={currentQuery}
          currentFilters={currentFilters}
          onLoadSearch={handleLoadSearch}
        />
      </div>

      <div className="search-body">
        <aside className="search-sidebar">
          {showAdvanced && (
            <AdvancedFilters
              searchType={searchType}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              isOpen={showAdvanced}
            />
          )}
          <SearchFacets
            facets={facets}
            onFacetSelect={handleFacetSelect}
          />
        </aside>

        <main className="search-main">
          <SearchSortControls
            sortBy={pagination.sortBy}
            sortDirection={pagination.sortDirection}
            onSortChange={handleSortChange}
          />
          <SearchResults
            results={results}
            isLoading={isLoading}
            error={error}
            currentPage={pagination.page}
            hasMore={pagination.hasMore}
            onLoadMore={pagination.loadMore}
            onResultClick={handleResultClick}
          />
          <SearchPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.goToPage}
          />
        </main>
      </div>
    </div>
  );
};
```

**Features**:
- Layout management (header, sidebar, main)
- State coordination between components
- URL query parameter sync (`?q=John&type=students&filters=...`)
- Browser history integration (back/forward buttons)
- Analytics event tracking

#### SearchFacets.tsx (Faceted Navigation)

**Purpose**: Display faceted search results for quick filtering

**Structure**:
```tsx
interface Facet {
  field: string;
  label: string;
  values: { value: string; count: number; selected: boolean }[];
}

export const SearchFacets: React.FC<SearchFacetsProps> = ({
  facets,
  onFacetSelect
}) => {
  return (
    <div className="search-facets">
      <h3>{t('search.facets.title')}</h3>
      {facets.map(facet => (
        <div key={facet.field} className="facet-group">
          <h4>{facet.label}</h4>
          <ul>
            {facet.values.map(value => (
              <li key={value.value}>
                <button
                  className={value.selected ? 'selected' : ''}
                  onClick={() => onFacetSelect(facet.field, value.value)}
                >
                  {value.value} ({value.count})
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
```

**Facet Types**:
- Status: Active (25), Inactive (3), Suspended (1)
- Enrollment Type: Full-time (20), Part-time (9)
- Month Enrolled: Sep (10), Oct (8), Nov (6)
- Grade Range: A (5), B (12), C (8), D/F (3)

#### SearchSortControls.tsx

**Purpose**: Sort and order controls for results

**Structure**:
```tsx
export const SearchSortControls: React.FC<SearchSortControlsProps> = ({
  sortBy,
  sortDirection,
  onSortChange
}) => {
  const sortOptions = [
    { value: 'relevance', label: t('search.sort.relevance') },
    { value: 'name', label: t('search.sort.name') },
    { value: 'created_at', label: t('search.sort.dateCreated') },
    { value: 'updated_at', label: t('search.sort.dateUpdated') }
  ];

  return (
    <div className="search-sort-controls">
      <label>{t('search.sort.label')}</label>
      <select value={sortBy} onChange={e => onSortChange(e.target.value, sortDirection)}>
        {sortOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={() => onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc')}
        aria-label={t('search.sort.toggleDirection')}
      >
        {sortDirection === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
};
```

#### SearchPagination.tsx

**Purpose**: Advanced pagination controls with page jumper

**Structure**:
```tsx
export const SearchPagination: React.FC<SearchPaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const [jumpTo, setJumpTo] = useState('');

  return (
    <div className="search-pagination">
      <div className="pagination-info">
        {t('search.pagination.showing', {
          start: (page - 1) * pageSize + 1,
          end: Math.min(page * pageSize, total),
          total
        })}
      </div>
      <div className="pagination-controls">
        <button onClick={() => onPageChange(1)} disabled={page === 1}>
          {t('search.pagination.first')}
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          {t('search.pagination.previous')}
        </button>
        <span>{t('search.pagination.page', { page, totalPages })}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          {t('search.pagination.next')}
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          {t('search.pagination.last')}
        </button>
      </div>
      <div className="pagination-jumper">
        <input
          type="number"
          min="1"
          max={totalPages}
          value={jumpTo}
          onChange={e => setJumpTo(e.target.value)}
          placeholder={t('search.pagination.jumpToPage')}
        />
        <button onClick={() => onPageChange(parseInt(jumpTo))}>
          {t('common.go')}
        </button>
      </div>
    </div>
  );
};
```

### 4. Backend API Integration

#### Endpoint Integration Map

| Frontend Hook/Component | Backend Endpoint | Method | Purpose |
|------------------------|------------------|--------|---------|
| `useSearch.search()` | `/api/v1/search/advanced` | POST | Advanced search with filters/sort |
| `useSearch.getSuggestions()` | `/api/v1/search/suggestions` | GET | Real-time autocomplete |
| `useSearchFacets()` | `/api/v1/search/facets` | GET | Faceted navigation data |
| `useSavedSearches.create()` | `/api/v1/search/saved` | POST | Save search to backend |
| `useSavedSearches.list()` | `/api/v1/search/saved` | GET | Get user's saved searches |
| `useSavedSearches.delete()` | `/api/v1/search/saved/{id}` | DELETE | Delete saved search |
| `useSavedSearches.toggleFavorite()` | `/api/v1/search/saved/{id}/favorite` | PATCH | Toggle favorite status |

#### Request/Response Types

**Advanced Search Request**:
```typescript
interface AdvancedSearchRequest {
  query: string;
  filters?: {
    status?: string[];
    enrollment_type?: string[];
    created_after?: string;  // ISO date
    created_before?: string; // ISO date
    grade_min?: number;
    grade_max?: number;
  };
  sort?: {
    field: 'relevance' | 'name' | 'created_at' | 'updated_at';
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}
```

**Advanced Search Response**:
```typescript
interface AdvancedSearchResponse {
  success: true;
  data: {
    results: SearchResult[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    filters_applied: Record<string, string>;
  };
  meta: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}
```

**Facets Response**:
```typescript
interface FacetsResponse {
  success: true;
  data: {
    status: Record<string, number>;      // { "active": 25, "inactive": 3 }
    enrollment_type: Record<string, number>;
    months: Record<string, number>;      // { "2025-09": 10, "2025-10": 8 }
  };
  meta: {...};
}
```

**Saved Search CRUD**:
```typescript
interface SavedSearch {
  id: number;
  user_id: number;
  name: string;
  search_type: 'students' | 'courses' | 'grades';
  query: string;
  filters: SearchFilters;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_used: string;
  usage_count: number;
}
```

---

## 📊 UI/UX Design Specifications

### 1. Layout & Responsive Design

**Desktop (≥ 1024px)**:
```
┌─────────────────────────────────────────────────────────────┐
│ [SearchBar with Advanced Toggle]    [SavedSearches Badge]  │
├─────────────────┬───────────────────────────────────────────┤
│ Sidebar (300px) │ Main Content (flex-1)                     │
│                 │                                           │
│ [AdvancedFilter]│ [SortControls]                            │
│                 │ [SearchResults Table]                     │
│ [SearchFacets]  │                                           │
│                 │ [Pagination]                              │
└─────────────────┴───────────────────────────────────────────┘
```

**Tablet (768px - 1023px)**:
```
┌───────────────────────────────────────────┐
│ [SearchBar]              [SavedSearches]  │
├───────────────────────────────────────────┤
│ [Filter/Facet Toggle Button]              │
├───────────────────────────────────────────┤
│ [SortControls]                            │
│ [SearchResults Grid (2 columns)]          │
│ [Pagination]                              │
└───────────────────────────────────────────┘
```

**Mobile (320px - 767px)**:
```
┌─────────────────────┐
│ [SearchBar]         │
│ [Filter Button]     │
├─────────────────────┤
│ [Results (Cards)]   │
│ [Load More Button]  │
└─────────────────────┘
```

### 2. Color Scheme & Theming

**Light Mode**:
- Primary: `#3b82f6` (blue-500)
- Secondary: `#64748b` (slate-500)
- Success: `#10b981` (green-500)
- Background: `#ffffff`
- Border: `#e2e8f0` (slate-200)

**Dark Mode**:
- Primary: `#60a5fa` (blue-400)
- Secondary: `#94a3b8` (slate-400)
- Success: `#34d399` (green-400)
- Background: `#1e293b` (slate-900)
- Border: `#334155` (slate-700)

### 3. Loading States

**Skeleton UI** (during initial load):
```tsx
<div className="search-results-skeleton">
  {[...Array(5)].map((_, i) => (
    <div key={i} className="skeleton-row">
      <div className="skeleton-icon"></div>
      <div className="skeleton-text skeleton-text-long"></div>
      <div className="skeleton-text skeleton-text-short"></div>
    </div>
  ))}
</div>
```

**Loading More** (pagination):
- Show spinner at bottom of results
- Disable "Load More" button
- Display "Loading..." text

**Search Suggestions** (autocomplete):
- Show spinner inside search input
- Display "Searching..." text
- Keep previous suggestions visible

### 4. Error Handling

**Error Types & Messages**:

| Error Type | Display | Action |
|-----------|---------|--------|
| Network Error | Toast notification | "Retry" button |
| Invalid Query | Inline error | Clear search, show suggestions |
| No Results | Empty state | "Try different filters" |
| Server Error (500) | Modal dialog | "Contact support" |
| Rate Limit (429) | Toast notification | "Try again in X seconds" |

**Empty State UI**:
```tsx
<div className="search-empty-state">
  <MagnifyingGlassIcon className="empty-icon" />
  <h3>{t('search.emptyState.title')}</h3>
  <p>{t('search.emptyState.message')}</p>
  <ul className="suggestions">
    <li>{t('search.emptyState.suggestion1')}</li>
    <li>{t('search.emptyState.suggestion2')}</li>
    <li>{t('search.emptyState.suggestion3')}</li>
  </ul>
  <button onClick={handleResetFilters}>
    {t('search.emptyState.resetFilters')}
  </button>
</div>
```

### 5. Accessibility (WCAG 2.1 Level AA)

**Keyboard Navigation**:
- `Tab` - Move through interactive elements
- `Enter` - Activate buttons/links
- `Space` - Toggle checkboxes/switches
- `Arrow Keys` - Navigate suggestions/facets
- `Escape` - Close modals/dropdowns

**ARIA Labels**:
```tsx
<input
  type="search"
  role="searchbox"
  aria-label={t('search.ariaLabel.searchInput')}
  aria-describedby="search-instructions"
/>

<div role="status" aria-live="polite" aria-atomic="true">
  {t('search.ariaLabel.resultsCount', { count: results.length })}
</div>

<button
  aria-expanded={showAdvanced}
  aria-controls="advanced-filters-panel"
  aria-label={t('search.ariaLabel.toggleFilters')}
>
  {t('search.advanced.title')}
</button>
```

**Screen Reader Announcements**:
- Announce result count on search completion
- Announce filter application
- Announce loading states
- Announce error messages

---

## 🌍 Internationalization (i18n)

### Translation Keys to Add

**search.ts (English)**:
```typescript
export default {
  // ... existing keys
  sort: {
    label: 'Sort by',
    relevance: 'Relevance',
    name: 'Name',
    dateCreated: 'Date Created',
    dateUpdated: 'Date Updated',
    toggleDirection: 'Toggle sort direction'
  },
  pagination: {
    showing: 'Showing {{start}}-{{end}} of {{total}} results',
    page: 'Page {{page}} of {{totalPages}}',
    first: 'First',
    previous: 'Previous',
    next: 'Next',
    last: 'Last',
    jumpToPage: 'Jump to page...'
  },
  facets: {
    title: 'Refine Results',
    status: 'Status',
    enrollmentType: 'Enrollment Type',
    month: 'Month Enrolled',
    gradeRange: 'Grade Range'
  },
  emptyState: {
    title: 'No results found',
    message: 'Try adjusting your search or filters',
    suggestion1: 'Check your spelling',
    suggestion2: 'Use fewer filters',
    suggestion3: 'Try a different search term',
    resetFilters: 'Reset All Filters'
  },
  ariaLabel: {
    searchInput: 'Search for students, courses, or grades',
    resultsCount: '{{count}} results found',
    toggleFilters: 'Toggle advanced filters',
    sortBy: 'Sort results by',
    pagination: 'Pagination controls'
  }
};
```

**search.ts (Greek - el)**:
```typescript
export default {
  // ... existing keys
  sort: {
    label: 'Ταξινόμηση κατά',
    relevance: 'Συνάφεια',
    name: 'Όνομα',
    dateCreated: 'Ημερομηνία Δημιουργίας',
    dateUpdated: 'Ημερομηνία Ενημέρωσης',
    toggleDirection: 'Αλλαγή κατεύθυνσης ταξινόμησης'
  },
  pagination: {
    showing: 'Εμφάνιση {{start}}-{{end}} από {{total}} αποτελέσματα',
    page: 'Σελίδα {{page}} από {{totalPages}}',
    first: 'Πρώτη',
    previous: 'Προηγούμενη',
    next: 'Επόμενη',
    last: 'Τελευταία',
    jumpToPage: 'Μετάβαση σε σελίδα...'
  },
  // ... rest of translations
};
```

---

## 🧪 Testing Strategy

### Unit Tests (Component Tests)

**SearchView.test.tsx**:
```typescript
describe('SearchView', () => {
  it('renders search bar and saved searches', () => {
    render(<SearchView />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByLabelText(/saved searches/i)).toBeInTheDocument();
  });

  it('toggles advanced filters on button click', () => {
    render(<SearchView />);
    const toggleButton = screen.getByText(/advanced filters/i);
    fireEvent.click(toggleButton);
    expect(screen.getByRole('region', { name: /advanced filters/i })).toBeVisible();
  });

  it('updates URL query params on search', () => {
    const { history } = renderWithRouter(<SearchView />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    fireEvent.submit(searchInput.closest('form'));
    expect(history.location.search).toContain('q=John');
  });
});
```

**SearchFacets.test.tsx**:
```typescript
describe('SearchFacets', () => {
  it('displays facet groups with counts', () => {
    const facets = [
      {
        field: 'status',
        label: 'Status',
        values: [
          { value: 'active', count: 25, selected: false },
          { value: 'inactive', count: 3, selected: false }
        ]
      }
    ];
    render(<SearchFacets facets={facets} onFacetSelect={jest.fn()} />);
    expect(screen.getByText('active (25)')).toBeInTheDocument();
  });

  it('calls onFacetSelect with field and value', () => {
    const onFacetSelect = jest.fn();
    render(<SearchFacets facets={mockFacets} onFacetSelect={onFacetSelect} />);
    fireEvent.click(screen.getByText('active (25)'));
    expect(onFacetSelect).toHaveBeenCalledWith('status', 'active');
  });
});
```

**useSearch.test.ts** (Enhanced):
```typescript
describe('useSearch - Backend Integration', () => {
  it('calls /api/v1/search/advanced with correct payload', async () => {
    const { result } = renderHook(() => useSearch('students'));

    await act(async () => {
      await result.current.advancedFilter({
        status: ['active'],
        created_after: '2025-09-01'
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/search/advanced', {
      query: '',
      filters: {
        status: ['active'],
        created_after: '2025-09-01'
      },
      sort: { field: 'relevance', direction: 'desc' },
      limit: 20,
      offset: 0
    });
  });
});
```

### Integration Tests

**SearchFlow.integration.test.tsx**:
```typescript
describe('Search Flow Integration', () => {
  it('completes full search workflow', async () => {
    render(<SearchView />);

    // 1. Enter search query
    const searchInput = screen.getByRole('searchbox');
    await userEvent.type(searchInput, 'John');

    // 2. Select suggestion
    await waitFor(() => screen.getByText('John Doe'));
    await userEvent.click(screen.getByText('John Doe'));

    // 3. Apply filter
    await userEvent.click(screen.getByText(/advanced filters/i));
    await userEvent.click(screen.getByText('Active Students'));

    // 4. Verify results
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

**advanced-search.spec.ts**:
```typescript
test.describe('Advanced Search', () => {
  test('searches students with multiple filters', async ({ page }) => {
    await page.goto('/search');

    // Open advanced filters
    await page.click('button:has-text("Advanced Filters")');

    // Fill filters
    await page.fill('input[placeholder="First Name"]', 'John');
    await page.selectOption('select[name="status"]', 'active');
    await page.fill('input[name="created_after"]', '2025-09-01');

    // Apply filters
    await page.click('button:has-text("Apply Filters")');

    // Verify results
    await expect(page.locator('.search-results tbody tr')).toHaveCount(5);
    await expect(page.locator('text=John')).toBeVisible();
    await expect(page.locator('.filter-badge:has-text("Active")')).toBeVisible();
  });

  test('saves and loads search', async ({ page }) => {
    // Perform search
    await page.goto('/search?q=John&status=active');

    // Save search
    await page.click('button[aria-label="Saved Searches"]');
    await page.fill('input[placeholder="Enter search name"]', 'My Search');
    await page.click('button:has-text("Save")');

    // Clear search
    await page.goto('/search');

    // Load saved search
    await page.click('button[aria-label="Saved Searches"]');
    await page.click('text=My Search');

    // Verify search restored
    await expect(page.locator('input[type="search"]')).toHaveValue('John');
    await expect(page.locator('.filter-badge:has-text("Active")')).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/search');

    // Type in search box
    await page.keyboard.type('John');

    // Arrow down to first suggestion
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Select with Enter
    await page.keyboard.press('Enter');

    // Verify result loaded
    await expect(page.locator('.search-results')).toBeVisible();
  });
});
```

### Performance Tests

**search-performance.test.ts**:
```typescript
describe('Search Performance', () => {
  it('loads results in < 1000ms', async () => {
    const startTime = performance.now();

    render(<SearchView />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => screen.getByRole('table'), { timeout: 1000 });

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('handles 100+ results without lag', async () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      first_name: `Student${i}`,
      last_name: 'Test',
      email: `student${i}@test.com`
    }));

    apiClient.post.mockResolvedValue({ data: { results: largeDataset } });

    render(<SearchResults results={largeDataset} {...defaultProps} />);

    // Verify all rows rendered
    expect(screen.getAllByRole('row')).toHaveLength(101); // 100 + header
  });
});
```

---

## 🔄 Implementation Phases

### Phase 1: Backend Integration (3 days)

**Day 1**: Hook Enhancements
- [ ] Update `useSearch` to call `/api/v1/search/advanced`
- [ ] Add sorting parameters to `advancedFilter()` method
- [ ] Implement error handling for API failures
- [ ] Add unit tests for new functionality

**Day 2**: Saved Searches Backend Sync
- [ ] Create `useSavedSearches` hook
- [ ] Implement CRUD operations (`create`, `list`, `delete`, `toggleFavorite`)
- [ ] Migrate `SavedSearches` component from localStorage to backend
- [ ] Add unit tests for saved search operations

**Day 3**: Faceted Search
- [ ] Create `useSearchFacets` hook
- [ ] Integrate with `/api/v1/search/facets` endpoint
- [ ] Build `SearchFacets` component
- [ ] Add unit tests for faceted search

### Phase 2: UI Components (4 days)

**Day 4**: SearchView Main Container
- [ ] Create `SearchView.tsx` layout
- [ ] Implement responsive sidebar toggle
- [ ] Add URL query parameter sync
- [ ] Wire up all child components

**Day 5**: Enhanced Components
- [ ] Add advanced mode toggle to `SearchBar`
- [ ] Enhance `AdvancedFilters` with date pickers
- [ ] Add sort controls to `SearchResults`
- [ ] Implement filter count badges

**Day 6**: New Components
- [ ] Build `SearchSortControls` component
- [ ] Build `SearchPagination` component with page jumper
- [ ] Create skeleton loading states
- [ ] Implement empty state UI

**Day 7**: Polish & Accessibility
- [ ] Add keyboard navigation
- [ ] Implement ARIA labels and live regions
- [ ] Test with screen reader
- [ ] Mobile responsive testing

### Phase 3: Testing (2 days)

**Day 8**: Unit & Integration Tests
- [ ] Write component unit tests (SearchView, SearchFacets, etc.)
- [ ] Write hook unit tests (useSearch, useSavedSearches, useSearchFacets)
- [ ] Write integration tests for search workflows
- [ ] Achieve 100% test coverage

**Day 9**: E2E Tests
- [ ] Write Playwright E2E tests for search flows
- [ ] Test saved search functionality end-to-end
- [ ] Test keyboard navigation
- [ ] Performance benchmarking

### Phase 4: i18n & Documentation (2 days)

**Day 10**: Internationalization
- [ ] Add all new translation keys (EN)
- [ ] Add Greek translations (EL)
- [ ] Test language switching
- [ ] Verify translation integrity tests pass

**Day 11**: Documentation & Cleanup
- [ ] Update component documentation
- [ ] Create user guide for advanced search
- [ ] Code review and refactoring
- [ ] Final QA and bug fixes

---

## 📏 Success Metrics

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 1s | Time to first render |
| Search Response | < 500ms | API call + UI update |
| Suggestion Display | < 300ms | Debounced autocomplete |
| Filter Application | < 200ms | UI state update |
| Page Navigation | < 100ms | Instant UI feedback |

### Quality Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | 100% | Lines/branches/functions |
| Accessibility | WCAG 2.1 AA | Automated + manual testing |
| Mobile Score | > 90 | Lighthouse mobile audit |
| Bundle Size Impact | < 50KB | Gzipped new code |
| Translation Parity | 100% | EN/EL key matching |

### User Experience Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search Success Rate | > 90% | Users find what they need |
| Filter Usage | > 40% | % of searches using filters |
| Saved Search Usage | > 20% | % of users saving searches |
| Error Rate | < 1% | Failed searches/total searches |
| Mobile Usability | > 85% | Task completion on mobile |

---

## 🔗 Dependencies & Prerequisites

### Prerequisites (Must be complete)

- ✅ Issue #145: Backend Search API complete
- ✅ Issue #146: SavedSearch CRUD endpoints available
- ✅ Existing `useSearch`, `SearchBar`, `AdvancedFilters` components functional
- ✅ Backend migrations for search indexes applied
- ✅ Authentication system working (JWT tokens)

### External Dependencies

- `react-i18next`: Translation framework
- `@heroicons/react`: Icon library
- `@tanstack/react-query`: API state management
- `react-router-dom`: URL routing and navigation
- `date-fns`: Date formatting (for date pickers)

### Optional Enhancements (Phase 2)

- Voice search integration (Web Speech API)
- Export results to CSV/PDF
- Advanced analytics dashboard
- Search history visualization
- AI-powered search suggestions

---

## 🐛 Known Risks & Mitigation

### Risk 1: API Performance Degradation

**Risk**: Backend search API becomes slow with large datasets
**Impact**: High - User experience suffers
**Mitigation**:
- Implement client-side caching with React Query
- Add pagination with reasonable page sizes (20 results)
- Show skeleton UI during loading
- Add timeout handling (abort after 10s)

### Risk 2: Translation Integrity Failures

**Risk**: Missing or mismatched EN/EL translations
**Impact**: Medium - Breaks bilingual experience
**Mitigation**:
- Run translation integrity tests in pre-commit hook
- Use translation key constants (avoid magic strings)
- Document all new keys in this design doc
- Manual QA testing in both languages

### Risk 3: Mobile Responsiveness Issues

**Risk**: Complex filter UI doesn't work on small screens
**Impact**: High - Mobile users can't use advanced search
**Mitigation**:
- Mobile-first CSS approach
- Test on real devices (320px width minimum)
- Implement collapsible panels for mobile
- Use native mobile controls (date pickers, selects)

### Risk 4: Accessibility Compliance Failures

**Risk**: Screen readers can't navigate search interface
**Impact**: High - Legal/compliance issues
**Mitigation**:
- ARIA labels on all interactive elements
- Keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
- Automated accessibility audits (axe-core)

---

## 📞 Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Developer testing and bug fixes
- Performance optimization
- Translation verification

### Phase 2: Beta Testing (Week 2)
- Enable for 10% of users (feature flag)
- Collect user feedback
- Monitor analytics and error rates
- Fix critical bugs

### Phase 3: Full Rollout (Week 3)
- Enable for all users
- Monitor performance metrics
- Provide user training/documentation
- Collect feedback for improvements

### Rollback Plan

If critical issues arise:
1. Disable feature flag (instant rollback)
2. Revert to basic search UI
3. Fix issues in development
4. Re-test and redeploy

---

## 📚 References

- [Phase 4 Parent Issue #142](../../plans/UNIFIED_WORK_PLAN.md#phase-4-feature-142)
- [Backend Search API Design (Issue #145)](./PHASE4_ISSUE145_DESIGN.md)
- [Existing useSearch Hook](../../frontend/src/hooks/useSearch.ts)
- [Existing SearchBar Component](../../frontend/src/components/SearchBar.tsx)
- [Existing AdvancedFilters Component](../../frontend/src/components/AdvancedFilters.tsx)
- [i18n Translation Guide](../user/LOCALIZATION.md)
- [Accessibility Guidelines](../development/ACCESSIBILITY_GUIDELINES.md)
- [Component Testing Patterns](../development/TESTING_GUIDE.md)

---

**Document Owner**: AI Agent
**Last Updated**: January 25, 2026
**Status**: 📋 PLANNING - Ready for Implementation
**Next Steps**: Review design with stakeholder → Begin Phase 1 implementation
