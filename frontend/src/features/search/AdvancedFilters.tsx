import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Filter } from 'lucide-react';
import { useSearch, type FilterCriteria } from './useSearch';

interface AdvancedFiltersProps {
  onApply?: (filters: FilterCriteria[]) => void;
  onReset?: () => void;
  className?: string;
  searchType?: 'students' | 'courses' | 'grades';
}

/**
 * Advanced Filters component for complex search filtering
 * Allows building multi-criteria filter chains with:
 * - Field selection (dynamic based on search type)
 * - Operator selection (equals, contains, starts_with, etc.)
 * - Value input
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = React.memo(({
  onApply,
  onReset,
  className = '',
  searchType = 'students',
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { filters, addFilter, removeFilter, updateFilter, clearSearch } = useSearch();

  // Define available fields for each search type
  const availableFields = useMemo(() => {
    switch (searchType) {
      case 'students':
        return [
          { value: 'first_name', label: t('students.firstName') },
          { value: 'last_name', label: t('students.lastName') },
          { value: 'email', label: t('students.email') },
          { value: 'enrollment_number', label: t('students.enrollmentNumber') },
          { value: 'is_active', label: t('students.status') },
        ];
      case 'courses':
        return [
          { value: 'course_name', label: t('courses.courseName') },
          { value: 'course_code', label: t('courses.courseCode') },
          { value: 'credits', label: t('courses.credits') },
        ];
      case 'grades':
        return [
          { value: 'student_id', label: t('students.student') },
          { value: 'course_id', label: t('courses.course') },
          { value: 'grade_value', label: t('grades.grade') },
          { value: 'exam_date', label: t('grades.examDate') },
        ];
      default:
        return [];
    }
  }, [searchType, t]);

  // Define operators
  const operators = useMemo(() => [
    { value: 'equals', label: t('search.equals') },
    { value: 'contains', label: t('search.contains') },
    { value: 'starts_with', label: t('search.startsWith') },
    { value: 'greater_than', label: t('search.greaterThan') },
    { value: 'less_than', label: t('search.lessThan') },
    { value: 'between', label: t('search.between') },
  ], [t]);

  const handleAddFilter = () => {
    const defaultField = availableFields[0]?.value || '';
    addFilter({
      field: defaultField,
      operator: 'equals',
      value: '',
    });
  };

  const handleRemoveFilter = (index: number) => {
    removeFilter(index);
  };

  const handleFieldChange = (index: number, field: string) => {
    updateFilter(index, { field });
  };

  const handleOperatorChange = (index: number, operator: string) => {
    updateFilter(index, { operator: operator as FilterCriteria['operator'] });
  };

  const handleValueChange = (index: number, value: unknown) => {
    updateFilter(index, { value });
  };

  const handleApply = () => {
    onApply?.(filters);
    setIsExpanded(false);
  };

  const handleReset = () => {
    clearSearch();
    onReset?.();
    setIsExpanded(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Filter Button / Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <Filter size={18} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{t('search.advancedFilters')}</span>
        {filters.length > 0 && (
          <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
            {filters.length}
          </span>
        )}
      </button>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="mt-3 p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
          {/* Filters List */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {filters.length === 0 ? (
              <p className="text-sm text-gray-500 italic">{t('search.noFiltersApplied')}</p>
            ) : (
              filters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Field Select */}
                  <select
                    value={filter.field}
                    onChange={(e) => handleFieldChange(index, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label={t('search.filterField')}
                  >
                    {availableFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator Select */}
                  <select
                    value={filter.operator}
                    onChange={(e) => handleOperatorChange(index, e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label={t('search.filterOperator')}
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  {filter.operator === 'between' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        placeholder="Min"
                        defaultValue={Array.isArray(filter.value) ? filter.value[0] : ''}
                        onChange={(e) => {
                          const max = Array.isArray(filter.value) ? filter.value[1] : '';
                          handleValueChange(index, [e.target.value, max]);
                        }}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label={t('search.filterValue')}
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="text"
                        placeholder="Max"
                        defaultValue={Array.isArray(filter.value) ? filter.value[1] : ''}
                        onChange={(e) => {
                          const min = Array.isArray(filter.value) ? filter.value[0] : '';
                          handleValueChange(index, [min, e.target.value]);
                        }}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label={t('search.filterValue')}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={t('search.filterValue')}
                      value={filter.value as string}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label={t('search.filterValue')}
                    />
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFilter(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label={t('search.removeFilter')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Filter Button */}
          <button
            onClick={handleAddFilter}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">{t('search.addFilter')}</span>
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('search.resetFilters')}
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('search.applyFilters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Only re-render if searchType or className changes
  // We assume onApply/onReset are stable or we want to ignore them to prevent render loops
  return prev.searchType === next.searchType && prev.className === next.className;
});

export default AdvancedFilters;
