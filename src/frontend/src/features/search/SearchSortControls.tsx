import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchSortState } from './useSearch';

interface SearchSortControlsProps {
  sort: SearchSortState;
  onChange: (next: SearchSortState) => void;
  /** What the records being searched can be ordered by. All of them when not given. */
  fields?: SearchSortState['field'][];
  className?: string;
}

const ALL_FIELDS: SearchSortState['field'][] = ['relevance', 'name', 'email', 'date'];

export const SearchSortControls: React.FC<SearchSortControlsProps> = ({
  sort,
  onChange,
  fields = ALL_FIELDS,
  className = '',
}) => {
  const { t } = useTranslation('search');

  const fieldLabels: Record<SearchSortState['field'], string> = {
    relevance: t('sort.relevance', { defaultValue: 'Relevance' }),
    name: t('sort.name', { defaultValue: 'Name' }),
    email: t('sort.email', { defaultValue: 'Email' }),
    date: t('sort.date', { defaultValue: 'Date' }),
  };

  const handleFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, field: event.target.value as SearchSortState['field'] });
  };

  const handleDirectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...sort, direction: event.target.value as SearchSortState['direction'] });
  };

  // With "relevance" the two directions are best match first and best match last; for a
  // name or a date they are A to Z and Z to A, oldest and newest.
  const byRelevance = sort.field === 'relevance';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-gray-700" htmlFor="search-sort-field">
        {t('sort.label', { defaultValue: 'Sort by' })}
      </label>
      <select
        id="search-sort-field"
        value={sort.field}
        onChange={handleFieldChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      >
        {fields.map((field) => (
          <option key={field} value={field}>
            {fieldLabels[field]}
          </option>
        ))}
      </select>

      <select
        aria-label={t('sort.directionLabel', { defaultValue: 'Sort direction' })}
        value={sort.direction}
        onChange={handleDirectionChange}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      >
        <option value="asc">
          {byRelevance
            ? t('sort.worstFirst', { defaultValue: 'Best match last' })
            : t('sort.asc', { defaultValue: 'Ascending' })}
        </option>
        <option value="desc">
          {byRelevance
            ? t('sort.bestFirst', { defaultValue: 'Best match first' })
            : t('sort.desc', { defaultValue: 'Descending' })}
        </option>
      </select>
    </div>
  );
};

export default SearchSortControls;
