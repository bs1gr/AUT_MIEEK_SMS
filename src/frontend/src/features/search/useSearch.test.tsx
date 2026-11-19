import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { filtersToBody, useSearch } from './useSearch';
import * as apiModule from '@/api/api';

// Mock the API
const _mockPost = vi.fn();
vi.mock('@/api/api', () => {
  const mockPost = vi.fn();
  return {
    default: {
      post: mockPost,
      get: vi.fn(),
    },
    extractAPIResponseData: vi.fn((response) => response.data),
  };
});

describe('useSearch Hook', () => {
  let queryClient: QueryClient;
  let mockApiClient: typeof apiModule.default;

  beforeEach(() => {
      // Get the mocked module
      mockApiClient = vi.mocked(apiModule.default);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </I18nextProvider>
  );

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchType).toBe('students');
    expect(result.current.filters).toEqual([]);
    expect(result.current.page).toBe(0);
    expect(result.current.limit).toBe(20);
    expect(result.current.sort.field).toBe('relevance');
    expect(result.current.sort.direction).toBe('desc');
  });

  it('updates search query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('John Doe');
    });

    expect(result.current.searchQuery).toBe('John Doe');
  });

  it('updates search type', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchType('courses');
    });

    expect(result.current.searchType).toBe('courses');
  });

  it('debounces search query', async () => {
    const mockResponse = {
      data: {
        results: [],
        total: 0,
        has_more: false,
      },
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('Test');
    });

    // Debounced query should not immediately trigger search
    expect(result.current.debouncedQuery).toBe('');

    // Wait for debounce (300ms)
    await waitFor(
      () => {
        expect(result.current.debouncedQuery).toBe('Test');
      },
      { timeout: 500 }
    );
  });

  it('resets page when query changes', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setSearchQuery('New query');
    });

    await waitFor(() => {
      expect(result.current.page).toBe(0);
    });
  });

  it('adds a filter criterion', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'active',
      });
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0]).toEqual({
      field: 'status',
      operator: 'equals',
      value: 'active',
    });
  });

  it('removes a filter criterion by index', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'active',
      });
      result.current.addFilter({
        field: 'type',
        operator: 'equals',
        value: 'student',
      });
    });

    expect(result.current.filters).toHaveLength(2);

    act(() => {
      result.current.removeFilter(0);
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].field).toBe('type');
  });

  it('updates a filter criterion', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'active',
      });
    });

    act(() => {
      result.current.updateFilter(0, { value: 'inactive' });
    });

    expect(result.current.filters[0].value).toBe('inactive');
  });

  it('clears all search parameters', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('Test');
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'active',
      });
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filters).toEqual([]);
    expect(result.current.debouncedQuery).toBe('');
  });

  it('loads a saved search', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    const savedSearch = {
      id: 1,
      name: 'Active Students',
      search_type: 'students' as const,
      query: 'John',
      filters: [
        {
          field: 'status',
          operator: 'equals' as const,
          value: 'active',
        },
      ],
      is_favorite: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    act(() => {
      result.current.loadSavedSearch(savedSearch);
    });

    expect(result.current.searchType).toBe('students');
    expect(result.current.searchQuery).toBe('John');
    expect(result.current.filters).toEqual(savedSearch.filters);
  });

  it('updates search limit', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setLimit(50);
    });

    expect(result.current.limit).toBe(50);
  });

  it('updates sort order', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSort({
        field: 'name',
        direction: 'asc',
      });
    });

    expect(result.current.sort.field).toBe('name');
    expect(result.current.sort.direction).toBe('asc');
  });

  it('handles multiple filters on same field', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'active',
      });
      result.current.addFilter({
        field: 'status',
        operator: 'equals',
        value: 'pending',
      });
    });

    expect(result.current.filters).toHaveLength(2);
    expect(result.current.filters[0].field).toBe('status');
    expect(result.current.filters[1].field).toBe('status');
  });

  it('disables query when no search criteria provided', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.totalResults).toBe(0);
  });

  it('returns empty state messages correctly', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasMore).toBe(false);
  });

  it('updates page number', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });

  it('does not ask for the saved searches: no page shows them', async () => {
    mockApiClient.post.mockResolvedValue({ data: { results: [], total: 0 } });
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('John');
    });
    await waitFor(() => expect(mockApiClient.post).toHaveBeenCalled());

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('sends the page, its size and the order in the body of the request', async () => {
    mockApiClient.post.mockResolvedValue({
      data: { success: true, data: { results: [{ id: 7, type: 'student' }], total: 31, has_more: true, limit: 10, offset: 20 } },
    });
    vi.mocked(apiModule.extractAPIResponseData).mockImplementation(
      (response) => (response as { data: unknown }).data
    );
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('Zz');
    });
    act(() => {
      result.current.setLimit(10);
      result.current.setSort({ field: 'name', direction: 'asc' });
      result.current.setPage(2);
    });

    await waitFor(() =>
      expect(mockApiClient.post).toHaveBeenCalledWith('/search/advanced', {
        entity: 'students',
        query: 'Zz',
        filters: undefined,
        page: 2,
        page_size: 10,
        sort: { field: 'name', direction: 'asc' },
      })
    );
    // The total is the server's, not the length of the page.
    await waitFor(() => expect(result.current.totalResults).toBe(31));
    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('reports a search the server says it could not do, instead of an empty result', async () => {
    mockApiClient.post.mockResolvedValue({
      data: { success: false, data: null, error: { code: 'SEARCH_ERROR', message: 'Failed to perform advanced search' } },
    });
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('John');
    });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect((result.current.error as Error).message).toBe('Failed to perform advanced search');
    expect(result.current.searchResults).toEqual([]);
  });

  it('keeps the server\'s message when a search is refused with an HTTP error status', async () => {
    // What the endpoint sends since v1.18.75: status 422 (or 500) and the same envelope.
    mockApiClient.post.mockRejectedValue({
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: { success: false, data: null, error: { code: 'INVALID_SORT', message: "Cannot sort courses by 'email'" } },
      },
    });
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSearchQuery('John');
    });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect((result.current.error as Error).message).toBe("Cannot sort courses by 'email'");
    expect(result.current.searchResults).toEqual([]);
  });

  it('goes back to the default order when the new kind of record does not have the current one', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.setSort({ field: 'email', direction: 'asc' });
      result.current.setPage(3);
    });
    act(() => {
      result.current.setSearchType('courses');
    });

    expect(result.current.sort).toEqual({ field: 'relevance', direction: 'desc' });
    expect(result.current.page).toBe(0);

    // An order both kinds have is kept.
    act(() => {
      result.current.setSort({ field: 'name', direction: 'asc' });
    });
    act(() => {
      result.current.setSearchType('grades');
    });
    expect(result.current.sort).toEqual({ field: 'name', direction: 'asc' });
  });

  it('gives the server one entry per filtered field, a list when a field has several values', () => {
    expect(filtersToBody([])).toBeUndefined();
    expect(
      filtersToBody([
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'enrollment_type', operator: 'equals', value: 'year_1' },
        { field: 'status', operator: 'equals', value: 'inactive' },
        { field: 'enrollment_type', operator: 'equals', value: 'year_2' },
        { field: 'enrollment_type', operator: 'equals', value: 'year_3' },
      ])
    ).toEqual({ status: ['active', 'inactive'], enrollment_type: ['year_1', 'year_2', 'year_3'] });
  });
});
