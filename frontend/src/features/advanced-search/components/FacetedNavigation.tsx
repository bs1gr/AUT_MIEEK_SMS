import React from 'react';
import { useTranslation } from 'react-i18next';
import { FacetValue } from '@/features/advanced-search/types/search';

export interface FacetedNavigationProps {
  facets: Record<string, FacetValue[]>;
  selected: Record<string, string[]>;
  onToggle: (facetKey: string, value: string) => void;
  onClearFacet?: (facetKey: string) => void;
  className?: string;
}

/**
 * FacetedNavigation
 * Sidebar component rendering facet groups with counts and selection state.
 * Lightweight client-side component that operates on provided facet data.
 */
export const FacetedNavigation: React.FC<FacetedNavigationProps> = ({
  facets,
  selected,
  onToggle,
  onClearFacet,
  className,
}) => {
  const { t } = useTranslation('search');
  const facetKeys = Object.keys(facets || {});

  if (!facetKeys.length) {
    return (
      <div className={className}>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">{t('search.facets.title')}</h2>
          <p className="text-gray-500">{t('search.facets.empty', { defaultValue: 'No facets available for current results.' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('search.facets.title')}</h2>
        <div className="space-y-6">
          {facetKeys.map((facetKey) => {
            const values = facets[facetKey] || [];
            const selectedValues = new Set(selected?.[facetKey] || []);
            return (
              <div key={facetKey}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t(`search.facets.${facetKey}`, { defaultValue: facetKey })}
                  </h3>
                  {onClearFacet && (
                    <button
                      type="button"
                      onClick={() => onClearFacet(facetKey)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {t('search.facets.clear', { defaultValue: 'Clear' })}
                    </button>
                  )}
                </div>
                <ul className="space-y-1">
                  {values.map((v) => {
                    const valueStr = String(v.value);
                    const isSelected = selectedValues.has(valueStr);
                    return (
                      <li key={valueStr}>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggle(facetKey, valueStr)}
                              className="accent-blue-600"
                              aria-label={`${facetKey}:${valueStr}`}
                            />
                            <span className="text-sm text-gray-800">{t(`search.facets.values.${valueStr}`, { defaultValue: valueStr })}</span>
                          </span>
                          <span className="text-xs text-gray-500">{v.count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FacetedNavigation;
