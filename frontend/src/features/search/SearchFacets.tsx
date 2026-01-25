import React from 'react';
import { useTranslation } from 'react-i18next';

export interface FacetCounts {
  status?: Record<string, number>;
  enrollment_type?: Record<string, number>;
  months?: Record<string, number>;
  total_results?: number;
}

interface SearchFacetsProps {
  facets?: FacetCounts;
  loading?: boolean;
  onSelect?: (facet: string, value: string) => void;
  className?: string;
}

export const SearchFacets: React.FC<SearchFacetsProps> = ({ facets, loading = false, onSelect, className = '' }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <p className="text-sm text-gray-500">{t('search.facets.loading')}</p>
      </div>
    );
  }

  if (!facets) {
    return null;
  }

  const renderFacetGroup = (title: string, data?: Record<string, number>, facetKey?: string) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data).map(([key, count]) => (
            <button
              key={key}
              type="button"
              className="px-3 py-2 text-xs border border-gray-200 rounded-full bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition"
              onClick={() => facetKey && onSelect?.(facetKey, key)}
            >
              <span className="font-medium text-gray-800">{t(`search.facets.values.${key}`, key)}</span>
              <span className="ml-2 text-gray-500">{count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{t('search.facets.title')}</h3>
          <p className="text-xs text-gray-500">{t('search.facets.subtitle')}</p>
        </div>
        <div className="text-sm text-gray-600">
          {t('search.facets.total', { total: facets.total_results ?? 0 })}
        </div>
      </div>

      {renderFacetGroup(t('search.facets.status'), facets.status, 'status')}
      {renderFacetGroup(t('search.facets.enrollment_type'), facets.enrollment_type, 'enrollment_type')}
      {renderFacetGroup(t('search.facets.months'), facets.months, 'months')}
    </div>
  );
};

export default SearchFacets;
