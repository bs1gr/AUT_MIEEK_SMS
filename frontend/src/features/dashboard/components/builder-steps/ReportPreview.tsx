/**
 * ReportPreview Component - Report Builder Step 5
 * Final step: Review configuration, name report, and save
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';

interface ReportPreviewProps {
  reportConfig: any;
  onUpdate: (updates: any) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportConfig,
  onUpdate,
  onSave,
  isSaving = false,
}) => {
  const { t } = useTranslation();

  const isValid = reportConfig.name && reportConfig.template && reportConfig.dataSeries?.length > 0;

  const getTemplateLabel = (template: string) => {
    const templates: Record<string, string> = {
      class_summary: t('analytics.builder.template.class_summary', 'Class Summary'),
      grade_analysis: t('analytics.builder.template.grade_analysis', 'Grade Analysis'),
      performance_trend: t('analytics.builder.template.performance_trend', 'Performance Trends'),
      attendance_report: t('analytics.builder.template.attendance_report', 'Attendance Report'),
      custom: t('common.custom', 'Custom'),
    };
    return templates[template] || template;
  };

  const getChartTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      line: 'Line Chart',
      bar: 'Bar Chart',
      area: 'Area Chart',
      pie: 'Pie Chart',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('analytics.builder.step.preview', 'Review & Save')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t(
            'analytics.builder.preview.description',
            'Review your report configuration and give it a name'
          )}
        </p>
      </div>

      {/* Report Name */}
      <div className="space-y-2">
        <label className="block font-medium text-gray-900">
          {t('common.reportname', 'Report Name')} *
        </label>
        <input
          type="text"
          value={reportConfig.name || ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={t('analytics.builder.name.placeholder', 'e.g., Q1 Performance Analysis')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Configuration Summary */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">
          {t('analytics.builder.preview.configuration', 'Configuration Summary')}
        </h4>

        {/* Template */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {t('analytics.builder.preview.template', 'Template')}
              </p>
              <p className="font-medium text-gray-900">{getTemplateLabel(reportConfig.template)}</p>
            </div>
          </div>
        </div>

        {/* Chart Type */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {t('analytics.builder.preview.charttype', 'Chart Type')}
              </p>
              <p className="font-medium text-gray-900">
                {getChartTypeLabel(reportConfig.chartType)}
              </p>
            </div>
          </div>
        </div>

        {/* Data Series */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {t('analytics.builder.preview.dataseries', 'Data Series')}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {reportConfig.dataSeries?.map((series: string) => (
                  <span key={series} className="px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs">
                    {series}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {reportConfig.filters?.active?.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {t('analytics.builder.preview.filters', 'Filters')}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {reportConfig.filters.active.map((filter: string) => (
                    <span key={filter} className="px-2 py-1 bg-green-100 text-green-900 rounded text-xs">
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {!isValid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">
              {t('analytics.builder.preview.incomplete', 'Incomplete Configuration')}
            </p>
            <ul className="text-sm text-yellow-800 mt-1 space-y-1">
              {!reportConfig.name && <li>• {t('common.reportname', 'Report name')} is required</li>}
              {!reportConfig.template && <li>• {t('analytics.builder.step.template', 'Template')} is required</li>}
              {!reportConfig.dataSeries?.length && <li>• {t('analytics.builder.preview.atleastone', 'At least one data series')} is required</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={!isValid || isSaving}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
          isValid && !isSaving
            ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isSaving ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            {t('common.saving', 'Saving...')}
          </div>
        ) : (
          `${t('common.save', 'Save')} ${reportConfig.name || t('common.report', 'Report')}`
        )}
      </button>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Copy className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          {t(
            'analytics.builder.preview.info',
            'After saving, you can generate the report with specific filter values and download it as PDF or Excel.'
          )}
        </p>
      </div>
    </div>
  );
};

export default ReportPreview;
