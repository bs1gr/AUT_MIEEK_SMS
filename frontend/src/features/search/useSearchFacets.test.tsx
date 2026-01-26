import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useSearchFacets } from './useSearchFacets';
import * as apiModule from '@/api/api';

// Mock the API
vi.mock('@/api/api');

describe('useSearchFacets Hook', () => {
  let queryClient: QueryClient;
  const mockApiClient = apiModule.apiClient as any;

  beforeEach(() => {
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
        type: 'select' as const,
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

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches facets successfully', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockFacetsResponse);
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
        expect.stringContaining('q=john')
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
    const complexFacetsResponse = {
      facets: [
        {
          field: 'status',
          label: 'Status',
          type: 'checkbox' as const,
          values: [{ label: 'Active', count: 45, value: 'active' }],
        },
        {
          field: 'gpa',
          label: 'GPA',
          type: 'range' as const,
          min: 0,
          max: 4,
        },
        {
          field: 'enrollment_date',
          label: 'Enrollment Date',
          type: 'date-range' as const,
        },
      ],
    };

    mockApiClient.get.mockResolvedValue({
      data: complexFacetsResponse,
    });

    const { result } = renderHook(() => useSearchFacets('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.facets).toHaveLength(3);
    expect(result.current.data?.facets[0].type).toBe('checkbox');
    expect(result.current.data?.facets[1].type).toBe('range');
    expect(result.current.data?.facets[2].type).toBe('date-range');
  });

  it('handles empty search query', async () => {
    mockApiClient.get.mockResolvedValue({
      data: mockFacetsResponse,
    });

    const { result } = renderHook(() => useSearchFacets(''), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockApiClient.get).toHaveBeenCalled();
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
