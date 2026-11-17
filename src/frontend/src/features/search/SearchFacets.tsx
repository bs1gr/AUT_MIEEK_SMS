import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FacetDefinition } from './useSearchFacets';

/** The values that are ticked, per field. */
export type FacetSelections = Record<string, string[]>;

interface SearchFacetsProps {
  facets?: FacetDefinition[];
  /** What is ticked: the page keeps it, because the ticks are the filters of its search. */
  selected?: FacetSelections;
  loading?: boolean;
  onToggle?: (field: string, value: string) => void;
  onClear?: () => void;
  className?: string;
}

const LONG_LIST = 10;

/**
 * The filter panel of the Search page: one group of tick boxes per field. Several ticks in a
 * group mean "any of these"; ticks in different groups must all hold.
 *
 * Until November 2026 the panel kept its own ticks and reported only the box that was
 * clicked, ticked or not, so a box that was cleared kept filtering, a second tick replaced
 * the first, and "Clear all" cleared nothing.
 */
export const SearchFacets: React.FC<SearchFacetsProps> = ({
  facets,
  selected = {},
  loading = false,
  onToggle,
  onClear,
  className = '',
}) => {
  const { t } = useTranslation('search');
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const groups = Array.isArray(facets) ? facets : [];
  const selectedCount = Object.values(selected).reduce((sum, values) => sum + values.length, 0);

  const groupLabel = (facet: FacetDefinition): string =>
    t(`facets.fields.${facet.field}`, { defaultValue: facet.label });

  const valueLabel = (field: string, value: string): string => {
    if (field === 'status') return t(`facets.values.${value}`, { defaultValue: value });
    if (field === 'enrollment_type' && /^year_\d+$/.test(value)) {
      return t('facets.studyYear', { year: value.slice(5), defaultValue: `Year ${value.slice(5)}` });
    }
    return value;
  };

  if (loading && groups.length === 0) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-xs ${className}`}>
        <p className="text-sm text-gray-500">{t('facets.loading', { defaultValue: 'Loading filters...' })}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-xs ${className}`}>
        <p className="text-sm text-gray-500">{t('facets.empty', { defaultValue: 'No filters available' })}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-xs space-y-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-gray-800">{t('facets.title', { defaultValue: 'Filters' })}</h3>
        <p className="text-xs text-gray-500">
          {t('facets.subtitle', { defaultValue: 'Tick values to narrow the search' })}
        </p>
      </div>

      {groups.map((facet) => {
        const label = groupLabel(facet);
        const isLong = facet.values.length > LONG_LIST;
        const term = (searchTerms[facet.field] || '').toLowerCase();
        const matching = facet.values.filter((item) =>
          valueLabel(facet.field, item.value).toLowerCase().includes(term)
        );
        const visible = expandedFacets[facet.field] ? matching : matching.slice(0, LONG_LIST);

        return (
          <fieldset className="space-y-2" key={facet.field}>
            <legend className="text-sm font-semibold text-gray-700">{label}</legend>
            {isLong && (
              <input
                type="text"
                aria-label={`${label}: ${t('facets.search', { defaultValue: 'Search values...' })}`}
                placeholder={t('facets.search', { defaultValue: 'Search values...' })}
                className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                value={searchTerms[facet.field] || ''}
                onChange={(e) => setSearchTerms((prev) => ({ ...prev, [facet.field]: e.target.value }))}
              />
            )}
            <div className="flex flex-col gap-2">
              {visible.map((item) => (
                <label key={item.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={(selected[facet.field] || []).includes(item.value)}
                    onChange={() => onToggle?.(facet.field, item.value)}
                  />
                  <span>{`${valueLabel(facet.field, item.value)} (${Math.max(0, item.count)})`}</span>
                </label>
              ))}
            </div>
            {matching.length > LONG_LIST && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setExpandedFacets((prev) => ({ ...prev, [facet.field]: !prev[facet.field] }))}
              >
                {expandedFacets[facet.field]
                  ? t('facets.showLess', { defaultValue: 'Show less' })
                  : t('facets.showMore', { defaultValue: 'Show more' })}
              </button>
            )}
          </fieldset>
        );
      })}

      {selectedCount > 0 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">
            {t('facets.selected', { count: selectedCount, defaultValue: 'Selected: {{count}}' })}
          </span>
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => onClear?.()}>
            {t('facets.clear', { defaultValue: 'Clear all' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFacets;
