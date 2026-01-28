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

  const handleFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, field: event.target.value as SearchSortState['field'] });
  };

  const handleDirectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, direction: event.target.value as SearchSortState['direction'] });
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-gray-700" htmlFor="search-sort-field">
        {t('sort.label', { defaultValue: 'Sort by' })}
      </label>
      <select
        id="search-sort-field"
        value={sort.field}
        onChange={handleFieldChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="relevance">{t('sort.relevance', { defaultValue: 'Relevance' })}</option>
        <option value="name">{t('sort.name', { defaultValue: 'Name' })}</option>
        <option value="email">{t('sort.email', { defaultValue: 'Email' })}</option>
        <option value="created_at">{t('sort.created', { defaultValue: 'Created' })}</option>
        <option value="updated_at">{t('sort.updated', { defaultValue: 'Updated' })}</option>
      </select>

      <select
        aria-label={t('sort.directionLabel', { defaultValue: 'Sort direction' })}
        value={sort.direction}
        onChange={handleDirectionChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="asc">{t('sort.asc', { defaultValue: 'Ascending' })}</option>
        <option value="desc">{t('sort.desc', { defaultValue: 'Descending' })}</option>
      </select>
    </div>
  );
};

export default SearchSortControls;
