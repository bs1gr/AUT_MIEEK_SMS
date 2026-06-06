import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'students' | 'courses' | 'grades';
  onComplete?: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, type = 'students', onComplete }) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'thisMonth' | 'thisYear'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/import-export/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          export_type: type,
          file_format: format,
          filters: {
            include_headers: includeHeaders,
            date_range: dateRange,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      const jobId = result.data?.id;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second intervals

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusResponse = await fetch(`/api/v1/import-export/exports/${jobId}`);
        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        const job = statusData.data;

        if (job && job.status === 'completed' && job.file_path) {
          // Download the file
          const downloadResponse = await fetch(`/api/v1/import-export/exports/${jobId}/download`);
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-export.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            completed = true;
          }
        } else if (job && job.status === 'failed') {
          throw new Error('Export job failed on server');
        }
      }

      if (!completed) {
        throw new Error('Export took too long to complete');
      }

      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" role="dialog" aria-modal="true">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('exportData', { ns: 'export' })}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none" aria-label="Close">✕</button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {error && (<div className="bg-red-50 border border-red-200 rounded-md p-3"><p className="text-red-800 text-sm">{error}</p></div>)}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">{t('format', { ns: 'export' })}</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="csv">CSV</option>
                <option value="excel">Excel (XLSX)</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">{t('dateRange', { ns: 'export' })}</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">{t('allTime', { ns: 'export' })}</option>
                <option value="thisMonth">{t('thisMonth', { ns: 'export' })}</option>
                <option value="thisYear">{t('thisYear', { ns: 'export' })}</option>
              </select>
            </div>

            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={includeHeaders} onChange={(e) => setIncludeHeaders(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">{t('includeHeaders', { ns: 'export' })}</span>
            </label>
          </div>

          <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">{t('cancel', { ns: 'common' })}</button>
            <button onClick={handleExport} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400">{loading ? t('loading', { ns: 'common' }) : t('export', { ns: 'common' })}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportDialog;
