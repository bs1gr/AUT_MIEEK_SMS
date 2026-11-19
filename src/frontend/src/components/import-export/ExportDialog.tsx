import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadBlob } from '@/utils/downloadFile';
import { importExportApi, pollJob, type ExportFormat, type ExportKind } from '@/api/importExportApi';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ExportKind;
  onComplete?: () => void;
}

const KINDS: Array<{ value: ExportKind; label: string }> = [
  { value: 'students', label: 'ieKindStudents' },
  { value: 'courses', label: 'ieKindCourses' },
  { value: 'grades', label: 'ieKindGrades' },
  { value: 'attendance', label: 'ieKindAttendance' },
];

/**
 * Asks the server for an export job, waits for it and saves the file.
 *
 * As it was until November 2026 (plan todo 62): the requests carried no sign-in token and were
 * refused; "excel" was a format the server did not know; only students could be asked for;
 * and the dialog offered a date range and "include headers" that the server never looked at.
 */
export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, type = 'students', onComplete }) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ExportKind>(type);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const started = await importExportApi.createExport(kind, format);
      const finished = await pollJob(
        () => importExportApi.getExportJob(started.id),
        (job) => job.status === 'completed' || job.status === 'failed',
      );
      if (!finished) {
        setError(t('ieExportSlow', { ns: 'export' }));
        return;
      }
      if (finished.status === 'failed') {
        setError(t('ieExportFailed', { ns: 'export' }));
        return;
      }
      const blob = await importExportApi.downloadExport(started.id);
      await downloadBlob(blob, `${kind}-export.${format}`);
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('unknownError', { ns: 'common' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} role="presentation" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 id="export-dialog-title" className="text-lg font-medium text-gray-900">{t('exportData', { ns: 'export' })}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-hidden"
              aria-label={t('close', { ns: 'common' })}
              type="button"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="export-kind-select" className="block text-sm font-medium text-gray-900 mb-2">
                {t('ieKind', { ns: 'export' })}
              </label>
              <select
                id="export-kind-select"
                value={kind}
                onChange={(e) => setKind(e.target.value as ExportKind)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {KINDS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.label, { ns: 'export' })}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="format-select" className="block text-sm font-medium text-gray-900 mb-2">
                {t('format', { ns: 'export' })}
              </label>
              <select
                id="format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="xlsx">{t('excel', { ns: 'export' })}</option>
                <option value="csv">{t('csv', { ns: 'export' })}</option>
                <option value="pdf">{t('pdf', { ns: 'export' })}</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500">{t('cancel', { ns: 'common' })}</button>
            <button type="button" onClick={handleExport} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400">{loading ? t('loading', { ns: 'common' }) : t('export', { ns: 'common' })}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportDialog;
