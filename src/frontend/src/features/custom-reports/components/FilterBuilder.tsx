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

export interface FilterCourseOption {
  id: number;
  label: string;
}

interface FilterBuilderProps {
  fields: string[];
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  getFieldLabel?: (field: string) => string;
  /** The courses to choose from for a course filter (plan todo 75 stage 5: the number was typed). */
  courses?: FilterCourseOption[];
  /** Category names to suggest for a category filter (any other can still be typed). */
  categories?: string[];
}

// The value as the operator takes it: "between" and "in" are typed as a list (plan todo 75 stage 5).
const valueHintKey = (operator: string) =>
  operator === 'between' ? 'filterValueBetween' : operator === 'in' ? 'filterValueIn' : 'filterValue';

const CATEGORY_LIST_ID = 'report-filter-categories';

interface FilterValueInputProps {
  filter: Filter;
  onValue: (value: string) => void;
  courses?: FilterCourseOption[];
  className: string;
  testId: string;
}

const FilterValueInput: React.FC<FilterValueInputProps> = ({ filter, onValue, courses, className, testId }) => {
  const { t } = useTranslation();
  const single = filter.operator !== 'in' && filter.operator !== 'between';
  if (filter.field === 'course_id' && single && courses && courses.length > 0) {
    return (
      <select
        value={String(filter.value ?? '')}
        onChange={(e) => onValue(e.target.value)}
        className={className}
        data-testid={testId}
        aria-label={t('filterValue', { ns: 'customReports' })}
      >
        <option value="">{t('filterPickCourse', { ns: 'customReports' })}</option>
        {courses.map((course) => (
          <option key={course.id} value={String(course.id)}>
            {course.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
      onChange={(e) => onValue(e.target.value)}
      className={className}
      data-testid={testId}
      list={filter.field === 'category' ? CATEGORY_LIST_ID : undefined}
      aria-label={t('filterValue', { ns: 'customReports' })}
      placeholder={t(valueHintKey(filter.operator), { ns: 'customReports' })}
    />
  );
};

const OPERATORS = [
  { value: 'equals', label: 'operator_equals' },
  { value: 'not_equals', label: 'operator_not_equals' },
  { value: 'contains', label: 'operator_contains' },
  { value: 'not_contains', label: 'operator_not_contains' },
  { value: 'starts_with', label: 'operator_starts_with' },
  { value: 'ends_with', label: 'operator_ends_with' },
  { value: 'greater_than', label: 'operator_greater_than' },
  { value: 'greater_than_or_equal', label: 'operator_greater_than_or_equal' },
  { value: 'less_than', label: 'operator_less_than' },
  { value: 'less_than_or_equal', label: 'operator_less_than_or_equal' },
  { value: 'between', label: 'operator_between' },
  { value: 'in', label: 'operator_in' },
];

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  filters,
  onChange,
  getFieldLabel,
  courses,
  categories,
}) => {
  const { t } = useTranslation();
  const [newFilter, setNewFilter] = useState<Filter>({
    field: fields[0] || '',
    operator: 'equals',
    value: '',
  });

  const resolveFieldLabel = (field: string) => (getFieldLabel ? getFieldLabel(field) : field);

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
                    {resolveFieldLabel(field)}
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

              <FilterValueInput
                filter={filter}
                onValue={(value) => handleUpdateFilter(index, 'value', value)}
                courses={courses}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                testId={`filter-value-${index}`}
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
                    {resolveFieldLabel(field)}
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
                  {t(label, { ns: 'customReports' })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filterValue', { ns: 'customReports' })}
            </label>
            <FilterValueInput
              filter={newFilter}
              onValue={(value) => setNewFilter({ ...newFilter, value })}
              courses={courses}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              testId="filter-value-new"
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
      {categories && categories.length > 0 && (
        <datalist id={CATEGORY_LIST_ID}>
          {categories.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </div>
  );
};

export default FilterBuilder;
