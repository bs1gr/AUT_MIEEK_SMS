import React, { FC, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import FilterCondition from './FilterCondition';
import {
  FilterCondition as FilterConditionType,
  FilterFieldDef,
  FILTER_FIELDS,
} from '../types/search';

export interface AdvancedFiltersProps {
  filters: FilterConditionType[];
  onFiltersChange: (filters: FilterConditionType[]) => void;
  entityType?: 'students' | 'courses' | 'grades' | 'all';
  availableFields?: FilterFieldDef[];
  disabled?: boolean;
  className?: string;
}

export const DEFAULT_FILTER_FIELDS: FilterFieldDef[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    operators: ['equals'],
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'graduated', label: 'Graduated' },
    ],
  },
  {
    name: 'created_at',
    label: 'Created Date',
    type: 'date',
    operators: ['greaterThan', 'lessThan', 'between'],
  },
  {
    name: 'points',
    label: 'Points',
    type: 'number',
    operators: ['greaterThan', 'lessThan', 'between'],
  },
  {
    name: 'code',
    label: 'Course Code',
    type: 'text',
    operators: ['equals', 'startsWith'],
  },
];

const dedupeFields = (fields: FilterFieldDef[]): FilterFieldDef[] => {
  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.name)) return false;
    seen.add(field.name);
    return true;
  });
};

const resolveFields = (
  entityType: 'students' | 'courses' | 'grades' | 'all',
  provided?: FilterFieldDef[]
): FilterFieldDef[] => {
  if (provided && provided.length > 0) return provided;

  if (entityType === 'all') {
    const combined = Object.values(FILTER_FIELDS).flat();
    const fields = combined.length > 0 ? combined : DEFAULT_FILTER_FIELDS;
    return dedupeFields(fields);
  }

  const fields = FILTER_FIELDS[entityType];
  if (fields && fields.length > 0) {
    return fields;
  }

  return DEFAULT_FILTER_FIELDS;
};

const createDefaultCondition = (field: FilterFieldDef): FilterConditionType => {
  const operator = field.operators[0];
  let value: FilterConditionType['value'] = '';

  switch (operator) {
    case 'greaterThan':
    case 'lessThan':
      value = 0;
      break;
    case 'between':
      value = [0, 0];
      break;
    default:
      if (field.type === 'number') {
        value = 0;
      } else if (field.type === 'select') {
        value = (field.options?.[0]?.value ?? '') as string | number;
      } else {
        value = '';
      }
  }

  return {
    field: field.name,
    operator,
    value,
  };
};

const AdvancedFilters: FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  entityType = 'all',
  availableFields,
  disabled = false,
  className = '',
}) => {
  const { t } = useTranslation('search');
  const [expanded, setExpanded] = useState<boolean>(false);

  const fields = useMemo(() => resolveFields(entityType, availableFields), [entityType, availableFields]);

  const handleAddFilter = useCallback(() => {
    if (disabled || fields.length === 0) return;
    const nextCondition = createDefaultCondition(fields[0]);
    onFiltersChange([...filters, nextCondition]);
  }, [disabled, fields, filters, onFiltersChange]);

  const handleConditionChange = useCallback(
    (index: number, condition: FilterConditionType) => {
      if (disabled) return;
      const next = filters.map((item, i) => (i === index ? condition : item));
      onFiltersChange(next);
    },
    [disabled, filters, onFiltersChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (disabled) return;
      const next = filters.filter((_, i) => i !== index);
      onFiltersChange(next);
    },
    [disabled, filters, onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    if (disabled) return;
    onFiltersChange([]);
  }, [disabled, onFiltersChange]);

  const badgeCount = filters.length;

  return (
    <div className={`advanced-filters bg-white rounded-lg shadow ${className}`} data-testid="advanced-filters">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="advanced-filters-panel"
        data-testid="toggle-filters-btn"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
          {t('search.advancedFilters.title', 'Advanced Filters')}
          {badgeCount > 0 && (
            <span
              className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              data-testid="filter-count-badge"
            >
              {badgeCount}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id="advanced-filters-panel" className="border-t border-gray-200 px-4 py-4" data-testid="filters-content">
          <div className="space-y-3">
            {filters.length === 0 ? (
              <p className="text-sm text-gray-500" data-testid="no-filters-text">
                {t('search.advancedFilters.empty', 'No filters added yet')}
              </p>
            ) : (
              filters.map((filter, index) => (
                <FilterCondition
                  key={`${filter.field}-${index}`}
                  index={index}
                  condition={filter}
                  fields={fields}
                  onConditionChange={(condition) => handleConditionChange(index, condition)}
                  onRemove={() => handleRemove(index)}
                  disabled={disabled}
                />
              ))
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={handleAddFilter}
              disabled={disabled || fields.length === 0}
              data-testid="add-filter-btn"
            >
              <PlusIcon className="h-5 w-5 mr-1" aria-hidden="true" />
              {t('search.advancedFilters.addFilter', 'Add Filter')}
            </button>

            {filters.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-transparent bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={handleClearAll}
                disabled={disabled}
                data-testid="clear-all-btn"
              >
                <XMarkIcon className="h-5 w-5 mr-1" aria-hidden="true" />
                {t('search.advancedFilters.clearAll', 'Clear All')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
