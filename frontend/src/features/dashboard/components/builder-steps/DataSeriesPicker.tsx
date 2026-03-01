/**
 * DataSeriesPicker Component - Report Builder Step 2
 * Allows users to select which data metrics to include
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface DataSeriesMetric {
  id: string;
  label: string;
  description: string;
  category: string;
}

const METRICS: DataSeriesMetric[] = [
  {
    id: 'grades',
    label: 'Student Grades',
    description: 'Average grades, per-subject grades',
    category: 'Academic',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Attendance rate and patterns',
    category: 'Participation',
  },
  {
    id: 'enrollment',
    label: 'Enrollment',
    description: 'Course enrollment numbers',
    category: 'Administrative',
  },
  {
    id: 'participation',
    label: 'Class Participation',
    description: 'Student participation metrics',
    category: 'Engagement',
  },
  {
    id: 'trends',
    label: 'Performance Trends',
    description: 'Grade and attendance trends over time',
    category: 'Analytics',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    description: 'Certifications and awards',
    category: 'Recognition',
  },
];

interface DataSeriesPickerProps {
  reportConfig: any;
  onUpdate: (updates: any) => void;
}

export const DataSeriesPicker: React.FC<DataSeriesPickerProps> = ({
  reportConfig,
  onUpdate,
}) => {
  const { t } = useTranslation();

  const selectedSeries = reportConfig.dataSeries || [];

  const handleToggle = (metricId: string) => {
    const updated = selectedSeries.includes(metricId)
      ? selectedSeries.filter((id: string) => id !== metricId)
      : [...selectedSeries, metricId];
    onUpdate({ dataSeries: updated });
  };

  const categoryGroups = Array.from(
    METRICS.reduce((map, metric) => {
      const group = map.get(metric.category) || [];
      group.push(metric);
      map.set(metric.category, group);
      return map;
    }, new Map<string, DataSeriesMetric[]>())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('analytics.builder.step.dataseries', 'Select Data Series')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t(
            'analytics.builder.dataseries.description',
            'Choose which metrics to include in your report'
          )}
        </p>
      </div>

      {/* Category Groups */}
      <div className="space-y-6">
        {categoryGroups.map(([category, metrics]) => (
          <div key={category} className="space-y-3">
            <h4 className="font-semibold text-gray-900">{category}</h4>
            <div className="space-y-2 pl-4">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    id={metric.id}
                    checked={selectedSeries.includes(metric.id)}
                    onChange={() => handleToggle(metric.id)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <label htmlFor={metric.id} className="flex-1 cursor-pointer">
                    <p className="font-medium text-gray-900">{metric.label}</p>
                    <p className="text-sm text-gray-600">{metric.description}</p>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selection Counter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {t('analytics.builder.dataseries.selected', 'Selected series')}:{' '}
          <span className="font-semibold">{selectedSeries.length} / {METRICS.length}</span>
        </p>
      </div>

      {/* Quick Select/Deselect */}
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate({ dataSeries: METRICS.map((m) => m.id) })}
          className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
        >
          {t('common.selectall', 'Select All')}
        </button>
        <button
          onClick={() => onUpdate({ dataSeries: [] })}
          className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
        >
          {t('common.clearall', 'Clear All')}
        </button>
      </div>
    </div>
  );
};

export default DataSeriesPicker;
