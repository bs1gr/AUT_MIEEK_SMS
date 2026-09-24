import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import JobProgressMonitor from '../JobProgressMonitor';

const mockGet = vi.fn();
vi.mock('@/api/api', () => ({
  jobsAPI: { get: (...args: unknown[]) => mockGet(...args) },
}));

// Stable t: the monitor's polling effect depends on it
const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key);
vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t }),
}));

const baseJob = { job_id: 'job-1', job_type: 'student_import', created_at: '2026-09-24T10:00:00Z' };

describe('JobProgressMonitor', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // Regression: the backend sends lowercase statuses and a progress *object*;
  // the monitor compared against 'COMPLETED' and read progress as a number,
  // so it never recognised a finished job and kept polling forever.
  it('recognises a lowercase completed status, stops polling and shows the summary', async () => {
    const onComplete = vi.fn();
    mockGet.mockResolvedValue({
      ...baseJob,
      status: 'completed',
      progress: { current: 17, total: 17, percentage: 100, message: '17/17' },
      result: { success: true, message: 'ok', data: { type: 'students', created: 15, updated: 2 }, errors: [] },
    });

    render(<JobProgressMonitor jobId="job-1" pollIntervalMs={10} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(screen.getByText('jobStatus_completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/jobMonitorSummary.*"created":15.*"updated":2/)).toBeInTheDocument();

    const callsAtCompletion = mockGet.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockGet.mock.calls.length).toBe(callsAtCompletion);
  });

  it('shows percentage from the progress object while processing', async () => {
    mockGet.mockResolvedValue({
      ...baseJob,
      status: 'processing',
      progress: { current: 5, total: 10, percentage: 50, message: '5/10' },
    });

    render(<JobProgressMonitor jobId="job-1" pollIntervalMs={10_000} />);

    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50'));
    expect(screen.getByText('jobStatus_processing')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('lists skipped rows (result.warnings) and the skipped count', async () => {
    mockGet.mockResolvedValue({
      ...baseJob,
      status: 'completed',
      result: {
        success: true,
        message: 'ok',
        data: { type: 'students', created: 1, updated: 0, skipped: 1 },
        errors: [],
        warnings: ['S2026014: already exists and updates are not allowed, skipped'],
      },
    });

    render(<JobProgressMonitor jobId="job-1" pollIntervalMs={10_000} />);

    expect(await screen.findByText('S2026014: already exists and updates are not allowed, skipped')).toBeInTheDocument();
    expect(screen.getByText(/jobMonitorSummary.*"skipped":1/)).toBeInTheDocument();
  });

  it('shows error_message and row errors for a failed job', async () => {
    const onComplete = vi.fn();
    mockGet.mockResolvedValue({
      ...baseJob,
      status: 'failed',
      error_message: 'item: Missing student_id or email',
      result: { success: false, message: 'Imported students: 0 created, 0 updated', errors: ['item: Missing student_id or email'] },
    });

    render(<JobProgressMonitor jobId="job-1" pollIntervalMs={10} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByText('jobStatus_failed')).toBeInTheDocument();
    expect(screen.getAllByText('item: Missing student_id or email')).toHaveLength(2);
  });
});
