import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importExportApi, pollJob, type ImportJob, type ImportKind } from '@/api/importExportApi';

export interface ImportWizardProps {
  type: ImportKind;
  onCancel: () => void;
  onComplete: () => void;
}

type Step = 'upload' | 'preview' | 'checking' | 'checked' | 'storing' | 'stored';

const ACCEPTED = /\.(csv|xlsx|xls)$/i;
const COLUMNS: Record<ImportKind, string> = {
  students: 'ieColumnsStudents',
  courses: 'ieColumnsCourses',
  grades: 'ieColumnsGrades',
};

/** What is wrong with a file, as lines: "Row 3: Missing email". */
const faultsOf = (job: ImportJob, t: (key: string, options?: Record<string, unknown>) => string): string[] => {
  const lines: string[] = [];
  for (const [where, what] of Object.entries(job.validation_errors ?? {})) {
    const text = Array.isArray(what) ? what.join('; ') : String(what);
    const label = /^\d+$/.test(where) ? t('ieRow', { ns: 'export', row: where }) : t('ieWholeFile', { ns: 'export' });
    lines.push(`${label}: ${text}`);
  }
  return lines;
};

/**
 * A file of students, courses or grades: sent to the server, checked there, and stored when
 * the check finds no fault.
 *
 * As it was until November 2026 (plan todo 62): the requests carried no sign-in token and were
 * refused; and where they were not, the wizard stopped after the check and closed as if the
 * import were done. Nothing was ever stored: no request asked for it.
 */
export const ImportWizard: React.FC<ImportWizardProps> = ({ type, onCancel, onComplete }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof Error && err.message ? err.message : fallback);
    setStep('upload');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    // By the name: a browser gives a CSV file several types, or none.
    if (!ACCEPTED.test(selected.name)) {
      setError(t('invalidFileFormat', { ns: 'export' }));
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setError(t('fileTooLarge', { ns: 'export' }));
      return;
    }
    setFile(selected);
    setJob(null);
    setError(null);
    setStep('preview');
  };

  const handleCheck = async () => {
    if (!file) return;
    setStep('checking');
    setError(null);
    try {
      const uploaded = await importExportApi.uploadImportFile(type, file);
      const checked = await pollJob(
        () => importExportApi.getImportJob(uploaded.id),
        (current) => ['ready', 'invalid', 'failed', 'completed'].includes(current.status),
      );
      if (!checked) {
        fail(null, t('importTimeout', { ns: 'export' }));
        return;
      }
      if (checked.status === 'failed') {
        fail(null, faultsOf(checked, t)[0] || t('importFailed', { ns: 'export' }));
        return;
      }
      setJob(checked);
      setStep('checked');
    } catch (err) {
      fail(err, t('uploadFailed', { ns: 'export' }));
    }
  };

  const handleStore = async () => {
    if (!job) return;
    setStep('storing');
    setError(null);
    try {
      await importExportApi.commitImportJob(job.id);
      const stored = await pollJob(
        () => importExportApi.getImportJob(job.id),
        (current) => current.status === 'completed' || current.status === 'failed',
      );
      if (!stored) {
        fail(null, t('importTimeout', { ns: 'export' }));
        return;
      }
      if (stored.status === 'failed') {
        fail(null, faultsOf(stored, t)[0] || t('importFailed', { ns: 'export' }));
        return;
      }
      setJob(stored);
      setStep('stored');
    } catch (err) {
      fail(err, t('importFailed', { ns: 'export' }));
    }
  };

  const handleReset = () => {
    setFile(null);
    setJob(null);
    setError(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const faults = job && step === 'checked' ? faultsOf(job, t) : [];
  const hasFaults = job?.status === 'invalid';
  const busy = step === 'checking' || step === 'storing';
  const secondary = 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500';
  const primary = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400';

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="import-wizard-title">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 id="import-wizard-title" className="text-lg font-medium text-gray-900">{t('importWizard', { ns: 'export' })}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`import${type.charAt(0).toUpperCase() + type.slice(1)}`, { ns: 'export' })}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 focus:outline-hidden" aria-label={t('close', { ns: 'common' })}>
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3" role="alert">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".csv,.xlsx,.xls" className="hidden" data-testid="import-file-input" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{t('dragDropFile', { ns: 'export' })}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-800 font-medium">
                  {t('selectFile', { ns: 'export' })}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600">{t(COLUMNS[type], { ns: 'export' })}</p>
            <p className="text-xs text-gray-500">{t('importFileHint', { ns: 'export' })}</p>
          </div>
        )}

        {step !== 'upload' && file && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-900">{t('selectedFile', { ns: 'export' })}:</p>
            <p className="text-sm text-gray-600 mt-1">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {busy && (
          <p className="text-sm font-medium text-gray-900" role="status">
            {t(step === 'checking' ? 'ieChecking' : 'ieStoring', { ns: 'export' })}
          </p>
        )}

        {step === 'checked' && job && !hasFaults && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3" role="status">
            <p className="text-sm text-blue-800">{t('ieCheckedOk', { ns: 'export', count: job.total_rows })}</p>
          </div>
        )}

        {step === 'checked' && job && hasFaults && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3" role="alert">
            <p className="text-sm text-amber-900">
              {t('ieCheckedFaults', { ns: 'export', count: job.failed_rows, total: job.total_rows })}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 max-h-48 overflow-y-auto" data-testid="import-faults">
              {faults.map((line) => (<li key={line}>{line}</li>))}
            </ul>
          </div>
        )}

        {step === 'stored' && job && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3" role="status">
            <p className="text-sm text-green-800">{t('ieStored', { ns: 'export', count: job.total_rows })}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end">
        {step !== 'stored' && (
          <button type="button" onClick={onCancel} disabled={busy} className={secondary}>{t('cancel', { ns: 'common' })}</button>
        )}
        {(step === 'preview' || step === 'checked') && (
          <button type="button" onClick={handleReset} className={secondary}>{t('selectDifferent', { ns: 'export' })}</button>
        )}
        {step === 'preview' && (
          <button type="button" onClick={handleCheck} className={primary}>{t('import', { ns: 'common' })}</button>
        )}
        {step === 'checked' && !hasFaults && (
          <button type="button" onClick={handleStore} className={primary}>{t('ieStore', { ns: 'export' })}</button>
        )}
        {step === 'stored' && (
          <button type="button" onClick={onComplete} className={primary}>{t('close', { ns: 'common' })}</button>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
