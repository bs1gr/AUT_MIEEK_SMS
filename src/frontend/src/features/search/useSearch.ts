import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient, { extractAPIResponseData } from '@/api/api';

/**
 * Search result interface - unified across students, courses, and grades
 */
export interface SearchResult {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  display_name?: string;
  type: 'student' | 'course' | 'grade';
  student_id?: number;
  student_name?: string;
  metadata?: Record<string, unknown>;
  course_name?: string;
  course_code?: string;
  credits?: number;
  grade_value?: number;
  assignment_name?: string;
  // A grade: the mark, what it is out of, and its day (YYYY-MM-DD)
  grade?: number | null;
  max_grade?: number | null;
  date?: string | null;
}

/**
 * Saved search interface
 */
export interface SavedSearch {
  id: number;
  name: string;
  description?: string;
  search_type: 'students' | 'courses' | 'grades';
  query?: string;
  filters?: Record<string, unknown>;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Advanced filter criteria for searches
 */
export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'between';
  value: unknown;
}

/**
 * Advanced search request payload
 */
export interface AdvancedSearchRequest {
  search_type: SearchType;
  query?: string;
  filters?: FilterCriteria[];
  page?: number;
  limit?: number;
  sort?: SearchSortState;
}

export type SearchType = 'students' | 'courses' | 'grades';

export interface SearchSortState {
  field: 'relevance' | 'name' | 'email' | 'date';
  direction: 'asc' | 'desc';
}

/**
 * What each kind of record can be ordered by; the server refuses anything else. "Created" and
 * "Updated" were offered until November 2026: no record has such a date.
 */
export const SORT_FIELDS: Record<SearchType, SearchSortState['field'][]> = {
  students: ['relevance', 'name', 'email'],
  courses: ['relevance', 'name'],
  grades: ['relevance', 'name', 'date'],
};

const DEFAULT_SORT: SearchSortState = { field: 'relevance', direction: 'desc' };

/**
 * The filters as the server reads them: one entry per field, a list when a field has several
 * values (any of them matches).
 */
export const filtersToBody = (filters: FilterCriteria[]): Record<string, unknown> | undefined => {
  if (filters.length === 0) return undefined;
  return filters.reduce<Record<string, unknown>>((acc, curr) => {
    if (curr.field in acc) {
      const existing = acc[curr.field];
      acc[curr.field] = Array.isArray(existing) ? [...existing, curr.value] : [existing, curr.value];
    } else {
      acc[curr.field] = curr.value;
    }
    return acc;
  }, {});
};

type SearchResultsPayload = {
  results: SearchResult[];
  total: number;
  has_more?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Custom hook for managing search functionality
 */
export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('students');
  const [filters, setFilters] = useState<FilterCriteria[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(() => 0);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SearchSortState>(DEFAULT_SORT);

  // Debounce search query - 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);


  /**
   * Fetch search results based on current query and filters
   */
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['search', searchType, debouncedQuery, filters, page, limit, sort],
    queryFn: async () => {
      if (!debouncedQuery && filters.length === 0) {
        return { results: [], total: 0, has_more: false, limit, offset: page * limit };
      }

      try {
        const response = await apiClient.post('/search/advanced', {
          entity: searchType,
          query: debouncedQuery || undefined,
          filters: filtersToBody(filters),
          page,
          page_size: limit,
          sort,
        });

        // The server answers a search it could not do with HTTP 200 and `success: false`.
        // Read as data that was an empty list: the page said "No results found".
        const envelope = response.data as { success?: boolean; error?: { message?: string } } | null;
        if (envelope && typeof envelope === 'object' && envelope.success === false) {
          throw new Error(envelope.error?.message || 'Search failed');
        }

        const data = extractAPIResponseData<{
          results: SearchResult[];
          total: number;
          has_more?: boolean;
          limit?: number;
          offset?: number;
        }>(response.data);

        return {
          results: data?.results || [],
          total: data?.total || 0,
          has_more: data?.has_more ?? false,
          limit: data?.limit ?? limit,
          offset: data?.offset ?? page * limit,
        };
      } catch (err) {
        console.error('Search failed:', err);
        throw err;
      }
    },
    enabled: Boolean(debouncedQuery || filters.length > 0),
    staleTime: 30000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });

  // The saved searches are not asked for here. The page did, at every opening, and showed
  // them nowhere. The four functions below remain for a page that would.

  /**
   * Create a new saved search
   */
  const createSavedSearch = useCallback(
    async (name: string, description?: string) => {
      try {
        const response = await apiClient.post('/search/saved', {
          name,
          description,
          search_type: searchType,
          query: searchQuery,
          filters: filters.length > 0 ? filters : undefined,
        });
        return extractAPIResponseData<SavedSearch>(response);
      } catch (err) {
        console.error('Failed to save search:', err);
        throw err;
      }
    },
    [searchType, searchQuery, filters]
  );

  /**
   * Delete a saved search
   */
  const deleteSavedSearch = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/search/saved/${id}`);
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle favorite status for a saved search
   */
  const toggleFavoriteSavedSearch = useCallback(async (id: number) => {
    try {
      const response = await apiClient.post(`/search/saved/${id}/favorite`);
      return extractAPIResponseData<SavedSearch>(response);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      throw err;
    }
  }, []);

  /**
   * Load a saved search and apply its parameters
   */
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setSearchType(savedSearch.search_type);
    setSearchQuery(savedSearch.query || '');
    setFilters((savedSearch.filters as unknown as FilterCriteria[]) || []);
  }, []);

  /**
   * Clear all search parameters
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters([]);
    setDebouncedQuery('');
  }, []);

  /**
   * Add a filter criterion
   */
  const addFilter = useCallback((criterion: FilterCriteria) => {
    setFilters((prev) => [...prev, criterion]);
  }, []);

  /**
   * Remove a filter criterion by index
   */
  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Update a filter criterion by index
   */
  const updateFilter = useCallback((index: number, criterion: Partial<FilterCriteria>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...criterion } : f))
    );
  }, []);

  const setSearchQueryWithReset = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, []);

  const setSearchTypeWithReset = useCallback((value: SearchType) => {
    setSearchType(value);
    setPage(0);
    // An order the new kind of record does not have (students by e-mail, grades by date)
    // goes back to the default: the server would refuse it.
    setSort((prev) => (SORT_FIELDS[value].includes(prev.field) ? prev : DEFAULT_SORT));
  }, []);

  const setFiltersWithReset = useCallback((next: FilterCriteria[] | ((prev: FilterCriteria[]) => FilterCriteria[])) => {
    setFilters((prev) => (typeof next === 'function' ? next(prev) : next));
    setPage(0);
  }, []);

  return {
    // State
    searchQuery,
    setSearchQuery: setSearchQueryWithReset,
    searchType,
    setSearchType: setSearchTypeWithReset,
    filters,
    setFilters: setFiltersWithReset,
    debouncedQuery,
    page,
    setPage,
    limit,
    setLimit,
    sort,
    setSort,

    // Search results
    searchResults: (searchResults as SearchResultsPayload | undefined)?.results || [],
    totalResults: (searchResults as SearchResultsPayload | undefined)?.total || 0,
    hasMore: (searchResults as SearchResultsPayload | undefined)?.has_more ?? false,
    isLoading,
    error,
    retrySearch: refetch,

    // Saved searches
    createSavedSearch,
    deleteSavedSearch,
    toggleFavoriteSavedSearch,
    loadSavedSearch,

    // Filter management
    addFilter,
    removeFilter,
    updateFilter,
    clearSearch,
  };
};
