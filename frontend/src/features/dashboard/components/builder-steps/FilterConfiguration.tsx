/**
 * FilterConfiguration Component - Report Builder Step 4
 * Allows users to configure filters for the report
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Filter } from 'lucide-react';

interface FilterConfigurationProps {
  reportConfig: any;
  onUpdate: (updates: any) => void;
}

export const FilterConfiguration: React.FC<FilterConfigurationProps> = ({
  reportConfig,
  onUpdate,
}) => {
  const { t } = useTranslation();

  const filters = reportConfig.filters || {};

  const handleDateChange = (field: string, value: string) => {
    onUpdate({
      filters: {
        ...filters,
        [field]: value,
      },
    });
  };

  const handleFilterAdd = (type: string) => {
    const activeFilters = filters.active || [];
    if (!activeFilters.includes(type)) {
      onUpdate({
        filters: {
          ...filters,
          active: [...activeFilters, type],
        },
      });
    }
  };

  const handleFilterRemove = (type: string) => {
    const activeFilters = (filters.active || []).filter((f: string) => f !== type);
    onUpdate({
      filters: {
        ...filters,
        active: activeFilters,
      },
    });
  };

  const activeFilters = filters.active || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('analytics.builder.step.filters', 'Configure Filters')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t(
            'analytics.builder.filters.description',
            'Choose which filters to apply to refine your data'
          )}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold">{t('analytics.builder.filters.daterange', 'Date Range')}</h4>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.start', 'Start Date')}
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.end', 'End Date')}
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Available Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold">{t('analytics.builder.filters.additional', 'Additional Filters')}</h4>
        </div>

        <div className="space-y-2">
          {['course', 'class', 'division'].map((filterType) => (
            <div
              key={filterType}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {t(`common.${filterType}`, filterType)}
                </p>
                <p className="text-sm text-gray-600">
                  {t(
                    'analytics.builder.filters.includeinreport',
                    'Include in report filtering'
                  )}
                </p>
              </div>
              <button
                onClick={() =>
                  activeFilters.includes(filterType)
                    ? handleFilterRemove(filterType)
                    : handleFilterAdd(filterType)
                }
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  activeFilters.includes(filterType)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {activeFilters.includes(filterType) ? '✓ Active' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilters.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">
            {t('analytics.builder.filters.active', 'Active Filters')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter: string) => (
              <span
                key={filter}
                className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-medium flex items-center gap-2"
              >
                {t(`common.${filter}`, filter)} ✓
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {t(
            'analytics.builder.filters.info',
            'Filters narrow the data included in your report. You can modify filter values when generating the report.'
          )}
        </p>
      </div>
    </div>
  );
};

export default FilterConfiguration;
