# Advanced Search & Filtering - Components Usage Guide

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 17, 2026

## Overview

The Advanced Search & Filtering system provides 4 reusable React components for building powerful search interfaces. All components support TypeScript, i18n (EN/EL), accessibility (WCAG 2.1 AA), and responsive design.

## Component Architecture

```text
┌─────────────────────────────────────────┐
│  SearchPage (Page-level container)      │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │  SearchBar (Search input)        │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  AdvancedFilters (Filter panel)  │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  SearchResults (Results table)   │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  SavedSearches (History sidebar) │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘

```text
---

## 1. SearchBar Component

Real-time search input with autocomplete suggestions and keyboard navigation.

### Location

```text
frontend/src/components/SearchBar.tsx
frontend/src/components/SearchBar.module.css

```text
### Props

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;        // Called when user searches
  onSuggestionsChange?: (suggestions: any[]) => void;
  placeholder?: string;                      // Default: "Search..."
  searchType?: 'student' | 'course' | 'grade'; // What to search for
  debounceDelay?: number;                   // Default: 300ms
  disabled?: boolean;                       // Disable input
}

```text
### Basic Usage

```tsx
import { SearchBar } from '@/components/SearchBar';

export function MySearchPage() {
  const handleSearch = (query: string) => {
    console.log('Search for:', query);
    // Make API call to search
  };

  return (
    <SearchBar
      onSearch={handleSearch}
      placeholder="Search students..."
      searchType="student"
    />
  );
}

```text
### With Suggestions

```tsx
import { SearchBar } from '@/components/SearchBar';
import { useSearch } from '@/hooks/useSearch';

export function SearchWithSuggestions() {
  const { search, getSuggestionsDebounced } = useSearch();
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (query: string) => {
    await search(query, 'student');
  };

  const handleQueryChange = (query: string) => {
    if (query.length > 1) {
      getSuggestionsDebounced('student', query).then(setSuggestions);
    }
  };

  return (
    <SearchBar
      onSearch={handleSearch}
      onSuggestionsChange={handleQueryChange}
      suggestions={suggestions}
      searchType="student"
    />
  );
}

```text
### Features

- ✅ Real-time debounced suggestions (300ms)
- ✅ Keyboard navigation (↑↓ select, Enter search, Escape close)
- ✅ Clear button
- ✅ Search type selector
- ✅ Loading indicator during suggestions
- ✅ ARIA labels for accessibility
- ✅ Responsive design (mobile-friendly)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate suggestions |
| Enter | Perform search |
| Escape | Close suggestions |
| Tab | Move to next field |

### Styling

Override default styles:

```tsx
<div style={{ '--search-bg': '#f5f5f5' }}>
  <SearchBar onSearch={handleSearch} />
</div>

```text
CSS variables:
- `--search-bg`: Background color
- `--search-border`: Border color
- `--search-focus`: Focus state color
- `--search-text`: Text color

---

## 2. SearchResults Component

Displays paginated search results in a sortable table with filtering.

### Location

```text
frontend/src/components/SearchResults.tsx

```text
### Props

```typescript
interface SearchResultsProps {
  results: any[];                          // Search results array
  totalCount: number;                      // Total result count
  currentPage: number;                     // Current page number
  pageSize: number;                        // Results per page
  onPageChange: (page: number) => void;    // Called when page changes
  resultType: 'student' | 'course' | 'grade'; // Type of results
  isLoading?: boolean;                     // Show loading state
  error?: string;                          // Show error message
  onRowClick?: (item: any) => void;        // Handle row click
  allowSelect?: boolean;                   // Show checkboxes
}

```text
### Basic Usage

```tsx
import { SearchResults } from '@/components/SearchResults';

export function MySearchResults() {
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const handleSearch = async (query: string) => {
    const response = await apiClient.post('/search/students', {
      query,
      page: 1,
      page_size: 20
    });

    setResults(response.data.results);
    setTotal(response.data.total);
  };

  return (
    <>
      <SearchBar onSearch={handleSearch} />
      <SearchResults
        results={results}
        totalCount={total}
        currentPage={page}
        pageSize={20}
        resultType="student"
        onPageChange={setPage}
      />
    </>
  );
}

```text
### With Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSearch = async (query: string) => {
  setIsLoading(true);
  try {
    const response = await apiClient.post('/search/students', {
      query,
      page: 1,
      page_size: 20
    });
    setResults(response.data.results);
  } finally {
    setIsLoading(false);
  }
};

return (
  <SearchResults
    results={results}
    totalCount={total}
    currentPage={page}
    pageSize={20}
    resultType="student"
    onPageChange={setPage}
    isLoading={isLoading}
  />
);

```text
### With Error Handling

