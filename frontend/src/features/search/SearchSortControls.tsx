import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchSortState } from './useSearch';

interface SearchSortControlsProps {
  sort: SearchSortState;
  onChange: (next: SearchSortState) => void;
  className?: string;
}

export const SearchSortControls: React.FC<SearchSortControlsProps> = ({ sort, onChange, className = '' }) => {
  const { t } = useTranslation();

  const handleFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, field: event.target.value as SearchSortState['field'] });
  };

  const handleDirectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, direction: event.target.value as SearchSortState['direction'] });
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-gray-700" htmlFor="search-sort-field">
        {t('search.sort.label')}
      </label>
      <select
        id="search-sort-field"
        value={sort.field}
        onChange={handleFieldChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="relevance">{t('search.sort.relevance')}</option>
        <option value="name">{t('search.sort.name')}</option>
        <option value="email">{t('search.sort.email')}</option>
        <option value="created_at">{t('search.sort.created')}</option>
        <option value="updated_at">{t('search.sort.updated')}</option>
      </select>

      <select
        aria-label={t('search.sort.directionLabel')}
        value={sort.direction}
        onChange={handleDirectionChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="asc">{t('search.sort.asc')}</option>
        <option value="desc">{t('search.sort.desc')}</option>
      </select>
    </div>
  );
};

export default SearchSortControls;
