import { customReportsAPI } from '@/api/customReportsAPI';
import { downloadBlob } from '@/utils/downloadFile';

/**
 * Generate a saved report and download its file, from the builder (plan todo 75 stage 5). Until
 * November 2026 the builder could only save: the file came from the Reports list, by generating
 * it there, opening its generated files, waiting for them and downloading.
 *
 * The server makes the file in the background; this asks after it until it is ready.
 */
export class ReportGenerationError extends Error {
  constructor(
    message: string,
    readonly reason: 'failed' | 'timeout'
  ) {
    super(message);
    this.name = 'ReportGenerationError';
  }
}

export interface GenerateAndDownloadOptions {
  exportFormat: 'pdf' | 'excel' | 'csv';
  language?: string;
  pollMs?: number;
  timeoutMs?: number;
  wait?: (ms: number) => Promise<void>;
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function generateAndDownload(reportId: number, options: GenerateAndDownloadOptions): Promise<string> {
  const { exportFormat, language, pollMs = 1500, timeoutMs = 120_000, wait = pause } = options;
  const started = await customReportsAPI.generate(reportId, {
    export_format: exportFormat,
    include_charts: true,
    email_enabled: false,
    language,
  });
  const generatedId = started.generated_report_id;
  for (let waited = 0; ; waited += pollMs) {
    const generated = await customReportsAPI.getGeneratedReports(reportId, { limit: 20 });
    const row = (Array.isArray(generated) ? generated : []).find((entry) => entry.id === generatedId);
    if (row?.status === 'completed') break;
    if (row?.status === 'failed') {
      throw new ReportGenerationError(row.error_message || 'Report generation failed', 'failed');
    }
    if (waited >= timeoutMs) throw new ReportGenerationError('Report generation timed out', 'timeout');
    await wait(pollMs);
  }
  const { blob, filename } = await customReportsAPI.download(reportId, generatedId);
  await downloadBlob(blob, filename);
  return filename;
}
