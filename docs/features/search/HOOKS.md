# Advanced Search & Filtering - useSearch Hook Guide

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 17, 2026

## Overview

The `useSearch` custom React hook provides a complete abstraction for search functionality. It handles API calls, caching, debouncing, pagination, and state management for searching students, courses, and grades.

## Location

```text
frontend/src/hooks/useSearch.ts

```text
## Basic Usage

```typescript
import { useSearch } from '@/hooks/useSearch';

export function MyComponent() {
  const { search, loading, error } = useSearch();

  const handleSearch = async () => {
    const results = await search('Alice', 'student');
    console.log(results);
  };

  return (
    <button onClick={handleSearch}>
      {loading ? 'Loading...' : 'Search'}
    </button>
  );
}

```text
## Hook API

### State Properties

```typescript
interface UseSearchReturn {
  // State
  loading: boolean;                     // Is search in progress
  error: string | null;                 // Error message if failed
  results: any[];                       // Current results
  page: number;                         // Current page number
  pageSize: number;                     // Results per page
  totalResults: number;                 // Total result count

  // Methods
  search: (query, entity, filters?, options?) => Promise<any[]>;
  getSuggestions: (entity, query) => Promise<any[]>;
  getSuggestionsDebounced: (entity, query) => Promise<any[]>;
  advancedFilter: (entity, filters) => Promise<any[]>;
  loadMore: (page) => Promise<void>;
  clear: () => void;

  // Statistics
  statistics: {
    total_students: number;
    total_courses: number;
    total_grades: number;
  };
}

```text
## Core Methods

### 1. search()

Perform a search query for an entity type.

```typescript
const { search } = useSearch();

// Basic search
const results = await search('Alice', 'student');

// With filters
const results = await search('Alice', 'student', {
  email: 'alice@',
  status: 'active'
});

// With pagination options
const results = await search('Alice', 'student', {}, {
  page: 2,
  page_size: 50
});

// Full example
const handleSearch = async (query: string) => {
  try {
    const results = await search(query, 'student', {
      email: 'example.com',
      min_gpa: 3.0
    }, {
      page: 1,
      page_size: 20
    });

    console.log(`Found ${results.total} results`);
    setResults(results.results);
  } catch (err) {
    setError('Search failed');
  }
};

```text
#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search term |
| entity | 'student' \| 'course' \| 'grade' | Yes | Entity type |
| filters | object | No | Additional filters |
| options | object | No | Pagination options (page, page_size) |

#### Returns

```typescript
{
  results: [             // Array of results
    {
      id: 1,
      first_name: "Alice",
      ...
    }
  ],
  page: 1,              // Current page
  page_size: 20,        // Results per page
  total: 150,           // Total count
  has_next: true        // Is there next page
}

```text
---

### 2. getSuggestions()

Get autocomplete suggestions without debouncing.

```typescript
const { getSuggestions } = useSearch();

// Get student suggestions
const suggestions = await getSuggestions('student', 'Al');

// Use in dropdown/autocomplete
const handleInputChange = async (value: string) => {
  if (value.length > 1) {
    const suggestions = await getSuggestions('student', value);
    setSuggestions(suggestions);
  }
};

```text
#### Returns

```typescript
[
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, name: 'Andrew Smith', email: 'andrew@example.com' }
]

```text
---

### 3. getSuggestionsDebounced()

Get suggestions with built-in debouncing (300ms).

```typescript
const { getSuggestionsDebounced } = useSearch();

// Automatically debounced - won't spam API
const handleInputChange = (query: string) => {
  getSuggestionsDebounced('student', query).then(suggestions => {
    setSuggestions(suggestions);
  });
};

// Each call replaces the previous debounced call
<input
  onChange={(e) => handleInputChange(e.target.value)}
  placeholder="Search..."
/>

```text
**Best for**: Real-time autocomplete where input fires rapidly

**Debouncing**: 300ms delay between requests

---

### 4. advancedFilter()

Apply complex filters without a search query.

