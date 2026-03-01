/**
 * ChartTypeSelector Component - Report Builder Step 3
 * Allows users to select visualization type
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react';

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  recommended: boolean;
}

const CHART_TYPES: ChartType[] = [
  {
    id: 'line',
    name: 'Line Chart',
    description: 'Best for showing trends over time',
    icon: <TrendingUp className="w-12 h-12" />,
    color: 'blue',
    recommended: true,
  },
  {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Best for comparing values across categories',
    icon: <BarChart3 className="w-12 h-12" />,
    color: 'green',
    recommended: false,
  },
  {
    id: 'area',
    name: 'Area Chart',
    description: 'Best for showing cumulative trends',
    icon: <BarChart3 className="w-12 h-12" />,
    color: 'purple',
    recommended: false,
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Best for showing percentages and proportions',
    icon: <PieIcon className="w-12 h-12" />,
    color: 'orange',
    recommended: false,
  },
];

interface ChartTypeSelectorProps {
  reportConfig: any;
  onUpdate: (updates: any) => void;
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  reportConfig,
  onUpdate,
}) => {
  const { t } = useTranslation();

  const selectedType = reportConfig.chartType || 'line';

  const getColorClasses = (color: string, isSelected: boolean) => {
    const baseColors = {
      blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      green: 'bg-green-50 border-green-200 hover:border-green-400',
      purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
      orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    };

    const selectedColors = {
      blue: 'border-blue-600 bg-blue-100',
      green: 'border-green-600 bg-green-100',
      purple: 'border-purple-600 bg-purple-100',
      orange: 'border-orange-600 bg-orange-100',
    };

    const baseClass = baseColors[color as keyof typeof baseColors] || baseColors.blue;
    const selectedClass =
      selectedColors[color as keyof typeof selectedColors] || selectedColors.blue;

    return `border-2 transition-all ${isSelected ? selectedClass : baseClass}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('analytics.builder.step.charttype', 'Select Chart Type')}
        </h3>
        <p className="text-gray-600 mb-6">
          {t(
            'analytics.builder.charttype.description',
            'Choose the visualization that best represents your data'
          )}
        </p>
      </div>

      {/* Chart Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHART_TYPES.map((chart) => {
          const isSelected = selectedType === chart.id;
          return (
            <button
              key={chart.id}
              onClick={() => onUpdate({ chartType: chart.id })}
              className={`p-6 rounded-lg flex flex-col items-center gap-4 ${getColorClasses(
                chart.color,
                isSelected
              )}`}
            >
              <div className={`text-${chart.color}-600`}>{chart.icon}</div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">{chart.name}</p>
                <p className="text-sm text-gray-600 mt-1">{chart.description}</p>
              </div>
              {chart.recommended && (
                <span className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  {t('common.recommended', 'Recommended')}
                </span>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart Preview Info */}
      {selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            {t('analytics.builder.charttype.info', 'You can change this type later in the preview')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChartTypeSelector;
