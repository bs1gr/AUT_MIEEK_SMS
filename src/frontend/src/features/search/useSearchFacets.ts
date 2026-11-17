import { useQuery } from '@tanstack/react-query';
import apiClient, { extractAPIResponseData } from '@/api/api';
import type { SearchType } from './useSearch';

export interface FacetValue {
  value: string;
  count: number;
}

/** One group of the filter panel: a field of the records, and the values it has. */
export interface FacetDefinition {
  field: string;
  /** The server's English name for the group; the panel shows a translation when it has one. */
  label: string;
  values: FacetValue[];
}

/**
 * The groups as the server sends them: a list of `{ name, label, values: [{ value, count }] }`.
 *
 * Until November 2026 this file read a map (`{ status: { active: 4 } }`), and read it from
 * the HTTP response instead of from its body, so the panel said "No filters available" for
 * every search.
 */
export const facetsFromServer = (facets: unknown): FacetDefinition[] => {
  if (!Array.isArray(facets)) return [];
  return facets.flatMap((facet): FacetDefinition[] => {
    const { name, label, values } = (facet ?? {}) as { name?: unknown; label?: unknown; values?: unknown };
    if (typeof name !== 'string' || !Array.isArray(values)) return [];
    const list = values.flatMap((item): FacetValue[] => {
      const { value, count } = (item ?? {}) as { value?: unknown; count?: unknown };
      if (value === null || value === undefined || value === '') return [];
      return [{ value: String(value), count: typeof count === 'number' ? count : 0 }];
    });
    if (list.length === 0) return [];
    return [{ field: name, label: typeof label === 'string' ? label : name, values: list }];
  });
};

/**
 * The filter panel's groups for a search: for students and for courses. Grades have none (the
 * page narrows them by date).
 *
 * @param query the text of the search, after the typing has stopped
 * @param active whether there is a search at all (a text, or a filter already chosen)
 */
export const useSearchFacets = (searchType: SearchType, query: string, active: boolean = Boolean(query)) => {
  return useQuery({
    queryKey: ['search-facets', searchType, query],
    enabled: active && searchType !== 'grades',
    queryFn: async () => {
      const response = await apiClient.get(`/search/${searchType}/facets`, {
        params: query ? { q: query } : {},
      });
      const data = extractAPIResponseData<{ facets?: unknown } | null>(response.data);
      return { facets: facetsFromServer(data?.facets) };
    },
    staleTime: 60000,
    // The panel keeps its groups while the counts for the next text are on their way.
    placeholderData: (previous) => previous,
  });
};
