/**
 * ReportTemplate Component - Report Builder Step 1
 * Allows users to select a template or start custom
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'class_summary',
    name: 'Class Summary',
    description: 'Overview of all students in a class',
    icon: Users,
    color: 'blue',
  },
  {
    id: 'grade_analysis',
    name: 'Grade Analysis',
    description: 'Detailed grade distribution and trends',
    icon: BarChart3,
    color: 'green',
  },
  {
    id: 'performance_trend',
    name: 'Performance Trends',
    description: 'Student performance over time',
    icon: TrendingUp,
    color: 'purple',
  },
  {
    id: 'attendance_report',
    name: 'Attendance Report',
    description: 'Attendance patterns and statistics',
    icon: Activity,
    color: 'orange',
  },
];

interface ReportTemplateProps {
  reportConfig: any;
  onUpdate: (updates: any) => void;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ reportConfig, onUpdate }) => {
  const { t } = useTranslation();

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getSelectedClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-600 bg-blue-100',
      green: 'border-green-600 bg-green-100',
      purple: 'border-purple-600 bg-purple-100',
      orange: 'border-orange-600 bg-orange-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {t('analytics.builder.step.template', 'Select a Report Template')}
        </h3>
        <p className="text-gray-600 mb-6">
          {t(
            'analytics.builder.template.description',
            'Choose a template to get started quickly or customize from scratch'
          )}
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = reportConfig.template === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onUpdate({ template: template.id })}
              className={`p-4 rounded-lg border-2 transition-all text-left flex items-start gap-3 ${
                isSelected ? getSelectedClasses(template.color) : getColorClasses(template.color)
              }`}
            >
              <Icon className="w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold">{template.name}</p>
                <p className="text-sm opacity-75">{template.description}</p>
              </div>
              {isSelected && (
                <div className="ml-auto text-xl">✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Option */}
      <button
        onClick={() => onUpdate({ template: 'custom' })}
        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
          reportConfig.template === 'custom'
            ? 'border-gray-800 bg-gray-100'
            : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <p className="font-semibold text-gray-900">+ {t('common.custom', 'Custom')}</p>
        <p className="text-sm text-gray-600">
          {t('analytics.builder.template.custom', 'Start from scratch with full customization')}
        </p>
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {t(
            'analytics.builder.template.info',
            'Templates provide predefined configurations. You can modify any aspect in the following steps.'
          )}
        </p>
      </div>
    </div>
  );
};

export default ReportTemplate;
