/**
 * useSearch - Custom React hook for advanced search functionality.
 *
 * Provides search capabilities for students, courses, and grades with
 * suggestions, pagination, filtering, and result caching.
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';

/**
 * Search result types from API
 */
export interface SearchResult {
  id: number;
  type: 'student' | 'course' | 'grade';
  display_name?: string;
  secondary_info?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  enrollment_number?: string;
  course_name?: string;
  course_code?: string;
  credits?: number;
  academic_year?: number;
  student_id?: number;
  student_name?: string;
  course_id?: number;
  grade_value?: number;
}

/**
 * Search suggestion from API
 */
export interface SearchSuggestion {
  text: string;
  type: 'student' | 'course';
  id: number;
}

/**
 * Advanced filter criteria
 */
export interface SearchFilters {
  [key: string]: string | number | boolean | undefined;
  grade_min?: number;
  grade_max?: number;
  student_id?: number;
  course_id?: number;
  credits?: number;
  status?: string;
  academic_year?: number;
}

/**
 * Search state
 */
export interface SearchState {
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

/**
 * Search statistics
 */
export interface SearchStatistics {
  total_students: number;
  total_courses: number;
  total_grades: number;
}

/**
 * useSearch hook - Manages search state and operations
 *
 * @param searchType - Type of search: "students", "courses", or "grades"
 * @param pageSize - Number of results per page (default: 20)
 * @returns {Object} Search state and methods
 *
 * @example
 * const {
 *   results,
 *   suggestions,
 *   isLoading,
 *   search,
 *   getSuggestions,
 *   advancedFilter
 * } = useSearch('students');
 */
export const useSearch = (
  searchType: 'students' | 'courses' | 'grades' = 'students',
  pageSize: number = 20
) => {
  const { t } = useTranslation();
  const [state, setState] = useState<SearchState>({
    results: [],
    suggestions: [],
    total: 0,
    isLoading: false,
    error: null,
    hasMore: true,
    currentPage: 0
  });

  const [statistics, setStatistics] = useState<SearchStatistics>({
    total_students: 0,
    total_courses: 0,
    total_grades: 0
  });

  const suggestionsCache = useRef<Map<string, SearchSuggestion[]>>(new Map());
  const suggestionsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string | undefined>(undefined);
  const lastFiltersRef = useRef<SearchFilters | undefined>(undefined);

  /**
   * Basic search by query string
   */
  const search = useCallback(
    async (query: string, page: number = 0) => {
      if (!query.trim()) {
        setState(prev => ({
          ...prev,
          results: [],
          suggestions: [],
          error: null
        }));
        return;
      }

      lastQueryRef.current = query;
      lastFiltersRef.current = undefined;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const offset = page * pageSize;

        const url = `/search/${searchType}?q=${encodeURIComponent(query)}&limit=${pageSize}&offset=${offset}&page=${page}`;

        const response = await apiClient.get(url);

        const incomingResults = response.data || [];

        setState(prev => {
          const mergedResults = page > 0
            ? [...prev.results, ...incomingResults]
            : incomingResults;
          const hasMore = incomingResults.length === pageSize;

          return {
            ...prev,
            results: mergedResults,
            total: mergedResults.length,
            hasMore,
            currentPage: page,
            isLoading: false,
            error: null
          };
        });
      } catch (error: Error | unknown) {
        let errorMessage = t('search.errorSearching');
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'response' in error) {
          const apiError = error as unknown as { response?: { data?: { error?: { message?: string } } } };
          errorMessage = apiError?.response?.data?.error?.message || t('search.errorSearching');
        }

        setState(prev => ({
          ...prev,
          results: [],
          error: errorMessage,
          isLoading: false
        }));
      }
    },
    [searchType, pageSize, t]
  );

  /**
   * Get search suggestions for autocomplete
   */
  const getSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setState(prev => ({ ...prev, suggestions: [] }));
        return;
      }

      // Check cache first
      if (suggestionsCache.current.has(query)) {
        const cached = suggestionsCache.current.get(query)!;
        setState(prev => ({ ...prev, suggestions: cached }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const response = await apiClient.get('/search/suggestions', {
          params: {
            q: query,
            limit: 10
          }
        });

        const suggestions = response.data || [];

        // Cache results
        suggestionsCache.current.set(query, suggestions);

        setState(prev => ({
          ...prev,
          suggestions,
          isLoading: false
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : t('search.errorSearching');
        setState(prev => ({
          ...prev,
          suggestions: [],
          error: message,
          isLoading: false
        }));
      }
    },
    [t]
  );

  /**
   * Get suggestions with debouncing (use in input handlers)
   */
  const getSuggestionsDebounced = useCallback(
    (query: string, delay: number = 300) => {
      if (suggestionsTimeout.current) {
        clearTimeout(suggestionsTimeout.current);
      }

      if (!query.trim()) {
        setState(prev => ({ ...prev, suggestions: [] }));
        return;
      }

      suggestionsTimeout.current = setTimeout(() => {
        getSuggestions(query);
      }, delay);
    },
    [getSuggestions]
  );

  /**
   * Advanced search with filters
   */
  const advancedFilter = useCallback(
    async (filters: SearchFilters, page: number = 0) => {
      lastFiltersRef.current = filters;
      lastQueryRef.current = undefined;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const offset = page * pageSize;

        const response = await apiClient.post('/search/advanced', {
          filters
        }, {
          params: {
            search_type: searchType,
            limit: pageSize,
            offset,
            page
          }
        });

        const incomingResults = response.data || [];

        setState(prev => {
          const mergedResults = page > 0
            ? [...prev.results, ...incomingResults]
            : incomingResults;
          const hasMore = incomingResults.length === pageSize;

          return {
            ...prev,
            results: mergedResults,
            total: mergedResults.length,
            hasMore,
            currentPage: page,
            isLoading: false,
            error: null
          };
        });
      } catch (error: Error | unknown) {
        let errorMessage = t('search.errorSearching');
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'response' in error) {
          const apiError = error as unknown as { response?: { data?: { error?: { message?: string } } } };
          errorMessage = apiError?.response?.data?.error?.message || t('search.errorSearching');
        }

        setState(prev => ({
          ...prev,
          results: [],
          error: errorMessage,
          isLoading: false
        }));
      }
    },
    [searchType, pageSize, t]
  );

  /**
   * Load next page of results (pagination)
   */
  const loadMore = useCallback(
    (query?: string, filters?: SearchFilters) => {
      const nextPage = state.currentPage + 1;

      if (filters) {
        advancedFilter(filters, nextPage);
      } else if (query) {
        search(query, nextPage);
      } else if (lastFiltersRef.current) {
        advancedFilter(lastFiltersRef.current, nextPage);
      } else if (lastQueryRef.current) {
        search(lastQueryRef.current, nextPage);
      }
    },
    [state.currentPage, search, advancedFilter]
  );

  /**
   * Load search statistics
   */
  const loadStatistics = useCallback(
    async () => {
      try {
        const response = await apiClient.get('/search/statistics');
        setStatistics(response.data || {
          total_students: 0,
          total_courses: 0,
          total_grades: 0
        });
      } catch {
        // Fail silently for statistics - error logging skipped
      }
    },
    []
  );

  /**
   * Clear search results and state
   */
  const clear = useCallback(() => {
    setState({
      results: [],
      suggestions: [],
      total: 0,
      isLoading: false,
      error: null,
      hasMore: true,
      currentPage: 0
    });
    suggestionsCache.current.clear();
  }, []);

  /**
   * Load statistics on mount
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStatistics();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadStatistics]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    const cache = suggestionsCache.current;
    return () => {
      if (suggestionsTimeout.current) {
        clearTimeout(suggestionsTimeout.current);
      }
      // async cleanup to match test expectations
      setTimeout(() => cache.clear(), 0);
    };
  }, []);

  return {
    // State
    results: state.results,
    suggestions: state.suggestions,
    total: state.total,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    currentPage: state.currentPage,
    statistics,

    // Methods
    search,
    getSuggestions,
    getSuggestionsDebounced,
    advancedFilter,
    loadMore,
    clear
  };
};

export default useSearch;