```tsx
return (
  <SearchResults
    results={results}
    totalCount={total}
    currentPage={page}
    pageSize={20}
    resultType="student"
    onPageChange={setPage}
    error={error}
    isLoading={isLoading}
  />
);

```text
### Features

- ✅ Sortable columns
- ✅ Pagination with previous/next buttons
- ✅ Row selection with checkboxes
- ✅ Empty state handling
- ✅ Error state display
- ✅ Loading skeleton
- ✅ Responsive table (horizontal scroll on mobile)
- ✅ Row click handlers
- ✅ ARIA labels for accessibility

### Dynamic Columns by Type

**Students**: ID, First Name, Last Name, Email, Phone
**Courses**: ID, Name, Code, Credits, Description
**Grades**: Student, Course, Grade, Date

---

## 3. AdvancedFilters Component

Collapsible filter panel with type-specific filters and presets.

### Location

```text
frontend/src/components/AdvancedFilters.tsx
frontend/src/components/AdvancedFilters.css

```text
### Props

```typescript
interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterConfig) => void;
  filterType: 'student' | 'course' | 'grade'; // Type of filters
  presets?: FilterPreset[];                 // Filter presets
  onApply: () => void;                      // Called when Apply clicked
  onReset: () => void;                      // Called when Reset clicked
}

```text
### Basic Usage

```tsx
import { AdvancedFilters } from '@/components/AdvancedFilters';

export function MyFilteredSearch() {
  const [filters, setFilters] = useState({});

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApply = () => {
    // Make API call with filters
    console.log('Applied filters:', filters);
  };

  return (
    <>
      <AdvancedFilters
        filterType="student"
        onFiltersChange={handleFiltersChange}
        onApply={handleApply}
        onReset={() => setFilters({})}
      />
      <SearchResults {...props} />
    </>
  );
}

```text
### With Presets

```tsx
const studentPresets = [
  { name: 'Active Students', filters: { status: 'active' } },
  { name: 'High Performers', filters: { min_gpa: 3.5 } },
  { name: 'Enrolled Students', filters: { enrolled: true } },
];

return (
  <AdvancedFilters
    filterType="student"
    presets={studentPresets}
    onFiltersChange={handleFiltersChange}
    onApply={handleApply}
    onReset={() => setFilters({})}
  />
);

```text
### Filter Types

**Student Filters**:
- Name (text search)
- Email (email input)
- Status (dropdown: active/inactive)
- GPA Range (number inputs: min/max)

**Course Filters**:
- Name (text search)
- Code (text search)
- Credit Range (number inputs: min/max)
- Department (dropdown)

**Grade Filters**:
- Student (dropdown/autocomplete)
- Course (dropdown/autocomplete)
- Grade Range (number inputs: min/max)
- Date Range (date pickers)

### Features

- ✅ Type-specific filters
- ✅ 5 built-in presets per type
- ✅ Apply and Reset buttons
- ✅ Filter validation
- ✅ Collapsible panel
- ✅ Clear individual filters
- ✅ Responsive layout
- ✅ ARIA labels and announcements

### Styling

```tsx
<div className="advanced-filters-container">
  <AdvancedFilters
    filterType="student"
    onFiltersChange={handleFiltersChange}
    onApply={handleApply}
    onReset={handleReset}
  />
</div>

```text
---

## 4. SavedSearches Component

Sidebar showing saved searches with load, delete, and rename functionality.

### Location

```text
frontend/src/components/SavedSearches.tsx
frontend/src/components/SavedSearches.css

```text
### Props

```typescript
interface SavedSearchesProps {
  searches: SavedSearch[];               // Array of saved searches
  onLoadSearch: (search: SavedSearch) => void; // Load a saved search
  onDeleteSearch: (searchId: string) => void;  // Delete a search
  onRenameSearch?: (searchId: string, newName: string) => void;
  onSaveSearch: (name: string, filters: FilterConfig) => void;
  maxSavedSearches?: number;            // Default: 10
}

interface SavedSearch {
  id: string;
  name: string;
  filters: FilterConfig;
  createdAt: Date;
  lastUsed: Date;
}

```text
### Basic Usage

```tsx
import { SavedSearches } from '@/components/SavedSearches';

export function SearchPageWithHistory() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const handleSaveSearch = async (name: string, filters: any) => {
    const newSearch = {
      id: generateId(),
      name,
      filters,
      createdAt: new Date(),
      lastUsed: new Date(),
    };
    setSavedSearches([...savedSearches, newSearch]);
    // Also save to localStorage/API
  };

  const handleLoadSearch = (search: SavedSearch) => {
    // Apply filters
    setFilters(search.filters);
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(
      savedSearches.filter(s => s.id !== searchId)
    );
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <SavedSearches
        searches={savedSearches}
        onLoadSearch={handleLoadSearch}
        onDeleteSearch={handleDeleteSearch}
        onSaveSearch={handleSaveSearch}
        maxSavedSearches={10}
      />
      <div style={{ flex: 1 }}>
        {/* Main search components */}
      </div>
    </div>
  );
}

```text
### With API Integration

