/**
 * ReportList Component - Display and manage custom reports
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Copy, Share2, Download, Play, MoreVertical, ChevronDown, Upload } from 'lucide-react';
import { useCustomReports, useCreateTemplate, useDeleteReport, useGenerateReport, useGeneratedReports, useDownloadReport, useDeleteGeneratedReport, useImportDefaultTemplates } from '@/hooks/useCustomReports';
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
  const createTemplateMutation = useCreateTemplate();
  const deleteMutation = useDeleteReport();
  const generateMutation = useGenerateReport();
  const downloadMutation = useDownloadReport();
  const importMutation = useImportDefaultTemplates();
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
        <p className="text-red-800 font-medium">{t('errorLoading', { ns: 'customReports' })}</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed p-12 text-center">
        <p className="text-gray-600 mb-6">{t('emptyReports', { ns: 'customReports' })}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={onCreateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('createFirstReport', { ns: 'customReports' })}
          </button>
          <button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center gap-2 justify-center"
          >
            <Upload size={18} />
            {importMutation.isPending ? t('importing', { ns: 'customReports' }) : t('importDefaults', { ns: 'customReports' })}
          </button>
        </div>
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
    if (window.confirm(t('confirmDelete', { ns: 'customReports' }))) {
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

  const handleSaveAsTemplate = (report: any) => {
    const defaultName = report?.name ? `${report.name} Template` : '';
    const name = window.prompt(t('templateNamePrompt', { ns: 'customReports' }), defaultName);
    if (!name) {
      return;
    }

    const templateData = {
      name,
      description: report?.description || null,
      category: 'academic',
      report_type: report?.report_type,
      fields: report?.fields || {},
      filters: report?.filters || null,
      aggregations: report?.aggregations || null,
      sort_by: report?.sort_by || null,
      default_export_format: report?.export_format || 'pdf',
      default_include_charts: report?.include_charts ?? true,
      is_system: false,
    };

    createTemplateMutation.mutate(templateData, {
      onSuccess: () => {
        const toast = document.createElement('div');
        toast.textContent = `✅ ${t('templateSaved', { ns: 'customReports' })}`;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      },
    });
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
              {t('selectedCount', { ns: 'customReports', count: selectedReports.length })}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {selectedReports.length > 0 && (
            <>
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                {t('bulkExport', { ns: 'customReports' })}
              </button>
              <button className="px-4 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                {t('bulkDelete', { ns: 'customReports' })}
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
                {t('reportName', { ns: 'customReports' })}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('entityType', { ns: 'customReports' })}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('outputFormat', { ns: 'customReports' })}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('createdAt', { ns: 'customReports' })}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('actions', { ns: 'customReports' })}
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
                        title={t('generateReport', { ns: 'customReports' })}
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
                        title={t('edit', { ns: 'customReports' })}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateReport(report)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={t('duplicate', { ns: 'customReports' })}
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
                            {t('share', { ns: 'customReports' })}
                          </button>
                            <button
                              onClick={() => handleSaveAsTemplate(report)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-t"
                            >
                              <Copy size={14} />
                              {t('saveAsTemplate', { ns: 'customReports' })}
                            </button>
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-t">
                            <Download size={14} />
                            {t('export', { ns: 'customReports' })}
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 border-t"
                          >
                            <Trash2 size={14} />
                            {t('delete', { ns: 'customReports' })}
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
  const deleteMutation = useDeleteGeneratedReport();
  const { t } = useTranslation();

  return (
    <tr className="bg-blue-50">
      <td colSpan={6} className="px-6 py-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">{t('generatedReportsTitle', { ns: 'customReports' })}</h4>
          {isLoading && <p className="text-xs text-gray-500">{t('loading', { ns: 'customReports' })}</p>}
          {!isLoading && (!generatedReports || generatedReports.length === 0) && (
            <p className="text-xs text-gray-500">{t('noGeneratedReports', { ns: 'customReports' })}</p>
          )}
          {!isLoading && generatedReports && generatedReports.length > 0 && (
            <div className="space-y-2">
              {generatedReports.map((generated: any) => {
                // Safe date parsing - use generated_at field
                const generatedDate = generated.generated_at ? new Date(generated.generated_at) : null;
                const isValidDate = generatedDate && !isNaN(generatedDate.getTime());

                return (
                  <div key={generated.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs flex-1">
                      <p className="font-medium text-gray-900">
                        {isValidDate
                          ? `${t('generatedLabel', { ns: 'customReports' })} ${formatDistanceToNow(generatedDate, { addSuffix: true })}`
                          : t('generatedNow', { ns: 'customReports' })}
                      </p>
                      <p className="text-gray-600">
                        {t('status', { ns: 'customReports' })}: <span className="font-semibold">{generated.status?.toUpperCase() || 'UNKNOWN'}</span>
                      </p>
                      {generated.error_message && (
                        <p className="text-red-600 font-semibold">{t('error', { ns: 'customReports' })}: {generated.error_message}</p>
                      )}
                      {generated.file_path && (
                        <p className="text-gray-500">{generated.file_path.split('/').pop()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {generated.status === 'completed' && generated.file_path && (
                        <button
                          onClick={() => downloadMutation.mutate({ reportId, generatedId: generated.id })}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                          title={t('downloadTooltip', { ns: 'customReports' })}
                        >
                          <Download size={12} />
                          {t('download', { ns: 'customReports' })}
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate({ reportId, generatedId: generated.id })}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                        title={t('deleteGeneratedTooltip', { ns: 'customReports' })}
                      >
                        <Trash2 size={12} />
                      </button>
                      {generated.status === 'processing' && (
                        <span className="text-xs text-orange-600 font-medium">{t('processing', { ns: 'customReports' })}</span>
                      )}
                      {generated.status === 'failed' && (
                        <span className="text-xs text-red-600 font-medium">{t('failed', { ns: 'customReports' })}</span>
                      )}
                    </div>
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
