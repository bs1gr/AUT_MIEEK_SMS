/**
 * ChartTypeSelector Component - Report Builder Step 3
 * Allows users to select visualization type
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity, LayoutGrid, Layers, Crosshair } from 'lucide-react';
import { ReportConfig } from '../CustomReportBuilder';

interface ChartType {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
  recommended: boolean;
}

const CHART_TYPES: ChartType[] = [
  {
    id: 'line',
    nameKey: 'analytics.charttype.line',
    descKey: 'analytics.charttype.line_desc',
    icon: <TrendingUp className="w-12 h-12" />,
    color: 'blue',
    recommended: true,
  },
  {
    id: 'bar',
    nameKey: 'analytics.charttype.bar',
    descKey: 'analytics.charttype.bar_desc',
    icon: <BarChart3 className="w-12 h-12" />,
    color: 'green',
    recommended: false,
  },
  {
    id: 'area',
    nameKey: 'analytics.charttype.area',
    descKey: 'analytics.charttype.area_desc',
    icon: <Activity className="w-12 h-12" />,
    color: 'purple',
    recommended: false,
  },
  {
    id: 'pie',
    nameKey: 'analytics.charttype.pie',
    descKey: 'analytics.charttype.pie_desc',
    icon: <PieIcon className="w-12 h-12" />,
    color: 'orange',
    recommended: false,
  },
  {
    id: 'scatter',
    nameKey: 'analytics.charttype.scatter',
    descKey: 'analytics.charttype.scatter_desc',
    icon: <Crosshair className="w-12 h-12" />,
    color: 'red',
    recommended: false,
  },
  {
    id: 'heatmap',
    nameKey: 'analytics.charttype.heatmap',
    descKey: 'analytics.charttype.heatmap_desc',
    icon: <LayoutGrid className="w-12 h-12" />,
    color: 'yellow',
    recommended: false,
  },
  {
    id: 'treemap',
    nameKey: 'analytics.charttype.treemap',
    descKey: 'analytics.charttype.treemap_desc',
    icon: <Layers className="w-12 h-12" />,
    color: 'teal',
    recommended: false,
  },
  {
    id: 'boxplot',
    nameKey: 'analytics.charttype.boxplot',
    descKey: 'analytics.charttype.boxplot_desc',
    icon: <BarChart3 className="w-12 h-12 rotate-90" />,
    color: 'indigo',
    recommended: false,
  },
];

const COLOR_BASE: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  green: 'bg-green-50 border-green-200 hover:border-green-400',
  purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  red: 'bg-red-50 border-red-200 hover:border-red-400',
  yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
  teal: 'bg-teal-50 border-teal-200 hover:border-teal-400',
  indigo: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
};

const COLOR_SELECTED: Record<string, string> = {
  blue: 'border-blue-600 bg-blue-100',
  green: 'border-green-600 bg-green-100',
  purple: 'border-purple-600 bg-purple-100',
  orange: 'border-orange-600 bg-orange-100',
  red: 'border-red-600 bg-red-100',
  yellow: 'border-yellow-600 bg-yellow-100',
  teal: 'border-teal-600 bg-teal-100',
  indigo: 'border-indigo-600 bg-indigo-100',
};

const COLOR_ICON: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  teal: 'text-teal-600',
  indigo: 'text-indigo-600',
};

interface ChartTypeSelectorProps {
  reportConfig: ReportConfig;
  onUpdate: (updates: Partial<ReportConfig>) => void;
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  reportConfig,
  onUpdate,
}) => {
  const { t } = useTranslation('analytics');

  const selectedType = reportConfig.chartType || 'line';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('builder.step.charttype', 'Select Chart Type')}
        </h3>
        <p className="text-gray-600 mb-6">
          {t('builder.charttype.description', 'Choose the visualization that best represents your data')}
        </p>
      </div>

      {/* Chart Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHART_TYPES.map((chart) => {
          const isSelected = selectedType === chart.id;
          const baseClass = COLOR_BASE[chart.color] ?? COLOR_BASE.blue;
          const selectedClass = COLOR_SELECTED[chart.color] ?? COLOR_SELECTED.blue;
          const iconClass = COLOR_ICON[chart.color] ?? COLOR_ICON.blue;
          return (
            <button
              key={chart.id}
              onClick={() => onUpdate({ chartType: chart.id })}
              className={`relative p-6 rounded-lg flex flex-col items-center gap-4 border-2 transition-all ${isSelected ? selectedClass : baseClass}`}
            >
              <div className={iconClass}>{chart.icon}</div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {t(chart.nameKey, chart.id)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t(chart.descKey, '')}
                </p>
              </div>
              {chart.recommended && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  {t('builder.ui.recommended', 'Recommended')}
                </span>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {t('builder.ui.checkmark', '✓')}
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
            {t('builder.charttype.info', 'You can change this type later in the preview')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChartTypeSelector;
