/**
 * useSearch Hook
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Custom hook for managing advanced search state and API interactions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, UseQueryResult } from '@tanstack/react-query';
import { searchAPI } from '@/api/search-client';
import {
  SearchQuery,
  SearchResult,
  SearchResultData,
  FilterCondition,
} from '@/features/advanced-search/types/search';

/**
 * Search state
 */
export interface UseSearchState {
  query: string;
  entityType: 'students' | 'courses' | 'grades' | 'all';
  filters: FilterCondition[];
  sortBy: 'relevance' | 'name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  selectedFacets?: Record<string, string[]>;
}

/**
 * useSearch Hook - Manages advanced search functionality
 *
 * @param initialState - Initial search state
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Search state and methods
 */
export const useSearch = (
  initialState?: Partial<UseSearchState>,
  debounceMs: number = 300
) => {
  // Search state
  const [state, setState] = useState<UseSearchState>({
    query: initialState?.query ?? '',
    entityType: initialState?.entityType ?? 'all',
    filters: initialState?.filters ?? [],
    sortBy: initialState?.sortBy ?? 'relevance',
    sortOrder: initialState?.sortOrder ?? 'desc',
    currentPage: initialState?.currentPage ?? 1,
    pageSize: initialState?.pageSize ?? 20,
    selectedFacets: initialState?.selectedFacets ?? {},
  });

  // Debounce timer
  const [debouncedQuery, setDebouncedQuery] = useState(state);

  // Debounce search state updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(state);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [state, debounceMs]);

  // Build search query for API
  const buildSearchQuery = useCallback((): SearchQuery => {
    // Merge facet selections into filters (simple equals mapping)
    const facetFilters: FilterCondition[] = [];
    const selectedFacets = debouncedQuery.selectedFacets || {};
    Object.keys(selectedFacets).forEach((key) => {
      const values = selectedFacets[key] || [];
      values.forEach((val) => {
        facetFilters.push({ field: key, operator: 'equals', value: val });
      });
    });

    return {
      q: debouncedQuery.query,
      entity_type: debouncedQuery.entityType === 'all' ? undefined : debouncedQuery.entityType,
      filters: [...debouncedQuery.filters, ...facetFilters],
      sort_by: debouncedQuery.sortBy,
      sort_order: debouncedQuery.sortOrder,
      page: debouncedQuery.currentPage,
      page_size: debouncedQuery.pageSize,
    };
  }, [debouncedQuery]);

  // Fetch search results
  const searchQuery: UseQueryResult<SearchResult> = useQuery({
    queryKey: [
      'search',
      debouncedQuery.query,
      debouncedQuery.entityType,
      debouncedQuery.filters,
      debouncedQuery.sortBy,
      debouncedQuery.sortOrder,
      debouncedQuery.currentPage,
      debouncedQuery.pageSize,
    ],
    queryFn: async () => {
      if (!debouncedQuery.query.trim()) {
        return { success: true, data: { items: [], total: 0, page: 1, page_size: 20, facets: {} } };
      }

      const response =
        debouncedQuery.entityType === 'all'
          ? await searchAPI.advancedSearch(buildSearchQuery())
          : debouncedQuery.entityType === 'students'
            ? await searchAPI.searchStudents(buildSearchQuery())
            : debouncedQuery.entityType === 'courses'
              ? await searchAPI.searchCourses(buildSearchQuery())
              : await searchAPI.searchGrades(buildSearchQuery());

      return response;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Update query string
  const setQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      query,
      currentPage: 1, // Reset to first page
    }));
  }, []);

  // Update entity type
  const setEntityType = useCallback(
    (entityType: 'students' | 'courses' | 'grades' | 'all') => {
      setState((prev) => ({
        ...prev,
        entityType,
        currentPage: 1, // Reset to first page
      }));
    },
    []
  );

  // Add filter condition
  const addFilter = useCallback((filter: FilterCondition) => {
    setState((prev) => ({
      ...prev,
      filters: [...prev.filters, filter],
      currentPage: 1, // Reset to first page
    }));
  }, []);

  // Replace filter conditions
  const setFilters = useCallback((filters: FilterCondition[]) => {
    setState((prev) => ({
      ...prev,
      filters,
      currentPage: 1,
    }));
  }, []);

  // Toggle facet selection
  const toggleFacet = useCallback((facetKey: string, value: string) => {
    setState((prev) => {
      const current = new Set(prev.selectedFacets?.[facetKey] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        selectedFacets: {
          ...(prev.selectedFacets || {}),
          [facetKey]: Array.from(current),
        },
        currentPage: 1,
      };
    });
  }, []);

  // Clear all values for a facet key
  const clearFacet = useCallback((facetKey: string) => {
    setState((prev) => ({
      ...prev,
      selectedFacets: {
        ...(prev.selectedFacets || {}),
        [facetKey]: [],
      },
      currentPage: 1,
    }));
  }, []);

  // Remove filter condition
  const removeFilter = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
      currentPage: 1, // Reset to first page
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: [],
      currentPage: 1, // Reset to first page
    }));
  }, []);

  // Update sort
  const setSort = useCallback(
    (
      sortBy: 'relevance' | 'name' | 'created_at' | 'updated_at',
      sortOrder: 'asc' | 'desc' = 'asc'
    ) => {
      setState((prev) => ({
        ...prev,
        sort_by: sortBy,
        sort_order: sortOrder,
        currentPage: 1, // Reset to first page
      }));
    },
    []
  );

  // Update sort by (convenience method for SearchResults component)
  const setSortBy = useCallback(
    (sortBy: string) => {
      setState((prev) => ({
        ...prev,
        sort_by: sortBy,
        currentPage: 1, // Reset to first page
      }));
    },
    []
  );

  // Update page
  const setCurrentPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.max(1, page),
    }));
  }, []);

  // Update page size
  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      pageSize: Math.max(1, size),
      currentPage: 1, // Reset to first page
    }));
  }, []);

  // Get results data
  const results: SearchResultData | undefined = searchQuery.data?.data;

  return {
    // State
    state,
    results,
    isLoading: searchQuery.isLoading,
    isError: searchQuery.isError,
    error: searchQuery.error,

    // Methods
    setQuery,
    setEntityType,
    addFilter,
    removeFilter,
    setFilters,
    clearFilters,
    setSort,
    setSortBy,
    setCurrentPage,
    setPageSize,
    toggleFacet,
    clearFacet,

    // Utilities
    buildSearchQuery,
    refetch: searchQuery.refetch,
    totalResults: results?.total ?? 0,
    totalPages: Math.ceil((results?.total ?? 0) / state.pageSize),
    hasNextPage: state.currentPage < Math.ceil((results?.total ?? 0) / state.pageSize),
    hasPreviousPage: state.currentPage > 1,
  };
};

/**
 * useSavedSearches Hook - Manages saved searches
 */
export const useSavedSearches = () => {
  // Fetch saved searches
  const query = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const response = await searchAPI.getSavedSearches();
      return response.data || [];
    },
    retry: 1,
  });

  // Save search mutation
  const saveMutation = useMutation({
    mutationFn: ({
      name,
      query,
      description,
    }: {
      name: string;
      query: SearchQuery;
      description?: string;
    }) => searchAPI.saveSearch(name, query, description),
    onSuccess: () => {
      query.refetch();
    },
  });

  // Delete search mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => searchAPI.deleteSavedSearch(id),
    onSuccess: () => {
      query.refetch();
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: number) => searchAPI.toggleSavedSearchFavorite(id),
    onSuccess: () => {
      query.refetch();
    },
  });

  return {
    savedSearches: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    save: saveMutation.mutate,
    delete: deleteMutation.mutate,
    toggleFavorite: toggleFavoriteMutation.mutate,
    refetch: query.refetch,
  };
};
