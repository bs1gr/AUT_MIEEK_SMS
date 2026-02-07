/**
 * FieldSelector Component - Drag-and-drop field selection
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2 } from 'lucide-react';

interface FieldSelectorProps {
  availableFields: string[];
  selectedFields: string[];
  onChange: (fields: string[]) => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  availableFields,
  selectedFields,
  onChange,
}) => {
  const { t } = useTranslation();
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const unselectedFields = availableFields.filter(
    (field) => !selectedFields.includes(field)
  );

  const handleAddField = (field: string) => {
    if (!selectedFields.includes(field)) {
      onChange([...selectedFields, field]);
    }
  };

  const handleRemoveField = (field: string) => {
    onChange(selectedFields.filter((f) => f !== field));
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newFields = [...selectedFields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      onChange(newFields);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < selectedFields.length - 1) {
      const newFields = [...selectedFields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      onChange(newFields);
    }
  };

  const handleDragStart = (field: string, e: React.DragEvent) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (field: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedField && draggedField !== field) {
      const draggedIndex = selectedFields.indexOf(draggedField);
      const targetIndex = selectedFields.indexOf(field);

      if (draggedIndex > -1 && targetIndex > -1) {
        const newFields = [...selectedFields];
        newFields.splice(draggedIndex, 1);
        newFields.splice(targetIndex, 0, draggedField);
        onChange(newFields);
      }
    }
    setDraggedField(null);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Available Fields */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            {t('availableFields', { ns: 'customReports' })}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unselectedFields.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('noFields', { ns: 'customReports' })}</p>
            ) : (
              unselectedFields.map((field) => (
                <button
                  key={field}
                  onClick={() => handleAddField(field)}
                  className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className="font-medium text-gray-700">{field}</span>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 group-hover:text-blue-600"
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Fields */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            {t('selectedFields', { ns: 'customReports' })} ({selectedFields.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedFields.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('helpDragFields', { ns: 'customReports' })}</p>
            ) : (
              selectedFields.map((field, index) => (
                <div
                  key={`${field}-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(field, e)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(field, e)}
                  className={`px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between group cursor-move transition-colors ${
                    draggedField === field ? 'opacity-50 bg-blue-100' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      // Allow keyboard deletion if needed
                    }
                  }}
                  aria-label={`${t('field', { ns: 'customReports' })}: ${field}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <ChevronRight
                      size={16}
                      className="text-gray-400 group-hover:text-blue-600 rotate-90"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-gray-900">{field}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('moveUp', { ns: 'customReports' })}
                    >
                      <ChevronRight size={16} className="rotate-90" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedFields.length - 1}
                      className="p-1 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('moveDown', { ns: 'customReports' })}
                    >
                      <ChevronRight size={16} className="rotate-[-90deg]" />
                    </button>
                    <button
                      onClick={() => handleRemoveField(field)}
                      className="p-1 hover:bg-red-100 rounded"
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">{t('helpDragFields', { ns: 'customReports' })}</p>
      </div>
    </div>
  );
};

export default FieldSelector;
