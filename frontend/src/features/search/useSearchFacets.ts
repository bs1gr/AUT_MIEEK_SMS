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

export interface FacetDefinition {
  field: string;
  label: string;
  type: 'checkbox' | 'select' | 'range' | 'date-range';
  values?: Array<{
    label: string;
    value: string;
    count?: number;
  }>;
  min?: number;
  max?: number;
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

      // Transform API response into FacetDefinition array format
      const facetDefinitions: FacetDefinition[] = [];

      if (data?.facets) {
        // Status facet (checkbox type)
        if (data.facets.status && Object.keys(data.facets.status).length > 0) {
          facetDefinitions.push({
            field: 'status',
            label: 'Status',
            type: 'checkbox',
            values: Object.entries(data.facets.status).map(([value, count]) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value,
              count: count as number,
            })),
          });
        }

        // Enrollment type facet (checkbox type)
        if (data.facets.enrollment_type && Object.keys(data.facets.enrollment_type).length > 0) {
          facetDefinitions.push({
            field: 'enrollment_type',
            label: 'Enrollment Type',
            type: 'checkbox',
            values: Object.entries(data.facets.enrollment_type).map(([value, count]) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value,
              count: count as number,
            })),
          });
        }
      }

      return { facets: facetDefinitions };
    },
    staleTime: 60000,
  });
};
