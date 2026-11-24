import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAndDownload, ReportGenerationError } from '../generateAndDownload';

// Plan todo 75 stage 5: the builder makes the report's file and downloads it itself.
const api = vi.hoisted(() => ({ generate: vi.fn(), getGeneratedReports: vi.fn(), download: vi.fn() }));
const downloadBlob = vi.hoisted(() => vi.fn());

vi.mock('@/api/customReportsAPI', () => ({ customReportsAPI: api }));
vi.mock('@/utils/downloadFile', () => ({ downloadBlob }));

const noWait = () => Promise.resolve();

describe('generateAndDownload', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    downloadBlob.mockReset();
    api.generate.mockResolvedValue({ generated_report_id: 41, status: 'pending', message: '' });
  });

  it('asks the server to make the file, waits for it and downloads it', async () => {
    api.getGeneratedReports
      .mockResolvedValueOnce([{ id: 41, status: 'pending' }])
      .mockResolvedValueOnce([{ id: 40, status: 'completed' }, { id: 41, status: 'generating' }])
      .mockResolvedValueOnce([{ id: 41, status: 'completed' }]);
    const blob = new Blob(['a']);
    api.download.mockResolvedValue({ blob, filename: 'report_7.csv' });

    const name = await generateAndDownload(7, { exportFormat: 'csv', language: 'el', wait: noWait });

    expect(api.generate).toHaveBeenCalledWith(7, {
      export_format: 'csv',
      include_charts: true,
      email_enabled: false,
      language: 'el',
    });
    expect(api.getGeneratedReports).toHaveBeenCalledTimes(3);
    expect(api.download).toHaveBeenCalledWith(7, 41);
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'report_7.csv');
    expect(name).toBe('report_7.csv');
  });

  it('stops with the reason when the server could not make the file', async () => {
    api.getGeneratedReports.mockResolvedValue([{ id: 41, status: 'failed', error_message: 'no rows' }]);

    await expect(generateAndDownload(7, { exportFormat: 'pdf', wait: noWait })).rejects.toMatchObject({
      reason: 'failed',
      message: 'no rows',
    });
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('gives up after the time allowed, the file still being made', async () => {
    api.getGeneratedReports.mockResolvedValue([{ id: 41, status: 'generating' }]);

    const outcome = generateAndDownload(7, { exportFormat: 'excel', pollMs: 10, timeoutMs: 30, wait: noWait });

    await expect(outcome).rejects.toBeInstanceOf(ReportGenerationError);
    await expect(outcome).rejects.toMatchObject({ reason: 'timeout' });
    expect(api.getGeneratedReports).toHaveBeenCalledTimes(4);
  });
});
