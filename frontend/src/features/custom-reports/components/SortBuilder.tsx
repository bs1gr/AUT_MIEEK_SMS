/**
 * SortBuilder Component - Configure sorting rules
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface SortRule {
  field: string;
  order: 'asc' | 'desc';
}

interface SortBuilderProps {
  fields: string[];
  sorting: SortRule[];
  onChange: (sorting: SortRule[]) => void;
}

export const SortBuilder: React.FC<SortBuilderProps> = ({
  fields,
  sorting,
  onChange,
}) => {
  const { t } = useTranslation();
  const [newSort, setNewSort] = useState<SortRule>({
    field: fields[0] || '',
    order: 'asc',
  });

  const handleAddSort = () => {
    if (newSort.field && !sorting.some((s) => s.field === newSort.field)) {
      onChange([...sorting, { ...newSort }]);
      setNewSort({
        field: fields[0] || '',
        order: 'asc',
      });
    }
  };

  const handleRemoveSort = (index: number) => {
    onChange(sorting.filter((_, i) => i !== index));
  };

  const handleUpdateSort = (index: number, key: keyof SortRule, value: any) => {
    const updated = [...sorting];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const updated = [...sorting];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      onChange(updated);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < sorting.length - 1) {
      const updated = [...sorting];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Sort Rules */}
      {sorting.length > 0 && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          {sorting.map((rule, index) => (
            <div key={index} className="flex gap-3 items-center bg-white p-3 rounded border group">
              <GripVertical size={18} className="text-gray-400 cursor-grab" />

              <select
                value={rule.field}
                onChange={(e) => handleUpdateSort(index, 'field', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              >
                {fields
                  .filter((f) => !sorting.some((s, i) => s.field === f && i !== index))
                  .map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
              </select>

              <select
                value={rule.order}
                onChange={(e) => handleUpdateSort(index, 'order', e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option value="asc">{t('ascending', { ns: 'customReports' })}</option>
                <option value="desc">{t('descending', { ns: 'customReports' })}</option>
              </select>

              <div className="flex gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('moveUp', { ns: 'customReports' })}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sorting.length - 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('moveDown', { ns: 'customReports' })}
                >
                  ↓
                </button>
              </div>

              <button
                onClick={() => handleRemoveSort(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Sort Rule */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('sortBy', { ns: 'customReports' })}
            </label>
            <select
              value={newSort.field}
              onChange={(e) => setNewSort({ ...newSort, field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {fields
                .filter((f) => !sorting.some((s) => s.field === f))
                .map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('sortOrder', { ns: 'customReports' })}
            </label>
            <select
              value={newSort.order}
              onChange={(e) => setNewSort({ ...newSort, order: e.target.value as 'asc' | 'desc' })}
              className="px-3 py-2 border border-gray-300 rounded"
            >
                <option value="asc">{t('ascending', { ns: 'customReports' })}</option>
                <option value="desc">{t('descending', { ns: 'customReports' })}</option>
            </select>
          </div>

          <button
            onClick={handleAddSort}
            disabled={!newSort.field || sorting.some((s) => s.field === newSort.field)}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            {t('addSort', { ns: 'customReports' })}
          </button>
        </div>

        <p className="text-xs text-gray-600">{t('helpSorting', { ns: 'customReports' })}</p>
      </div>
    </div>
  );
};

export default SortBuilder;
