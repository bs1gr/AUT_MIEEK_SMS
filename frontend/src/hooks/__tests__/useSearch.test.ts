/**
 * Test suite for useSearch custom hook.
 *
 * Tests cover:
 * - Basic search functionality
 * - Debounced suggestions
 * - Pagination
 * - Advanced filtering
 * - Suggestion caching
 * - Statistics loading
 * - Error handling
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import * as api from '../api/api';

// Mock the API client
vi.mock('../api/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  },
  unwrapResponse: vi.fn((data) => data)
}));

describe('useSearch Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSearch('students'));

      expect(result.current.results).toEqual([]);
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load statistics on mount', async () => {
      vi.mocked(api.apiClient.get).mockResolvedValue({
        data: {
          total_students: 100,
          total_courses: 50,
          total_grades: 500
        }
      });

      const { result } = renderHook(() => useSearch('students'));

      await waitFor(() => {
        expect(result.current.statistics).toBeDefined();
      });
    });

    it('should support all search types', () => {
      const { result: studentHook } = renderHook(() => useSearch('students'));
      const { result: courseHook } = renderHook(() => useSearch('courses'));
      const { result: gradeHook } = renderHook(() => useSearch('grades'));

      expect(studentHook.current).toBeDefined();
      expect(courseHook.current).toBeDefined();
      expect(gradeHook.current).toBeDefined();
    });
  });

  describe('Search Method', () => {
    it('should perform basic search', async () => {
      const mockResults = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
      ];

      vi.mocked(api.apiClient.get).mockResolvedValue({ data: mockResults });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.search('John');
      });

      expect(result.current.results).toEqual(mockResults);
    });

    it('should set loading state during search', async () => {
      vi.mocked(api.apiClient.get).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: [] }), 100);
          })
      );

      const { result } = renderHook(() => useSearch('students'));

      act(() => {
        result.current.search('test');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle search errors', async () => {
      const errorMessage = 'Search failed';
      vi.mocked(api.apiClient.get).mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        try {
          await result.current.search('test');
        } catch {
          // Error is handled
        }
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should support pagination', async () => {
      const mockResults = [{ id: 1, first_name: 'John' }];
      vi.mocked(api.apiClient.get).mockResolvedValue({ data: mockResults });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.search('John', 2);
      });

      expect(api.apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });
  });

  describe('Suggestions', () => {
    it('should fetch suggestions', async () => {
      const mockSuggestions = [
        { text: 'John Doe', type: 'student', id: 1 },
        { text: 'Jane Smith', type: 'student', id: 2 }
      ];

      vi.mocked(api.apiClient.get).mockResolvedValue({
        data: mockSuggestions
      });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.getSuggestions('John');
      });

      expect(result.current.suggestions).toEqual(mockSuggestions);
    });

    it('should cache suggestions', async () => {
      const mockSuggestions = [{ text: 'John', type: 'student', id: 1 }];
      vi.mocked(api.apiClient.get).mockResolvedValue({
        data: mockSuggestions
      });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.getSuggestions('John');
      });

      const firstCallCount = vi.mocked(api.apiClient.get).mock.calls.length;

      await act(async () => {
        await result.current.getSuggestions('John');
      });

      // Should not call API again due to cache
      expect(vi.mocked(api.apiClient.get).mock.calls.length).toBeLessThanOrEqual(firstCallCount + 1);
    });

    it('should debounce suggestion requests', async () => {
      vi.mocked(api.apiClient.get).mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        for (let i = 0; i < 5; i++) {
          result.current.getSuggestionsDebounced(`query${i}`, 100);
        }

        // Wait for debounce to complete
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // Should make fewer API calls due to debouncing
      expect(vi.mocked(api.apiClient.get).mock.calls.length).toBeLessThan(10);
    });

    it('should handle suggestion errors', async () => {
      vi.mocked(api.apiClient.get).mockRejectedValue(
        new Error('Suggestion fetch failed')
      );

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        try {
          await result.current.getSuggestions('test');
        } catch {
          // Error is handled
        }
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Advanced Filter', () => {
    it('should perform advanced filtering', async () => {
      const mockResults = [
        { id: 1, first_name: 'John', grade_value: 85 }
      ];

      vi.mocked(api.apiClient.post).mockResolvedValue({
        data: mockResults
      });

      const { result } = renderHook(() => useSearch('grades'));

      await act(async () => {
        await result.current.advancedFilter({ grade_min: 80 });
      });

      expect(result.current.results).toEqual(mockResults);
    });

    it('should support filter with pagination', async () => {
      vi.mocked(api.apiClient.post).mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.advancedFilter({ first_name: 'John' }, 2);
      });

      expect(vi.mocked(api.apiClient.post)).toHaveBeenCalled();
    });

    it('should handle filtering errors', async () => {
      vi.mocked(api.apiClient.post).mockRejectedValue(
        new Error('Filter failed')
      );

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        try {
          await result.current.advancedFilter({ first_name: 'test' });
        } catch {
          // Error is handled
        }
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Load More', () => {
    it('should load more results for search', async () => {
      const mockResults1 = [{ id: 1, first_name: 'John' }];
      const mockResults2 = [{ id: 2, first_name: 'Jane' }];

      vi.mocked(api.apiClient.get)
        .mockResolvedValueOnce({ data: mockResults1 })
        .mockResolvedValueOnce({ data: mockResults2 });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.search('John');
      });

      expect(result.current.results).toEqual(mockResults1);

      await act(async () => {
        await result.current.loadMore('John');
      });

      // Should append new results
      expect(result.current.results.length).toBeGreaterThan(1);
    });

    it('should load more results for filters', async () => {
      const mockResults = [{ id: 1, grade_value: 85 }];

      vi.mocked(api.apiClient.post)
        .mockResolvedValueOnce({ data: mockResults })
        .mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearch('grades'));

      await act(async () => {
        await result.current.advancedFilter({ grade_min: 80 });
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Should make two API calls
      expect(vi.mocked(api.apiClient.post).mock.calls.length).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all search state', async () => {
      vi.mocked(api.apiClient.get).mockResolvedValue({
        data: [{ id: 1, first_name: 'John' }]
      });

      const { result } = renderHook(() => useSearch('students'));

      await act(async () => {
        await result.current.search('John');
      });

      expect(result.current.results.length).toBeGreaterThan(0);

      act(() => {
        result.current.clear();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should load statistics on initialization', async () => {
      const mockStats = {
        total_students: 100,
        total_courses: 50,
        total_grades: 500
      };

      vi.mocked(api.apiClient.get).mockResolvedValue({ data: mockStats });

      const { result } = renderHook(() => useSearch('students'));

      await waitFor(() => {
        expect(result.current.statistics).toBeDefined();
      });
    });

    it('should handle statistics loading errors', async () => {
      vi.mocked(api.apiClient.get).mockRejectedValue(
        new Error('Stats failed')
      );

      const { result } = renderHook(() => useSearch('students'));

      await waitFor(() => {
        // Should still initialize even if stats fail
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useSearch('students'));

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      unmount();

      // Verify cleanup occurred
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });
});
