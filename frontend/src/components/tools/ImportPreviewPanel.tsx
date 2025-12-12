import { useState, useRef } from 'react';

import { importAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';

type PreviewItem = {
  row_number: number;
  action: string;
  data: Record<string, unknown>;
  validation_status: string;
  issues: string[];
};

type PreviewResponse = {
  total_rows: number;
  valid_rows: number;
  rows_with_warnings: number;
  rows_with_errors: number;
  items: PreviewItem[];
  can_proceed: boolean;
  estimated_duration_seconds?: number;
  summary?: Record<string, number>;
};

type ImportPreviewPanelProps = {
  onPreviewComplete?: (result: PreviewResponse) => void;
  onJobCreated?: (jobId: string) => void;
};

const ImportPreviewPanel = ({ onPreviewComplete, onJobCreated }: ImportPreviewPanelProps) => {
  const { t } = useLanguage();
  const [importType, setImportType] = useState<'students' | 'courses'>('students');
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [jsonText, setJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const files = fileInputRef.current?.files;
      const list = files ? Array.from(files) : undefined;
      const data = await importAPI.preview({
        type: importType,
        files: list,
        jsonText: jsonText.trim() ? jsonText : undefined,
        allowUpdates,
        skipDuplicates,
      });
      setResult(data as PreviewResponse);
      onPreviewComplete?.(data as PreviewResponse);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || t('export.importPreviewError'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummary = () => {
    if (!result) return null;
    const summary = result.summary || {};
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={t('export.previewTotalRows')} value={result.total_rows} tone="neutral" />
        <SummaryCard label={t('export.previewCreates')} value={summary.create ?? 0} tone="success" />
        <SummaryCard label={t('export.previewUpdates')} value={summary.update ?? 0} tone="info" />
        <SummaryCard label={t('export.previewSkips')} value={summary.skip ?? 0} tone="muted" />
        <SummaryCard label={t('export.previewWarnings')} value={result.rows_with_warnings} tone="warning" />
        <SummaryCard label={t('export.previewErrors')} value={result.rows_with_errors} tone="danger" />
      </div>
    );
  };

  const renderTable = () => {
    if (!result) return null;
    const items = result.items.slice(0, 100); // avoid overly large tables in UI
    return (
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">{t('export.previewAction')}</th>
              <th className="px-3 py-2">{t('export.previewStatus')}</th>
              <th className="px-3 py-2">{t('export.previewIssues')}</th>
              <th className="px-3 py-2">{t('export.previewData')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.row_number} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700">{item.row_number}</td>
                <td className="px-3 py-2 text-slate-700">{item.action}</td>
                <td className="px-3 py-2 text-slate-700">{item.validation_status}</td>
                <td className="px-3 py-2 text-slate-700">
                  {item.issues && item.issues.length > 0 ? (
                    <ul className="list-disc pl-4 text-red-600">
                      {item.issues.map((i, idx) => (
                        <li key={idx}>{i}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-emerald-600">{t('export.previewNoIssues')}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  <pre className="max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                    {JSON.stringify(item.data, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.items.length > items.length && (
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {t('export.previewTruncated', { count: result.items.length - items.length })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-semibold text-slate-900">{t('export.importPreviewTitle')}</div>
        <p className="text-sm text-slate-600">{t('export.importPreviewDescription')}</p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="importType"
                value="students"
                checked={importType === 'students'}
                onChange={() => setImportType('students')}
              />
              {t('export.importTypeStudents')}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="importType"
                value="courses"
                checked={importType === 'courses'}
                onChange={() => setImportType('courses')}
              />
              {t('export.importTypeCourses')}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allowUpdates}
                onChange={(e) => setAllowUpdates(e.target.checked)}
              />
              {t('export.allowUpdates')}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              {t('export.skipDuplicates')}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">{t('export.uploadFiles')}</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json,.csv"
                aria-label={t('export.uploadFiles')}
                className="mt-1 block w-full text-sm text-slate-700"
              />
              <p className="text-xs text-slate-500">{t('export.uploadHint')}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">{t('export.pasteJson')}</label>
              <textarea
                className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-700"
                rows={4}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={t('export.pasteJsonPlaceholder')}
              />
              <p className="text-xs text-slate-500">{t('export.pasteJsonHint')}</p>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? t('export.previewing') : t('export.runPreview')}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

      {result && (
        <div className="space-y-3">
          {renderSummary()}
          {renderTable()}
          
          {/* Import execution buttons */}
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
              onClick={async () => {
                setIsExecuting(true);
                setError(null);
                try {
                  const files = fileInputRef.current?.files;
                  const list = files ? Array.from(files) : undefined;
                  const response = await importAPI.execute({
                    type: importType,
                    files: list,
                    jsonText: jsonText.trim() ? jsonText : undefined,
                    allowUpdates,
                    skipDuplicates,
                  });
                  const jobId = (response as { job_id?: string }).job_id;
                  if (jobId) {
                    onJobCreated?.(jobId);
                  }
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                  setError(msg || t('export.importError'));
                } finally {
                  setIsExecuting(false);
                }
              }}
              disabled={isExecuting || result.rows_with_errors > 0}
            >
              {isExecuting ? '⏳ ' : '✓ '}{t('export.confirmAndImport')}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              onClick={() => {
                setResult(null);
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                setJsonText('');
              }}
            >
              {t('export.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type SummaryTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'muted';

const toneStyles: Record<SummaryTone, string> = {
  neutral: 'bg-slate-50 text-slate-800 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  muted: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SummaryCard = ({ label, value, tone }: { label: string; value: number; tone: SummaryTone }) => (
  <div className={`rounded-xl border p-3 shadow-sm ${toneStyles[tone]}`}>
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default ImportPreviewPanel;
