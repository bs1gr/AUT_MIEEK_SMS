import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { facetsFromServer, useSearchFacets } from './useSearchFacets';
import apiClient from '@/api/api';

vi.mock('@/api/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/api')>();
  const client = { get: vi.fn() };
  return { ...original, default: client, apiClient: client };
});

// What GET /search/students/facets?q=o answers, as the HTTP client hands it over.
// Until November 2026 the tests of this file gave the hook a map (`{ status: { active: 45 } }`)
// that the server never sent, and the hook read that map from the response instead of from
// its body: the tests passed and the panel was empty for every search.
const studentsAnswer = {
  status: 200,
  data: {
    success: true,
    data: {
      facets: [
        {
          name: 'status',
          label: 'Student Status',
          values: [
            { value: 'active', count: 3, is_selected: false },
            { value: 'inactive', count: 1, is_selected: false },
          ],
          is_expanded: false,
        },
        {
          name: 'enrollment_type',
          label: 'Study Year',
          values: [{ value: 'year_2', count: 4, is_selected: false }],
          is_expanded: false,
        },
      ],
      total_results: 4,
      query: 'o',
    },
    error: null,
  },
};

const get = vi.mocked(apiClient.get);

describe('facetsFromServer', () => {
  it('reads the list the server sends', () => {
    expect(facetsFromServer(studentsAnswer.data.data.facets)).toEqual([
      {
        field: 'status',
        label: 'Student Status',
        values: [
          { value: 'active', count: 3 },
          { value: 'inactive', count: 1 },
        ],
      },
      { field: 'enrollment_type', label: 'Study Year', values: [{ value: 'year_2', count: 4 }] },
    ]);
  });

  it('gives every value as text, the number of credits too', () => {
    const facets = facetsFromServer([{ name: 'credits', label: 'Course Credits', values: [{ value: 3, count: 2 }] }]);

    expect(facets[0].values).toEqual([{ value: '3', count: 2 }]);
  });

  it('leaves out a group without values and a value without a name', () => {
    const facets = facetsFromServer([
      { name: 'semester', label: 'Semester', values: [] },
      { name: 'credits', values: [{ value: null, count: 5 }, { value: '4' }] },
      { label: 'No name', values: [{ value: 'x', count: 1 }] },
    ]);

    expect(facets).toEqual([{ field: 'credits', label: 'credits', values: [{ value: '4', count: 0 }] }]);
  });

  it('answers with nothing for anything that is not a list', () => {
    expect(facetsFromServer({ status: { active: 45 } })).toEqual([]);
    expect(facetsFromServer(undefined)).toEqual([]);
    expect(facetsFromServer(null)).toEqual([]);
  });
});

describe('useSearchFacets', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    get.mockResolvedValue(studentsAnswer);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('asks for the counts of the students a text finds, and reads them from the body', async () => {
    const { result } = renderHook(() => useSearchFacets('students', 'o'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/search/students/facets', { params: { q: 'o' } });
    expect(result.current.data?.facets.map((facet) => facet.field)).toEqual(['status', 'enrollment_type']);
    expect(result.current.data?.facets[0].values).toEqual([
      { value: 'active', count: 3 },
      { value: 'inactive', count: 1 },
    ]);
  });

  it('asks the courses endpoint for courses', async () => {
    const { result } = renderHook(() => useSearchFacets('courses', 'calc'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(get).toHaveBeenCalledWith('/search/courses/facets', { params: { q: 'calc' } });
  });

  it('asks nothing for grades, and nothing while there is no search', async () => {
    const grades = renderHook(() => useSearchFacets('grades', 'midterm'), { wrapper });
    const idle = renderHook(() => useSearchFacets('students', ''), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(get).not.toHaveBeenCalled();
    expect(grades.result.current.isLoading).toBe(false);
    expect(idle.result.current.isLoading).toBe(false);
  });

  it('asks without a text when only a filter is left of the search', async () => {
    const { result } = renderHook(() => useSearchFacets('students', '', true), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(get).toHaveBeenCalledWith('/search/students/facets', { params: {} });
  });

  it('asks again when the text changes, and not again for a text it has the answer to', async () => {
    const { result, rerender } = renderHook(({ query }) => useSearchFacets('students', query), {
      wrapper,
      initialProps: { query: 'john' },
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    rerender({ query: 'jane' });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenLastCalledWith('/search/students/facets', { params: { q: 'jane' } });

    rerender({ query: 'john' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('reports a request that failed', async () => {
    get.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useSearchFacets('students', 'o'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('has no groups for an answer that says the request failed', async () => {
    get.mockResolvedValue({ data: { success: false, data: null, error: { code: 'FACET_ERROR' } } });

    const { result } = renderHook(() => useSearchFacets('students', 'o'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.facets).toEqual([]);
  });
});
