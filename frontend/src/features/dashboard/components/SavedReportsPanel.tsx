/**
 * SavedReportsPanel Component
 * Display and manage saved custom reports
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Download, Play, Plus } from 'lucide-react';
import { useCustomReports, useDeleteReport, useGenerateReport } from '@/hooks/useCustomReports';

interface SavedReportsPanelProps {
  onEdit?: (reportId: number) => void;
  onGenerate?: (reportId: number) => void;
  onCreateNew?: () => void;
}

export const SavedReportsPanel: React.FC<SavedReportsPanelProps> = ({
  onEdit,
  onGenerate,
  onCreateNew,
}) => {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useCustomReports();
  const deleteReport = useDeleteReport();
  const generateReport = useGenerateReport();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const handleDelete = async (reportId: number) => {
    if (window.confirm(t('analytics.savedReports.confirmDelete', 'Are you sure?'))) {
      await deleteReport.mutateAsync(reportId);
    }
  };

  const handleGenerate = async (reportId: number) => {
    setSelectedReportId(reportId);
    await generateReport.mutateAsync({ reportId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.savedReports.title', 'Saved Reports')}
        </h3>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('analytics.savedReports.create', 'Create New')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  {t('common.name', 'Name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  {t('analytics.builder.step.template', 'Template')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  {t('common.created', 'Created')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {report.report_type === 'custom' ? 'Custom' : 'Template'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(report.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-gray-900"
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerate(report.id)}
                        disabled={selectedReportId === report.id && generateReport.isPending}
                        className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title={t('analytics.savedReports.generate', 'Generate')}
                      >
                        {selectedReportId === report.id && generateReport.isPending ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-gray-600 hover:text-red-600"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            {t('analytics.savedReports.empty', 'No saved reports yet')}
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('analytics.savedReports.create', 'Create First Report')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedReportsPanel;
