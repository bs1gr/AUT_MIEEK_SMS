import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterCondition } from '@/features/advanced-search/types/search';
import AdvancedFilters from './AdvancedFilters';

interface Props {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  entityType: 'students' | 'courses' | 'grades' | 'all';
  className?: string;
}

/**
 * AdvancedQueryBuilder
 * Simple wrapper around AdvancedFilters adding an AND/OR grouping selector.
 * Note: Current backend expects flat filters (AND). OR behavior is planned future work.
 */
export const AdvancedQueryBuilder: React.FC<Props> = ({ filters, onFiltersChange, entityType, className }) => {
  const { t } = useTranslation();
  const [groupOperator, setGroupOperator] = useState<'AND' | 'OR'>('AND');

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('search.queryBuilder.title', { defaultValue: 'Advanced Query Builder' })}</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">{t('search.queryBuilder.group', { defaultValue: 'Group operator' })}</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              aria-label="group-operator"
              value={groupOperator}
              onChange={(e) => setGroupOperator(e.target.value as 'AND' | 'OR')}
            >
              <option value="AND">{t('search.queryBuilder.and', { defaultValue: 'AND' })}</option>
              <option value="OR">{t('search.queryBuilder.or', { defaultValue: 'OR' })}</option>
            </select>
          </div>
        </div>
        <AdvancedFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          entityType={entityType}
        />
        <p className="mt-2 text-xs text-gray-500">
          {groupOperator === 'OR'
            ? t('search.queryBuilder.noteOr', { defaultValue: 'Note: OR grouping is UI-only for now; backend applies flat filters.' })
            : t('search.queryBuilder.noteAnd', { defaultValue: 'Filters are combined with AND.' })}
        </p>
      </div>
    </div>
  );
};

export default AdvancedQueryBuilder;
