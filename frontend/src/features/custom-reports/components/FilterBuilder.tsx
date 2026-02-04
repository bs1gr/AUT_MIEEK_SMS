/**
 * FilterBuilder Component - Add and manage filters
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';

interface Filter {
  field: string;
  operator: string;
  value: string | number | string[];
}

interface FilterBuilderProps {
  fields: string[];
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
}

const OPERATORS = [
  { value: 'equals', label: 'operator_equals' },
  { value: 'not_equals', label: 'operator_not_equals' },
  { value: 'contains', label: 'operator_contains' },
  { value: 'starts_with', label: 'operator_starts_with' },
  { value: 'ends_with', label: 'operator_ends_with' },
  { value: 'greater_than', label: 'operator_greater_than' },
  { value: 'less_than', label: 'operator_less_than' },
  { value: 'between', label: 'operator_between' },
  { value: 'in', label: 'operator_in' },
];

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  filters,
  onChange,
}) => {
  const { t } = useTranslation();
  const [newFilter, setNewFilter] = useState<Filter>({
    field: fields[0] || '',
    operator: 'equals',
    value: '',
  });

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value) {
      onChange([...filters, { ...newFilter }]);
      setNewFilter({
        field: fields[0] || '',
        operator: 'equals',
        value: '',
      });
    }
  };

  const handleRemoveFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = <K extends keyof Filter>(
    index: number,
    key: K,
    value: Filter[K]
  ) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Existing Filters */}
      {filters.length > 0 && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          {filters.map((filter, index) => (
            <div key={index} className="flex gap-3 items-end bg-white p-3 rounded border">
              <select
                value={filter.field}
                onChange={(e) => handleUpdateFilter(index, 'field', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              >
                {fields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(e) => handleUpdateFilter(index, 'operator', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              >
                {OPERATORS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {t(label, { ns: 'customReports' })}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => handleUpdateFilter(index, 'value', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                placeholder={t('filterValue', { ns: 'customReports' })}
              />

              <button
                onClick={() => handleRemoveFilter(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Filter */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filterField', { ns: 'customReports' })}
            </label>
            <select
              value={newFilter.field}
              onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {fields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filterOperator', { ns: 'customReports' })}
            </label>
            <select
              value={newFilter.operator}
              onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {OPERATORS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {t(`customReports:${label}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filterValue', { ns: 'customReports' })}
            </label>
            <input
              type="text"
              value={newFilter.value}
              onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder={t('filterValue', { ns: 'customReports' })}
            />
          </div>

          <button
            onClick={handleAddFilter}
            disabled={!newFilter.field || !newFilter.operator || !newFilter.value}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            {t('addFilter', { ns: 'customReports' })}
          </button>
        </div>

        <p className="text-xs text-gray-600">{t('helpFilters', { ns: 'customReports' })}</p>
      </div>
    </div>
  );
};

export default FilterBuilder;
