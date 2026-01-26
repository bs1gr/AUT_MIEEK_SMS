import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FacetValue = {
  label: string;
  value: string;
  count?: number;
};

type FacetDefinition = {
  field: string;
  label: string;
  type: 'checkbox' | 'select' | 'range' | 'date-range';
  values?: FacetValue[];
  min?: number;
  max?: number;
};

interface SearchFacetsProps {
  facets?: FacetDefinition[];
  loading?: boolean;
  onSelect?: (facet: string, value: any) => void;
  className?: string;
}

export const SearchFacets: React.FC<SearchFacetsProps> = ({ facets, loading = false, onSelect, className = '' }) => {
  const { t } = useTranslation('search');
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [selectedValues, setSelectedValues] = useState<Record<string, Set<string>>>({});
  const [selectSelections, setSelectSelections] = useState<Record<string, string>>({});

  const translate = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    // Return the translated value or fallback if translation key wasn't found
    return typeof value === 'string' && !value.includes('.') ? value : fallback;
  };

  const filteredFacets = facets || [];

  if (loading) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <p className="text-sm text-gray-500">
          {translate('search.facets.loading', 'Loading filters...')}
        </p>
      </div>
    );
  }

  if (!filteredFacets || filteredFacets.length === 0) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <p className="text-sm text-gray-500">
          {translate('search.facets.empty', 'No filters available')}
        </p>
      </div>
    );
  }

  const toggleCheckbox = (field: string, value: string) => {
    setSelectedValues((prev) => {
      const next = new Set(prev[field] || []);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      onSelect?.(field, value);
      return { ...prev, [field]: next };
    });
  };

  const handleClearAll = () => {
    setSelectedValues({});
    onSelect?.('__clear_all__', null);
  };

  const renderCheckboxFacet = (facet: FacetDefinition) => {
    const values = facet.values || [];
    const searchTerm = searchTerms[facet.field] || '';
    const filtered = values.filter((v) => v.label.toLowerCase().startsWith(searchTerm.toLowerCase()));
    const visible = expandedFacets[facet.field] ? filtered : filtered.slice(0, 10);

    return (
      <div className="space-y-2" key={facet.field}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">{facet.label}</h4>
          <input
            type="text"
            placeholder={translate('search.facets.search', 'Search values...')}
            className="text-xs px-2 py-1 border border-gray-200 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerms((prev) => ({ ...prev, [facet.field]: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          {visible.map((item) => {
            const count = Math.max(0, item.count ?? 0);
            const label = `${item.label} (${count})`;
            const checked = selectedValues[facet.field]?.has(item.value) || false;
            return (
              <label key={item.value} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheckbox(facet.field, item.value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
        {filtered.length > 10 && (
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setExpandedFacets((prev) => ({ ...prev, [facet.field]: !prev[facet.field] }))}
          >
            {expandedFacets[facet.field]
              ? translate('search.facets.showLess', 'Show less')
              : translate('search.facets.showMore', 'Show more')}
          </button>
        )}
      </div>
    );
  };

  const renderSelectFacet = (facet: FacetDefinition) => {
    const values = facet.values || [];
    const selected = selectSelections[facet.field] ?? values[0]?.value ?? '';

    return (
      <div className="space-y-2" key={facet.field}>
        <h4 className="text-sm font-semibold text-gray-700">{facet.label}</h4>
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
          value={selected}
          onChange={(e) => {
            setSelectSelections((prev) => ({ ...prev, [facet.field]: e.target.value }));
            onSelect?.(facet.field, e.target.value);
          }}
        >
          {values.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderRangeFacet = (facet: FacetDefinition) => (
    <div className="space-y-2" key={facet.field}>
      <h4 className="text-sm font-semibold text-gray-700">{facet.label}</h4>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={facet.min}
          max={facet.max}
          placeholder={translate('search.facets.min', 'Min')}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
          onChange={(e) => onSelect?.(facet.field, { min: parseFloat(e.target.value) })}
        />
        <input
          type="number"
          min={facet.min}
          max={facet.max}
          placeholder={translate('search.facets.max', 'Max')}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
          onChange={(e) => onSelect?.(facet.field, { max: parseFloat(e.target.value) })}
        />
      </div>
    </div>
  );

  const renderDateRangeFacet = (facet: FacetDefinition) => (
    <div className="space-y-2" key={facet.field}>
      <h4 className="text-sm font-semibold text-gray-700">{facet.label}</h4>
      <div className="flex items-center gap-2">
        <input
          type="date"
          placeholder={translate('search.facets.start', 'Start')}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
          onChange={(e) => onSelect?.(facet.field, { start: e.target.value })}
        />
        <input
          type="date"
          placeholder={translate('search.facets.end', 'End')}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
          onChange={(e) => onSelect?.(facet.field, { end: e.target.value })}
        />
      </div>
    </div>
  );

  const renderedFacets = useMemo(() =>
    filteredFacets.map((facet) => {
      switch (facet.type) {
        case 'checkbox':
          return renderCheckboxFacet(facet);
        case 'select':
          return renderSelectFacet(facet);
        case 'range':
          return renderRangeFacet(facet);
        case 'date-range':
          return renderDateRangeFacet(facet);
        default:
          return null;
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredFacets, expandedFacets, searchTerms, selectedValues, selectSelections]
  );

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{translate('search.facets.title', 'Filters')}</h3>
          <p className="text-xs text-gray-500">{translate('search.facets.subtitle', 'Use facets to narrow the search')}</p>
        </div>
      </div>

      {renderedFacets}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-500">{`${filteredFacets.length} filters available`}</span>
        <button type="button" className="text-xs text-blue-600 hover:underline" onClick={handleClearAll}>
          {translate('search.facets.clear', 'Clear all')}
        </button>
      </div>
    </div>
  );
};

export default SearchFacets;
