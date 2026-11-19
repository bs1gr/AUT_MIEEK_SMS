import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadBlob } from '@/utils/downloadFile';
import { importExportApi, type ExportJob, type ImportJob } from '@/api/importExportApi';

export type HistoryTableProps = Record<string, unknown>;

interface Row {
  key: string;
  operation: 'import' | 'export';
  kind: string;
  file: string;
  status: string;
  records: number | null;
  createdAt: string;
  exportJob?: ExportJob;
}

const KIND_LABELS: Record<string, string> = {
  students: 'ieKindStudents',
  courses: 'ieKindCourses',
  grades: 'ieKindGrades',
  attendance: 'ieKindAttendance',
};

const STATUS_COLOURS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  ready: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  importing: 'bg-blue-100 text-blue-800',
  validating: 'bg-blue-100 text-blue-800',
  invalid: 'bg-amber-100 text-amber-900',
  failed: 'bg-red-100 text-red-800',
};

const statusKey = (status: string) => `ieStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const importRow = (job: ImportJob): Row => ({
  key: `import-${job.id}`,
  operation: 'import',
  kind: job.import_type,
  file: job.file_name,
  status: job.status,
  records: job.total_rows ?? null,
  createdAt: job.created_at,
});

const exportRow = (job: ExportJob): Row => ({
  key: `export-${job.id}`,
  operation: 'export',
  kind: job.export_type,
  file: (job.file_format || '').toUpperCase(),
  status: job.status,
  records: job.total_records ?? null,
  createdAt: job.created_at,
  exportJob: job,
});

/**
 * The import and export jobs of the panel, the newest first, with the file of a finished
 * export to download.
 *
 * It used to ask for the audit history, without a sign-in token (refused), and to show
 * columns that history does not have (a state, a number of records, a file).
 */
export const HistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [imports, exports] = await Promise.all([importExportApi.listImportJobs(), importExportApi.listExportJobs()]);
        if (cancelled) return;
        const merged = [...imports.map(importRow), ...exports.map(exportRow)];
        merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
        setRows(merged);
      } catch {
        if (cancelled) return;
        setError(t('ieListFailed', { ns: 'export' }));
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [t]);

  const download = async (job: ExportJob) => {
    try {
      const blob = await importExportApi.downloadExport(job.id);
      await downloadBlob(blob, `${job.export_type}-export.${job.file_format}`);
    } catch {
      setError(t('ieExportFailed', { ns: 'export' }));
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-12"><div className="text-gray-500">{t('loading', { ns: 'common' })}</div></div>);
  }

  if (error) {
    return (<div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert"><p className="text-red-800">{error}</p></div>);
  }

  if (rows.length === 0) {
    return (<div className="text-center py-12"><p className="text-gray-500">{t('noData', { ns: 'common' })}</p></div>);
  }

  const head = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const cell = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className={head}>{t('type', { ns: 'export' })}</th>
            <th scope="col" className={head}>{t('entity', { ns: 'export' })}</th>
            <th scope="col" className={head}>{t('ieFile', { ns: 'export' })}</th>
            <th scope="col" className={head}>{t('status', { ns: 'common' })}</th>
            <th scope="col" className={head}>{t('records', { ns: 'export' })}</th>
            <th scope="col" className={head}>{t('date', { ns: 'common' })}</th>
            <th scope="col" className={head}>{t('actions', { ns: 'common' })}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {t(row.operation, { ns: 'export' })}
              </td>
              <td className={cell}>{KIND_LABELS[row.kind] ? t(KIND_LABELS[row.kind], { ns: 'export' }) : row.kind}</td>
              <td className={cell}>{row.file}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_COLOURS[row.status] ?? 'bg-gray-100 text-gray-800'}`}>
                  {t(statusKey(row.status), { ns: 'export', defaultValue: row.status })}
                </span>
              </td>
              <td className={cell}>{row.records ?? ''}</td>
              <td className={cell}>{formatDate(row.createdAt)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {row.exportJob && row.status === 'completed' && (
                  <button type="button" onClick={() => download(row.exportJob as ExportJob)} className="text-blue-600 hover:text-blue-800">
                    {t('download', { ns: 'common' })}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;
