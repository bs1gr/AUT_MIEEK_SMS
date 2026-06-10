import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/LanguageContext';
import { Dashboard } from '../hooks/useDashboards';
import { X } from 'lucide-react';

interface CreateEditDashboardDialogProps {
  dashboard?: Dashboard | null;
  onSave: (data: {
    name: string;
    description?: string;
    configuration: { charts: string[] };
  }) => void;
  onClose: () => void;
  isLoading?: boolean;
  externalError?: string;
}

const AVAILABLE_CHARTS = [
  { id: 'performance', labelKey: 'dashboard.chartPerformance' },
  { id: 'gradeDistribution', labelKey: 'dashboard.chartGradeDistribution' },
  { id: 'attendance', labelKey: 'dashboard.chartAttendance' },
  { id: 'trend', labelKey: 'dashboard.chartTrend' },
  { id: 'pieChart', labelKey: 'dashboard.chartStudentStatus' },
  { id: 'scatter', labelKey: 'dashboard.chartScatterPlot' },
  { id: 'heatmap', labelKey: 'dashboard.chartHeatmap' },
  { id: 'sankey', labelKey: 'dashboard.chartSankey' },
  { id: 'treemap', labelKey: 'dashboard.chartTreemap' },
  { id: 'boxplot', labelKey: 'dashboard.chartBoxPlot' },
];

/**
 * Dialog for creating or editing dashboards
 */
const CreateEditDashboardDialog: React.FC<CreateEditDashboardDialogProps> = ({
  dashboard,
  onSave,
  onClose,
  isLoading = false,
  externalError,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name);
      setDescription(dashboard.description || '');
      setSelectedCharts(dashboard.configuration?.charts || []);
    }
  }, [dashboard]);

  const handleToggleChart = (chartId: string) => {
    setSelectedCharts((prev) =>
      prev.includes(chartId) ? prev.filter((c) => c !== chartId) : [...prev, chartId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('validation.nameRequired') || 'Dashboard name is required');
      return;
    }

    if (selectedCharts.length === 0) {
      setError(t('validation.selectCharts') || 'Please select at least one chart');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      configuration: { charts: selectedCharts },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div role="dialog" aria-labelledby="create-edit-dashboard-title" className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <h2 id="create-edit-dashboard-title" className="text-xl font-semibold text-slate-900">
              {dashboard
                ? t('dashboard.editDashboard') || 'Edit Dashboard'
                : t('dashboard.newDashboard') || 'Create Dashboard'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 transition hover:text-slate-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t('dashboard.dashboardName') || 'Dashboard Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder={t('dashboard.namePlaceholder') || 'e.g., Math Performance'}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                maxLength={255}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t('dashboard.description')} ({t('common.optional')})
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('dashboard.descriptionPlaceholder') || 'Add notes about this dashboard...'}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Chart Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t('dashboard.selectCharts') || 'Select Charts to Include'}
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {AVAILABLE_CHARTS.map((chart) => (
                  <label
                    key={chart.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 cursor-pointer transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      value={chart.id}
                      checked={selectedCharts.includes(chart.id)}
                      onChange={() => handleToggleChart(chart.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 transition focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{t(chart.labelKey)}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t('dashboard.chartsSelected', { count: selectedCharts.length }) || `${selectedCharts.length} chart(s) selected`}
              </p>
            </div>

            {/* Error Message */}
            {(error || externalError) && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error || externalError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {t('common.save') || 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateEditDashboardDialog;
