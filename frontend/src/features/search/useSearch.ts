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
  metadata?: Record<string, unknown>;
  course_name?: string;
  course_code?: string;
  credits?: number;
  grade_value?: number;
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
  search_type: 'students' | 'courses' | 'grades';
  query?: string;
  filters?: FilterCriteria[];
  page?: number;
  limit?: number;
  sort?: SearchSortState;
}

export interface SearchSortState {
  field: 'relevance' | 'name' | 'email' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

/**
 * Custom hook for managing search functionality
 */
export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'students' | 'courses' | 'grades'>('students');
  const [filters, setFilters] = useState<FilterCriteria[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SearchSortState>({ field: 'relevance', direction: 'desc' });

  // Debounce search query - 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when query, filters, or type change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, filters, searchType]);

  /**
   * Fetch search results based on current query and filters
   */
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', searchType, debouncedQuery, filters, page, limit, sort],
    queryFn: async () => {
      if (!debouncedQuery && filters.length === 0) {
        return { results: [], total: 0, has_more: false, limit, offset: page * limit };
      }

      try {
        const response = await apiClient.post('/search/advanced', {
          entity: searchType,
          query: debouncedQuery || undefined,
          filters: filters.length > 0 ? filters.reduce<Record<string, unknown>>((acc, curr) => {
            // If multiple filters on same field, convert to array
            if (acc[curr.field]) {
              const existing = acc[curr.field];
              acc[curr.field] = Array.isArray(existing) ? [...existing, curr.value] : [existing, curr.value];
            } else {
              acc[curr.field] = curr.value;
            }
            return acc;
          }, {}) : undefined,
          page,
          page_size: limit,
          sort,
        });

        const data = extractAPIResponseData<{
          results: SearchResult[];
          total: number;
          has_more?: boolean;
          limit?: number;
          offset?: number;
        }>(response);

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

  /**
   * Fetch saved searches for current user
   */
  const { data: savedSearches, isLoading: loadingSavedSearches } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/search/saved');
        const extracted = extractAPIResponseData<SavedSearch[]>(response);
        if (Array.isArray(extracted)) {
          return extracted;
        }
        if (Array.isArray((response as any)?.data)) {
          return (response as any).data as SavedSearch[];
        }
        return [];
      } catch (err) {
        console.error('Failed to fetch saved searches:', err);
        return [];
      }
    },
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

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

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    filters,
    setFilters,
    debouncedQuery,
    page,
    setPage,
    limit,
    setLimit,
    sort,
    setSort,

    // Search results
    searchResults: (searchResults as any)?.results || [],
    totalResults: (searchResults as any)?.total || 0,
    hasMore: (searchResults as any)?.has_more ?? false,
    isLoading,
    error,

    // Saved searches
    savedSearches: savedSearches || [],
    loadingSavedSearches,

    // Mutations
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
