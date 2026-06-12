/**
 * Advanced Search API Client
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * API methods for interacting with backend search endpoints.
 */

import apiClient from '@/api/api';
import {
  SearchQuery,
  SearchResult,
  SavedSearch,
  StudentSearchResult,
  CourseSearchResult,
  GradeSearchResult,
} from '@/features/advanced-search/types/search';

/**
 * Advanced search API client
 */
export const searchAPI = {
  /**
   * Search for students
   */
  searchStudents: (query: SearchQuery): Promise<SearchResult<StudentSearchResult>> =>
    apiClient.post('/search/students', query),

  /**
   * Search for courses
   */
  searchCourses: (query: SearchQuery): Promise<SearchResult<CourseSearchResult>> =>
    apiClient.post('/search/courses', query),

  /**
   * Search for grades
   */
  searchGrades: (query: SearchQuery): Promise<SearchResult<GradeSearchResult>> =>
    apiClient.post('/search/grades', query),

  /**
   * Advanced multi-entity search
   */
  advancedSearch: (query: SearchQuery): Promise<SearchResult> =>
    apiClient.post('/search/advanced', query),

  /**
   * Get facets for entity type
   */
  getSearchFacets: (
    entityType: 'students' | 'courses' | 'grades' | 'all'
  ): Promise<SearchResult<{ field: string; values: { value: string; count: number }[] }>> =>
    apiClient.get(`/search/${entityType}/facets`),

  /**
   * Get saved searches
   */
  getSavedSearches: (): Promise<SearchResult<SavedSearch[]>> =>
    apiClient.get('/saved-searches'),

  /**
   * Save current search
   */
  saveSearch: (
    name: string,
    query: SearchQuery,
    description?: string
  ): Promise<SearchResult<SavedSearch>> =>
    apiClient.post('/saved-searches', { name, query, description }),

  /**
   * Load saved search
   */
  loadSavedSearch: (id: number): Promise<SearchResult<SavedSearch>> =>
    apiClient.get(`/saved-searches/${id}`),

  /**
   * Delete saved search
   */
  deleteSavedSearch: (id: number): Promise<SearchResult<{ id: number }>> =>
    apiClient.delete(`/saved-searches/${id}`),

  /**
   * Toggle saved search favorite status
   */
  toggleSavedSearchFavorite: (id: number): Promise<SearchResult<SavedSearch>> =>
    apiClient.patch(`/saved-searches/${id}/favorite`),

  /**
   * Get search history
   */
  getSearchHistory: (): Promise<SearchResult<{ query: string; timestamp: string }[]>> =>
    apiClient.get('/search/history'),

  /**
   * Clear search history
   */
  clearSearchHistory: (): Promise<SearchResult<{ cleared: number }>> =>
    apiClient.delete('/search/history'),
};