```tsx
const handleSaveSearch = async (name: string, filters: any) => {
  const response = await apiClient.post('/saved-searches', {
    name,
    filters,
    type: 'student'
  });

  setSavedSearches([...savedSearches, response.data]);
};

const handleDeleteSearch = async (searchId: string) => {
  await apiClient.delete(`/saved-searches/${searchId}`);
  setSavedSearches(
    savedSearches.filter(s => s.id !== searchId)
  );
};

```text
### Features

- ✅ localStorage persistence
- ✅ Max 10 saves per type
- ✅ Last used tracking
- ✅ Load search with filters
- ✅ Delete search
- ✅ Rename search
- ✅ Sidebar with icons
- ✅ Empty state message
- ✅ Responsive layout
- ✅ ARIA labels and buttons

### localStorage Format

Saved searches stored as:

```json
{
  "search_<type>_<id>": {
    "id": "search_student_123",
    "name": "High Performers",
    "filters": { "min_gpa": 3.5 },
    "createdAt": "2026-01-17T12:00:00Z",
    "lastUsed": "2026-01-17T15:00:00Z"
  }
}

```text
---

## Integration Example

Complete search page combining all components:

```tsx
import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { SearchBar } from '@/components/SearchBar';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { SearchResults } from '@/components/SearchResults';
import { SavedSearches } from '@/components/SavedSearches';

export function AdvancedSearchPage() {
  const { search, statistics } = useSearch();

  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const data = await search(query, 'student', filters, {
        page: 1,
        page_size: 20
      });
      setResults(data.results);
      setTotalResults(data.total);
      setCurrentPage(1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <SavedSearches
        searches={savedSearches}
        onLoadSearch={(search) => {
          setFilters(search.filters);
          handleSearch('');
        }}
        onDeleteSearch={(id) => {
          setSavedSearches(s => s.filter(x => x.id !== id));
        }}
        onSaveSearch={(name, filterConfig) => {
          setSavedSearches([...savedSearches, {
            id: Date.now().toString(),
            name,
            filters: filterConfig,
            createdAt: new Date(),
            lastUsed: new Date()
          }]);
        }}
      />

      <div style={{ flex: 1 }}>
        <SearchBar onSearch={handleSearch} searchType="student" />

        <AdvancedFilters
          filterType="student"
          onFiltersChange={setFilters}
          onApply={() => handleSearch('')}
          onReset={() => {
            setFilters({});
            setResults([]);
          }}
        />

        <SearchResults
          results={results}
          totalCount={totalResults}
          currentPage={currentPage}
          pageSize={20}
          resultType="student"
          onPageChange={setCurrentPage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

```text
---

## Styling & Customization

All components use CSS modules and CSS variables for easy customization.

### Component-Specific Variables

**SearchBar**:

```css
--search-bg: #fff;
--search-border: #ddd;
--search-focus: #4a90e2;
--search-text: #333;

```text
**AdvancedFilters**:

```css
--filter-bg: #f9f9f9;
--filter-border: #e0e0e0;
--filter-button-bg: #4a90e2;
--filter-button-text: #fff;

```text
**SearchResults**:

```css
--results-border: #e0e0e0;
--results-header-bg: #f5f5f5;
--results-hover: #f9f9f9;

```text
**SavedSearches**:

```css
--sidebar-bg: #f5f5f5;
--sidebar-border: #e0e0e0;
--sidebar-text: #333;

```text
---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- ✅ Keyboard navigation (Tab, Enter, Arrow keys, Escape)
- ✅ ARIA labels and descriptions
- ✅ Focus management
- ✅ Color contrast ratios (4.5:1 minimum)
- ✅ Screen reader support
- ✅ Semantic HTML
- ✅ Error announcements

---

## Testing Components

See [TESTING.md](./TESTING.md) for comprehensive testing guides.

Quick test example:

```tsx
import { render, screen } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar';

test('SearchBar calls onSearch with query', async () => {
  const handleSearch = jest.fn();
  render(<SearchBar onSearch={handleSearch} />);

  const input = screen.getByPlaceholderText('Search...');
  fireEvent.change(input, { target: { value: 'test' } });
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(handleSearch).toHaveBeenCalledWith('test');
});

```text
---

## Changelog

### Version 1.0.0 (January 17, 2026)

- Initial release
- 4 core components
- Full TypeScript support
- i18n support (EN/EL)
- Accessibility compliance
- Responsive design
