/* eslint-disable react/forbid-dom-props */
import { useEffect, useState } from 'react';

import { jobsAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';

type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

type JobResponse = {
  id: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  result?: unknown;
  error?: string;
  created_at?: string;
  updated_at?: string;
};

type JobProgressMonitorProps = {
  jobId: string | null;
  pollIntervalMs?: number;
  onComplete?: (job: JobResponse) => void;
};

const JobProgressMonitor = ({ jobId, pollIntervalMs = 2000, onComplete }: JobProgressMonitorProps) => {
  const { t } = useLanguage();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const widthClassMap: Record<number, string> = {
    0: 'w-0',
    5: 'w-[5%]',
    10: 'w-[10%]',
    15: 'w-[15%]',
    20: 'w-[20%]',
    25: 'w-[25%]',
    30: 'w-[30%]',
    35: 'w-[35%]',
    40: 'w-[40%]',
    45: 'w-[45%]',
    50: 'w-1/2',
    55: 'w-[55%]',
    60: 'w-3/5',
    65: 'w-[65%]',
    70: 'w-7/10',
    75: 'w-3/4',
    80: 'w-4/5',
    85: 'w-[85%]',
    90: 'w-9/10',
    95: 'w-[95%]',
    100: 'w-full',
  };

  useEffect(() => {
    if (!jobId) return undefined;
    let isActive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchJob = async () => {
      try {
        const data = await jobsAPI.get(jobId);
        if (!isActive) return;
        setJob(data as JobResponse);
        setError(null);
        const status = (data as JobResponse).status;
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
          if (onComplete) onComplete(data as JobResponse);
          if (timer) clearInterval(timer);
        }
      } catch (err: unknown) {
        if (!isActive) return;
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(msg || t('export.jobMonitorError'));
      }
    };

    void fetchJob();
    timer = setInterval(fetchJob, pollIntervalMs);

    return () => {
      isActive = false;
      if (timer) clearInterval(timer);
    };
  }, [jobId, pollIntervalMs, onComplete, t]);

  if (!jobId) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{t('export.jobMonitorTitle')}</div>
          <div className="text-xs text-slate-500">{t('export.jobMonitorId', { id: jobId })}</div>
        </div>
        <div className="text-xs font-medium text-slate-600">{job?.status || t('export.jobMonitorPending')}</div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        {(() => {
          const raw = Math.min(Math.max(job?.progress ?? 0, 0), 100);
          const step = Math.min(100, Math.max(0, Math.round(raw / 5) * 5));
          const widthClass = widthClassMap[step] ?? 'w-0';
          return <div className={`h-full bg-indigo-600 transition-all ${widthClass}`} aria-hidden />;
        })()}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{t('export.jobMonitorProgress', { value: Math.round(job?.progress ?? 0) })}</span>
        {job?.message && <span className="text-slate-600">{job.message}</span>}
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      {job?.status === 'FAILED' && job.error && <div className="text-xs text-red-600">{job.error}</div>}
      {job?.status === 'COMPLETED' && <div className="text-xs text-emerald-600">{t('export.jobMonitorCompleted')}</div>}
    </div>
  );
};

export default JobProgressMonitor;
