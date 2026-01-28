import React, { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@heroicons/react/24/outline';
import { FilterCondition as FilterConditionType, FilterFieldDef, FilterOperator } from '../types/search';

export interface FilterConditionProps {
  index?: number;
  condition: FilterConditionType;
  fields: FilterFieldDef[];
  onConditionChange: (condition: FilterConditionType) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const DEFAULT_OPERATORS: FilterOperator[] = ['equals', 'contains', 'startsWith', 'greaterThan', 'lessThan', 'between'];

const getDefaultValue = (field: FilterFieldDef | undefined, operator: FilterOperator): string | number | [number, number] => {
  if (operator === 'between') {
    return [0, 0];
  }

  if (field?.type === 'number' || field?.type === 'range') {
    return 0;
  }

  if (field?.type === 'date') {
    return '';
  }

  if (field?.type === 'select') {
    const firstOption = field.options?.[0];
    return (firstOption?.value ?? '') as string | number;
  }

  return '';
};

const ensureArrayValue = (value: FilterConditionType['value']): [number, number] => {
  if (Array.isArray(value) && value.length === 2) {
    return value as [number, number];
  }
  return [0, 0];
};

const FilterCondition: FC<FilterConditionProps> = ({
  index,
  condition,
  fields,
  onConditionChange,
  onRemove,
  disabled = false,
}) => {
  const { t } = useTranslation('search');

  const selectedField = useMemo(() => {
    const field = fields.find((f) => f.name === condition.field);
    return field ?? fields[0];
  }, [fields, condition.field]);

  if (!selectedField) {
    return null;
  }

  const availableOperators = selectedField?.operators?.length
    ? selectedField.operators
    : DEFAULT_OPERATORS;

  const handleFieldChange = (value: string) => {
    if (disabled) return;
    const newField = fields.find((f) => f.name === value) ?? selectedField;
    const nextOperator = newField?.operators?.[0] ?? availableOperators[0];
    const nextValue = getDefaultValue(newField, nextOperator);
    onConditionChange({
      ...condition,
      field: value,
      operator: nextOperator,
      value: nextValue,
    });
  };

  const handleOperatorChange = (value: FilterOperator) => {
    if (disabled) return;
    const nextValue =
      value === 'between'
        ? getDefaultValue(selectedField, value)
        : value === 'isEmpty' || value === 'isNotEmpty'
          ? ''
          : Array.isArray(condition.value)
            ? getDefaultValue(selectedField, value)
            : condition.value;
    onConditionChange({
      ...condition,
      operator: value,
      value: nextValue,
    });
  };

  const handleSingleValueChange = (value: string | number) => {
    if (disabled) return;
    onConditionChange({
      ...condition,
      value,
    });
  };

  const handleRangeChange = (value: [number, number]) => {
    if (disabled) return;
    onConditionChange({
      ...condition,
      value,
    });
  };

  const renderValueInput = () => {
    if (condition.operator === 'between') {
      const [min, max] = ensureArrayValue(condition.value);
      return (
        <div className="flex gap-2" data-testid={`value-input-between-${index ?? 0}`}>
          <input
            type={selectedField?.type === 'date' ? 'date' : 'number'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={min}
            onChange={(e) => handleRangeChange([Number(e.target.value), max])}
            aria-label={t('search.advancedFilters.min', 'Minimum value')}
            data-testid={`value-input-min-${index ?? 0}`}
            disabled={disabled}
          />
          <input
            type={selectedField?.type === 'date' ? 'date' : 'number'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={max}
            onChange={(e) => handleRangeChange([min, Number(e.target.value)])}
            aria-label={t('search.advancedFilters.max', 'Maximum value')}
            data-testid={`value-input-max-${index ?? 0}`}
            disabled={disabled}
          />
        </div>
      );
    }

    // isEmpty / isNotEmpty operators require no value input
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return null;
    }

    const inputType = selectedField?.type === 'number' || selectedField?.type === 'range'
      ? 'number'
      : selectedField?.type === 'date'
        ? 'date'
        : 'text';

    if (selectedField?.type === 'select' && selectedField.options?.length) {
      return (
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          value={condition.value as string | number}
          onChange={(e) => handleSingleValueChange(e.target.value)}
          aria-label={t('search.advancedFilters.condition.value', 'Value')}
          data-testid={`value-input-${index ?? 0}`}
          disabled={disabled}
        >
          {selectedField.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={inputType}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
        value={condition.value as string | number}
        onChange={(e) =>
          handleSingleValueChange(
            inputType === 'number' ? Number(e.target.value) : e.target.value
          )
        }
        aria-label={t('search.advancedFilters.condition.value', 'Value')}
        placeholder={selectedField?.placeholder || t('search.advancedFilters.condition.value', 'Value')}
        data-testid={`value-input-${index ?? 0}`}
        disabled={disabled}
      />
    );
  };

  return (
    <div
      className="rounded-md border border-gray-200 p-4 bg-white"
      data-testid={`filter-condition-${index ?? 0}`}
    >
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor={`field-${index ?? 0}`}>
            {t('search.advancedFilters.condition.field', 'Field')}
          </label>
          <select
            id={`field-${index ?? 0}`}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={selectedField?.name}
            onChange={(e) => handleFieldChange(e.target.value)}
            aria-label={t('search.advancedFilters.condition.selectField', 'Select field')}
            data-testid={`field-select-${index ?? 0}`}
            disabled={disabled}
          >
            {fields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700" htmlFor={`operator-${index ?? 0}`}>
            {t('search.advancedFilters.condition.operator', 'Operator')}
          </label>
          <select
            id={`operator-${index ?? 0}`}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
            aria-label={t('search.advancedFilters.condition.selectOperator', 'Select operator')}
            data-testid={`operator-select-${index ?? 0}`}
            disabled={disabled}
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {t(`search.advancedFilters.operators.${op}`, op)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor={`value-${index ?? 0}`}>
            {t('search.advancedFilters.condition.value', 'Value')}
          </label>
          {renderValueInput()}
        </div>

        <div className="col-span-1 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={onRemove}
            aria-label={t('search.advancedFilters.removeFilter', 'Remove this filter')}
            data-testid={`remove-condition-${index ?? 0}`}
            disabled={disabled}
          >
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterCondition;
