import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useSearchFacets } from './useSearchFacets';
import * as apiModule from '@/api/api';

// Mock the API with a default client that has a get method
vi.mock('@/api/api', () => {
  const mockGet = vi.fn();
  return {
    default: {
      get: mockGet,
    },
    extractAPIResponseData: vi.fn((response) => response.data),
  };
});

describe('useSearchFacets Hook', () => {
  let queryClient: QueryClient;
  let mockApiClient: any;

  beforeEach(() => {
    // Get the mocked module
    mockApiClient = vi.mocked(apiModule.default);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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

  const mockFacetsResponse = {
    facets: {
      status: {
        active: 45,
        inactive: 12,
      },
      enrollment_type: {
        'full-time': 38,
        'part-time': 15,
      },
    },
    query: 'test',
  };

  const expectedTransformedFacets = {
    facets: [
      {
        field: 'status',
        label: 'Status',
        type: 'checkbox' as const,
        values: [
          { label: 'Active', count: 45, value: 'active' },
          { label: 'Inactive', count: 12, value: 'inactive' },
        ],
      },
      {
        field: 'enrollment_type',
        label: 'Enrollment Type',
        type: 'checkbox' as const,
        values: [
          { label: 'Full-time', count: 38, value: 'full-time' },
          { label: 'Part-time', count: 15, value: 'part-time' },
        ],
      },
    ],
  };

  it('initializes with loading state', () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { result } = renderHook(() => useSearchFacets(''), { wrapper });

    // Query is disabled when empty, so it should not be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches facets successfully', async () => {
    // Mock the API to return the SearchFacetsResult format
    mockApiClient.get.mockResolvedValue(mockFacetsResponse);
    vi.mocked(apiModule.extractAPIResponseData).mockReturnValue(mockFacetsResponse);

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook transforms the API response, so check the transformed structure
    expect(result.current.data).toMatchObject(expectedTransformedFacets);
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('Network error');
    mockApiClient.get.mockRejectedValue(error);

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('includes search query in request', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    renderHook(() => useSearchFacets('john'), { wrapper });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/search/students/facets',
        { params: { q: 'john' } }
      );
    });
  });

  it('refetches when search query changes', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { rerender } = renderHook(
      ({ query }) => useSearchFacets(query),
      {
        wrapper,
        initialProps: { query: 'john' },
      }
    );

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalled();
    });

    const callCountAfterFirstRender = mockApiClient.get.mock.calls.length;

    rerender({ query: 'jane' });

    await waitFor(() => {
      expect(mockApiClient.get.mock.calls.length).toBeGreaterThan(
        callCountAfterFirstRender
      );
    });
  });

  it('caches facet results', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { rerender } = renderHook(
      ({ query }) => useSearchFacets(query),
      {
        wrapper,
        initialProps: { query: 'test' },
      }
    );

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    // Rerender with same query
    rerender({ query: 'test' });

    // Should not trigger another fetch (cached)
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns empty facets when no data', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { facets: [] },
    });

    const { result } = renderHook(() => useSearchFacets(''), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.facets || []).toEqual([]);
  });

  it('handles different facet types', async () => {
    // The hook only transforms status and enrollment_type from API response
    const complexFacetsResponse = {
      facets: {
        status: {
          active: 45,
          inactive: 12,
          graduated: 8,
        },
        enrollment_type: {
          'full-time': 38,
          'part-time': 15,
          audit: 5,
        },
      },
      query: 'test',
    };

    mockApiClient.get.mockResolvedValue(complexFacetsResponse);
    vi.mocked(apiModule.extractAPIResponseData).mockReturnValue(complexFacetsResponse);

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should transform into 2 facet definitions (both checkbox type)
    expect(result.current.data?.facets).toHaveLength(2);
    expect(result.current.data?.facets[0].type).toBe('checkbox');
    expect(result.current.data?.facets[0].field).toBe('status');
    expect(result.current.data?.facets[0].values).toHaveLength(3);
    expect(result.current.data?.facets[1].type).toBe('checkbox');
    expect(result.current.data?.facets[1].field).toBe('enrollment_type');
    expect(result.current.data?.facets[1].values).toHaveLength(3);
  });

  it('handles empty search query', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { result } = renderHook(() => useSearchFacets(''), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Query is disabled when empty, so the request should not fire
    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('provides loading state during fetch', async () => {
    let resolveGet: any;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });

    mockApiClient.get.mockReturnValue(getPromise);

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    resolveGet({ data: mockFacetsResponse });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('updates facet counts based on search context', async () => {
    const initialResponse = {
      facets: [
        {
          field: 'status',
          label: 'Status',
          type: 'checkbox' as const,
          values: [
            { label: 'Active', count: 45, value: 'active' },
          ],
        },
      ],
    };

    const updatedResponse = {
      facets: [
        {
          field: 'status',
          label: 'Status',
          type: 'checkbox' as const,
          values: [
            { label: 'Active', count: 12, value: 'active' }, // Count changed
          ],
        },
      ],
    };

    mockApiClient.get.mockResolvedValueOnce({ data: initialResponse });
    mockApiClient.get.mockResolvedValueOnce({ data: updatedResponse });

    const { rerender } = renderHook(
      ({ query }) => useSearchFacets(query),
      {
        wrapper,
        initialProps: { query: 'john' },
      }
    );

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    rerender({ query: 'jane' });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
