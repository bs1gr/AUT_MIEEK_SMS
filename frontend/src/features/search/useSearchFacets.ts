import { useQuery } from '@tanstack/react-query';
import apiClient, { extractAPIResponseData } from '@/api/api';

export interface SearchFacetsResult {
  facets: {
    status?: Record<string, number>;
    enrollment_type?: Record<string, number>;
    months?: Record<string, number>;
    total_results?: number;
  };
  query: string;
}

export const useSearchFacets = (query: string) => {
  return useQuery({
    queryKey: ['search-facets', query],
    enabled: Boolean(query),
    queryFn: async () => {
      const response = await apiClient.get('/search/students/facets', {
        params: { q: query },
      });
      const data = extractAPIResponseData<SearchFacetsResult>(response);
      return data;
    },
    staleTime: 60000,
  });
};
