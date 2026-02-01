/**
 * ReportList Component - Display and manage custom reports
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Copy, Share2, Download, Play, MoreVertical } from 'lucide-react';
import { useCustomReports, useDeleteReport, useGenerateReport } from '@/hooks/useCustomReports';
import { formatDistanceToNow } from 'date-fns';

interface ReportListProps {
  onCreateReport?: () => void;
  onEditReport?: (reportId: number) => void;
  onViewReport?: (reportId: number) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  onCreateReport,
  onEditReport,
  // onViewReport is reserved for future use when viewing generated reports
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onViewReport,
}) => {
  const { t } = useTranslation();
  const { data: reports, isLoading, error } = useCustomReports();
  const deleteMutation = useDeleteReport();
  const generateMutation = useGenerateReport();
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [expandedMenu, setExpandedMenu] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">{t('customReports:errorLoading')}</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed p-12 text-center">
        <p className="text-gray-600 mb-4">{t('customReports:emptyReports')}</p>
        <button
          type="button"
          onClick={onCreateReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('customReports:createFirstReport')}
        </button>
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedReports(checked ? reports.map((r: any) => r.id) : []);
  };

  const handleSelectReport = (reportId: number, checked: boolean) => {
    setSelectedReports((prev) =>
      checked ? [...prev, reportId] : prev.filter((id) => id !== reportId)
    );
  };

  const handleDeleteReport = (reportId: number) => {
    if (window.confirm(t('customReports:confirmDelete'))) {
      deleteMutation.mutate(reportId);
    }
  };

  const handleGenerateReport = (reportId: number) => {
    generateMutation.mutate(reportId);
  };

  const handleDuplicateReport = (report: any) => {
    // This would open the report builder with pre-filled data
    onEditReport?.(report.id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={selectedReports.length === reports.length && reports.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded"
          />
          {selectedReports.length > 0 && (
            <span className="text-sm text-gray-600">
              {t('customReports:selectedCount', { count: selectedReports.length })}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {selectedReports.length > 0 && (
            <>
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                {t('customReports:bulkExport')}
              </button>
              <button className="px-4 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                {t('customReports:bulkDelete')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedReports.length === reports.length && reports.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('customReports:reportName')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('customReports:entityType')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('customReports:outputFormat')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('customReports:createdAt')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('customReports:actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((report: any) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={(e) => handleSelectReport(report.id, e.target.checked)}
                    className="rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-xs text-gray-500">{report.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {t(`customReports:entity_${report.entity_type}`)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    {report.output_format.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-600">
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 relative">
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={t('customReports:generateReport')}
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => onEditReport?.(report.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title={t('customReports:edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicateReport(report)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title={t('customReports:duplicate')}
                    >
                      <Copy size={16} />
                    </button>

                    {/* More Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === report.id ? null : report.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {expandedMenu === report.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-48">
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
                            <Share2 size={14} />
                            {t('customReports:share')}
                          </button>
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-t">
                            <Download size={14} />
                            {t('customReports:export')}
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 border-t"
                          >
                            <Trash2 size={14} />
                            {t('customReports:delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportList;
