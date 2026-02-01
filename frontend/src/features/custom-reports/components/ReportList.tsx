/**
 * ReportList Component - Display and manage custom reports
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Copy, Share2, Download, Play, MoreVertical, ChevronDown } from 'lucide-react';
import { useCustomReports, useDeleteReport, useGenerateReport, useGeneratedReports, useDownloadReport } from '@/hooks/useCustomReports';
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
  const downloadMutation = useDownloadReport();
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [expandedMenu, setExpandedMenu] = useState<number | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());

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
              <React.Fragment key={report.id}>
                <tr className="hover:bg-gray-50 transition-colors">
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
                      {t(`customReports:entity_${report.report_type}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                      {report.export_format.toUpperCase()}
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
                        onClick={() => {
                          setExpandedReports(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(report.id)) {
                              newSet.delete(report.id);
                            } else {
                              newSet.add(report.id);
                            }
                            return newSet;
                          });
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View generated reports"
                      >
                        <ChevronDown size={16} className={`transition-transform ${expandedReports.has(report.id) ? 'rotate-180' : ''}`} />
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
              {/* Generated Reports Row */}
              {expandedReports.has(report.id) && (
                <GeneratedReportsRow reportId={report.id} downloadMutation={downloadMutation} />
              )}
            </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Generated Reports Row Component
interface GeneratedReportsRowProps {
  reportId: number;
  downloadMutation: any;
}

const GeneratedReportsRow: React.FC<GeneratedReportsRowProps> = ({ reportId, downloadMutation }) => {
  const { data: generatedReports, isLoading } = useGeneratedReports(reportId);
  const { t } = useTranslation();

  return (
    <tr className="bg-blue-50">
      <td colSpan={6} className="px-6 py-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Generated Reports:</h4>
          {isLoading && <p className="text-xs text-gray-500">Loading...</p>}
          {!isLoading && (!generatedReports || generatedReports.length === 0) && (
            <p className="text-xs text-gray-500">No generated reports yet</p>
          )}
          {!isLoading && generatedReports && generatedReports.length > 0 && (
            <div className="space-y-2">
              {generatedReports.map((generated: any) => {
                // Safe date parsing
                const createdDate = generated.created_at ? new Date(generated.created_at) : null;
                const isValidDate = createdDate && !isNaN(createdDate.getTime());
                
                return (
                  <div key={generated.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs">
                      <p className="font-medium text-gray-900">
                        {isValidDate 
                          ? `Generated ${formatDistanceToNow(createdDate, { addSuffix: true })}`
                          : 'Generated (date unknown)'}
                      </p>
                      <p className="text-gray-600">
                        Status: <span className="font-semibold">{generated.status?.toUpperCase() || 'UNKNOWN'}</span>
                      </p>
                      {generated.file_path && (
                        <p className="text-gray-500">{generated.file_path.split('/').pop()}</p>
                      )}
                    </div>
                    {generated.status === 'completed' && generated.file_path && (
                      <button
                        onClick={() => downloadMutation.mutate({ reportId, generatedId: generated.id })}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Download size={12} />
                        Download
                      </button>
                    )}
                    {generated.status === 'processing' && (
                      <span className="text-xs text-orange-600 font-medium">Processing...</span>
                    )}
                    {generated.status === 'failed' && (
                      <span className="text-xs text-red-600 font-medium">Failed</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ReportList;
