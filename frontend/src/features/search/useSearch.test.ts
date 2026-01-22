import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { useSearch } from '../useSearch';
import * as apiModule from '@/api/api';

// Mock the API
vi.mock('@/api/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useSearch Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchType).toBe('students');
    expect(result.current.filters).toEqual([]);
    expect(result.current.searchResults).toEqual([]);
  });

  it('should update search query', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.searchQuery).toBe('test');
  });

  it('should change search type', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchType('courses');
    });

    expect(result.current.searchType).toBe('courses');
  });

  it('should add a filter', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'name',
        operator: 'contains',
        value: 'test',
      });
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0]).toEqual({
      field: 'name',
      operator: 'contains',
      value: 'test',
    });
  });

  it('should remove a filter', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'name',
        operator: 'contains',
        value: 'test',
      });
    });

    expect(result.current.filters).toHaveLength(1);

    act(() => {
      result.current.removeFilter(0);
    });

    expect(result.current.filters).toHaveLength(0);
  });

  it('should update a filter', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'name',
        operator: 'contains',
        value: 'test',
      });
    });

    act(() => {
      result.current.updateFilter(0, { value: 'updated' });
    });

    expect(result.current.filters[0].value).toBe('updated');
  });

  it('should clear search', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('test');
      result.current.addFilter({
        field: 'name',
        operator: 'contains',
        value: 'test',
      });
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filters).toEqual([]);
    expect(result.current.debouncedQuery).toBe('');
  });

  it('should fetch search results', async () => {
    const mockResults = [
      { id: 1, name: 'John Doe', type: 'student' as const, metadata: {} },
    ];

    vi.mocked(apiModule.apiClient.post).mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('john');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
    });

    expect(result.current.searchResults[0]).toEqual(mockResults[0]);
  });

  it('should fetch saved searches', async () => {
    const mockSavedSearches = [
      {
        id: 1,
        name: 'My Search',
        search_type: 'students' as const,
        query: 'test',
        is_favorite: true,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
    ];

    vi.mocked(apiModule.apiClient.get).mockResolvedValue(mockSavedSearches);

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.savedSearches).toHaveLength(1);
    });

    expect(result.current.savedSearches[0]).toEqual(mockSavedSearches[0]);
  });

  it('should create a saved search', async () => {
    const mockSavedSearch = {
      id: 1,
      name: 'My Search',
      search_type: 'students' as const,
      query: 'test',
      is_favorite: false,
      created_at: '2026-01-22T10:00:00Z',
      updated_at: '2026-01-22T10:00:00Z',
    };

    vi.mocked(apiModule.apiClient.post).mockResolvedValue(mockSavedSearch);

    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('test');
    });

    const saved = await act(async () => {
      return result.current.createSavedSearch('My Search', 'Test search');
    });

    expect(saved).toEqual(mockSavedSearch);
    expect(apiModule.apiClient.post).toHaveBeenCalledWith(
      '/search/saved',
      expect.objectContaining({
        name: 'My Search',
        description: 'Test search',
      })
    );
  });
});
