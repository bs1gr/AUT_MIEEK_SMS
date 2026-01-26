import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchSortState } from './useSearch';

interface SearchSortControlsProps {
  sort: SearchSortState;
  onChange: (next: SearchSortState) => void;
  className?: string;
}

export const SearchSortControls: React.FC<SearchSortControlsProps> = ({ sort, onChange, className = '' }) => {
  const { t } = useTranslation('search');

  const translate = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  const handleFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, field: event.target.value as SearchSortState['field'] });
  };

  const handleDirectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, direction: event.target.value as SearchSortState['direction'] });
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-gray-700" htmlFor="search-sort-field">
        {translate('sort.label', 'Sort by')}
      </label>
      <select
        id="search-sort-field"
        value={sort.field}
        onChange={handleFieldChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="relevance">{translate('sort.relevance', 'relevance')}</option>
        <option value="name">{translate('sort.name', 'name')}</option>
        <option value="email">{translate('sort.email', 'email')}</option>
        <option value="created_at">{translate('sort.created', 'created_at')}</option>
        <option value="updated_at">{translate('sort.updated', 'updated_at')}</option>
      </select>

      <select
        aria-label={translate('sort.directionLabel', 'Sort direction')}
        value={sort.direction}
        onChange={handleDirectionChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="asc">{translate('search.sort.asc', 'asc')}</option>
        <option value="desc">{translate('search.sort.desc', 'desc')}</option>
      </select>
    </div>
  );
};

export default SearchSortControls;