```typescript
const { advancedFilter } = useSearch();

// Filter students with complex criteria
const results = await advancedFilter('student', {
  email: 'example.com',
  status: 'active',
  min_gpa: 3.5,
  major: 'Engineering'
});

// Filter grades in range
const results = await advancedFilter('grade', {
  min_grade: 80,
  max_grade: 100,
  student_id: 1,
  course_id: 5
});

// Complete workflow
const handleAdvancedFilter = async (filters: FilterConfig) => {
  try {
    const results = await advancedFilter('student', filters);
    setResults(results);
    setTotalResults(results.total);
  } catch (err) {
    setError('Filter failed');
  }
};

```text
---

### 5. loadMore()

Load next page of results.

```typescript
const { results, page, loadMore, loading } = useSearch();

const handleLoadMore = async () => {
  await loadMore(page + 1);
};

return (
  <>
    <Results data={results} />
    <button onClick={handleLoadMore} disabled={loading}>
      {loading ? 'Loading...' : 'Load More'}
    </button>
  </>
);

```text
---

### 6. clear()

Clear all search results and reset state.

```typescript
const { clear } = useSearch();

const handleClear = () => {
  clear();
  setFilters({});
  setQuery('');
};

```text
---

## Complete Example: Search Page

```typescript
import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';

export function AdvancedSearchPage() {
  const {
    search,
    getSuggestionsDebounced,
    advancedFilter,
    clear,
    loading,
    error,
    results,
    page,
    totalResults,
    statistics
  } = useSearch();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [entityType, setEntityType] = useState<'student' | 'course' | 'grade'>('student');

  // Handle search with current filters
  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    try {
      const data = await search(searchQuery, entityType, filters, {
        page: 1,
        page_size: 20
      });
    } catch (err) {
      console.error('Search failed:', error);
    }
  };

  // Handle filter changes and re-search
  const handleFiltersApply = async () => {
    try {
      const data = await search(query, entityType, filters, {
        page: 1,
        page_size: 20
      });
    } catch (err) {
      console.error('Filtered search failed:', error);
    }
  };

  // Handle query input with debounced suggestions
  const handleQueryInput = (newQuery: string) => {
    setQuery(newQuery);

    if (newQuery.length > 1) {
      getSuggestionsDebounced(entityType, newQuery).then(suggestions => {
        setSuggestions(suggestions);
      });
    } else {
      setSuggestions([]);
    }
  };

  // Handle entity type change
  const handleEntityChange = (newType) => {
    setEntityType(newType);
    clear();
    setQuery('');
    setFilters({});
    setSuggestions([]);
  };

  return (
    <div className="search-page">
      {/* Header */}
      <div className="search-header">
        <h1>Advanced Search</h1>
        <p>
          {statistics.total_students} students •{' '}
          {statistics.total_courses} courses •{' '}
          {statistics.total_grades} grades
        </p>
      </div>

      {/* Entity Type Selector */}
      <div className="entity-selector">
        <label>Search Type:</label>
        <select value={entityType} onChange={(e) => handleEntityChange(e.target.value)}>
          <option value="student">Students</option>
          <option value="course">Courses</option>
          <option value="grade">Grades</option>
        </select>
      </div>

      {/* Search Input */}
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
              setSuggestions([]);
            }
          }}
          placeholder={`Search ${entityType}...`}
          disabled={loading}
        />

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                onClick={() => {
                  setQuery(suggestion.name || suggestion.first_name);
                  handleSearch(suggestion.name || suggestion.first_name);
                  setSuggestions([]);
                }}
              >
                {suggestion.name || `${suggestion.first_name} ${suggestion.last_name}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => clear()}>Clear</button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <div className="loading">Searching...</div>}

      {/* Results */}
      {results.length > 0 && (
        <div className="results-container">
          <h2>Results ({totalResults} total)</h2>

          <table className="results-table">
            <thead>
              <tr>
                {entityType === 'student' && (
                  <>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </>
                )}
                {entityType === 'course' && (
                  <>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Credits</th>
                  </>
                )}
                {entityType === 'grade' && (
                  <>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Grade</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  {entityType === 'student' && (
                    <>
                      <td>{`${result.first_name} ${result.last_name}`}</td>
                      <td>{result.email}</td>
                      <td>{result.phone}</td>
                    </>
                  )}
                  {entityType === 'course' && (
                    <>
                      <td>{result.name}</td>
                      <td>{result.code}</td>
                      <td>{result.credits}</td>
                    </>
                  )}
                  {entityType === 'grade' && (
                    <>
                      <td>{result.student_name}</td>
                      <td>{result.course_name}</td>
                      <td>{result.grade}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button onClick={() => handleSearch(query)} disabled={page === 1 || loading}>
              Previous
            </button>
            <span>Page {page}</span>
            <button onClick={() => { /* load next page */ }} disabled={loading}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && query && (
        <div className="empty-state">
          <p>No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

```text
---

## Performance Optimization

### Debouncing

The hook automatically debounces suggestion requests:

```typescript
const { getSuggestionsDebounced } = useSearch();

// These 5 rapid calls become 1 API request after 300ms
for (let i = 0; i < 5; i++) {
  getSuggestionsDebounced('student', 'A'); // Only final call made
}

```text
### Caching

Suggestions are cached in memory:

```typescript
// First call makes API request
const suggestions1 = await getSuggestionsDebounced('student', 'Alice');

// Identical call uses cache (instant)
const suggestions2 = await getSuggestionsDebounced('student', 'Alice');

// Different entity clears cache for that type
const suggestions3 = await getSuggestionsDebounced('course', 'Alice');

```text
### Pagination

Results are managed per-page:

```typescript
const { loadMore, results, page } = useSearch();

// Load page 1
await search('test', 'student');

// Load page 2 (appends to results)
await loadMore(2);

// Results now contains pages 1 and 2

```text
---

## Error Handling

```typescript
const { search, error, clear } = useSearch();

try {
  const results = await search('test', 'student');
} catch (err) {
  console.error('Search failed:', error);

  // Clear state and retry
  clear();
  // Retry search...
}

```text
---

## Testing with useSearch

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '@/hooks/useSearch';

test('search returns results', async () => {
  const { result } = renderHook(() => useSearch());

  act(() => {
    result.current.search('Alice', 'student');
  });

  await waitFor(() => {
    expect(result.current.results).toHaveLength(1);
  });
});

test('getSuggestionsDebounced debounces requests', async () => {
  const { result } = renderHook(() => useSearch());

  // Rapid calls
  result.current.getSuggestionsDebounced('student', 'A');
  result.current.getSuggestionsDebounced('student', 'Al');
  result.current.getSuggestionsDebounced('student', 'Ali');

  // Wait for debounce
  await waitFor(() => {
    expect(result.current.suggestions).toBeDefined();
  });
});

```text
---

## TypeScript Interfaces

```typescript
interface SearchOptions {
  page?: number;
  page_size?: number;
}

interface FilterConfig {
  [key: string]: any;
}

interface SearchResult {
  results: any[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

interface SearchStatistics {
  total_students: number;
  total_courses: number;
  total_grades: number;
}

```text
---

## Best Practices

1. **Use debounced suggestions for real-time inputs**
   ```typescript
   // ✅ Good - won't spam API
   onChange={(e) => getSuggestionsDebounced('student', e.target.value)}

   // ❌ Bad - spam API on every keystroke
   onChange={(e) => getSuggestions('student', e.target.value)}
   ```

2. **Clear state when changing entity type**
   ```typescript
   // ✅ Good - clean transition
   const handleEntityChange = (newType) => {
     clear();
     setEntityType(newType);
   };
   ```

3. **Handle loading states**
   ```typescript
   // ✅ Good - disable button while loading
   <button disabled={loading}>
     {loading ? 'Searching...' : 'Search'}
   </button>
   ```

4. **Combine search with filters**
   ```typescript
   // ✅ Good - apply both search and filters
   const data = await search(query, 'student', {
     email: 'example.com',
     min_gpa: 3.0
   });
   ```

5. **Cache frequently accessed data**
   ```typescript
   // ✅ Good - cache suggests same query
   const suggestions1 = await getSuggestionsDebounced('student', 'Alice');
   const suggestions2 = await getSuggestionsDebounced('student', 'Alice');
   // Only 1 API call made
   ```

---

## Changelog

### Version 1.0.0 (January 17, 2026)

- Initial release
- 6 core methods
- Full TypeScript support
- Automatic debouncing (300ms)
- Built-in caching
- Error handling
- Loading states

