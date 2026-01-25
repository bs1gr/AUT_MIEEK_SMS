import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient, { extractAPIResponseData } from '../api/api';

export interface SearchFacetsData {
  status?: Record<string, number>;
  enrollment_type?: Record<string, number>;
  months?: Record<string, number>;
  total_results?: number;
}

export const useSearchFacets = () => {
  const { t } = useTranslation();
  const [facets, setFacets] = useState<SearchFacetsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFacets = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setFacets(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/search/students/facets', {
          params: { q: query }
        });

        const data = extractAPIResponseData(response) as { facets?: SearchFacetsData } | SearchFacetsData | undefined;
        const resolvedFacets = (data && 'facets' in (data as any) ? (data as any).facets : data) || null;

        setFacets(resolvedFacets);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('search.errorSearching');
        setError(message);
        setFacets(null);
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const clear = useCallback(() => {
    setFacets(null);
    setError(null);
  }, []);

  return {
    facets,
    isLoading,
    error,
    fetchFacets,
    clear
  };
};

export default useSearchFacets;
