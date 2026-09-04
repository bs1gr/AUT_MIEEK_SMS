import ImportPreviewPanel from '@/components/tools/ImportPreviewPanel';
import JobProgressMonitor from '@/components/tools/JobProgressMonitor';

export interface OperationsImportsTabProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  jobIdInput: string;
  setJobIdInput: (value: string) => void;
  trackedJobId: string | null;
  setTrackedJobId: (jobId: string | null) => void;
}

const OperationsImportsTab = ({
  t,
  jobIdInput,
  setJobIdInput,
  trackedJobId,
  setTrackedJobId,
}: OperationsImportsTabProps) => {
  return (
    <div className="space-y-6">
      <ImportPreviewPanel
        onJobCreated={(jobId) => {
          setTrackedJobId(jobId);
          setJobIdInput(jobId);
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">{t('jobMonitorTitle', { ns: 'export' })}</div>
            <p className="text-sm text-slate-600">{t('jobMonitorHelper', { ns: 'export' })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm text-slate-700" htmlFor="job-id-input">
              {t('jobMonitorInputLabel', { ns: 'export' })}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="job-id-input"
                type="text"
                value={jobIdInput}
                onChange={(e) => setJobIdInput(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-64"
              />
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={() => setTrackedJobId(jobIdInput.trim() || null)}
              >
                {t('jobMonitorStart', { ns: 'export' })}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <JobProgressMonitor jobId={trackedJobId} />
        </div>
      </div>
    </div>
  );
};

export default OperationsImportsTab;
