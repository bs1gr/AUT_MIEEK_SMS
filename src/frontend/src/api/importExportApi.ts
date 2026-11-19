/**
 * The requests of Control Panel > Maintenance > Import/Export.
 *
 * The panel's components used to call `fetch` themselves: no sign-in token went with those
 * requests, so on a server that asks for a sign-in every one of them was refused (401; plan
 * todo 62). They go through `apiClient` now, which carries the token. The functions that were
 * here before were used by nothing, and their addresses repeated the `/api/v1` that
 * `apiClient` already puts in front.
 */
import apiClient from './api';

export type ImportKind = 'students' | 'courses' | 'grades';
export type ExportKind = 'students' | 'courses' | 'grades' | 'attendance';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ImportJob {
  id: number;
  file_name: string;
  file_type: string;
  import_type: ImportKind;
  /** `ready`: checked and without a fault. `invalid`: checked, with faults, cannot be committed. */
  status: 'pending' | 'validating' | 'ready' | 'invalid' | 'importing' | 'completed' | 'failed' | 'cancelled';
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  /** Row number (as a spreadsheet shows it) to what is wrong; or one message under `global`,
   *  `system_error` or `commit_error`. */
  validation_errors: Record<string, string[] | string> | null;
  created_at: string;
  completed_at: string | null;
  imported_by?: number;
}

export interface ExportJob {
  id: number;
  export_type: string;
  file_format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records?: number;
  file_path?: string | null;
  created_at: string;
  completed_at?: string | null;
}

/** The server wraps what it answers as `{ success, data }`; older answers are the data itself. */
const unwrap = <T,>(body: unknown): T => {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    const inner = (body as { data: unknown; success?: boolean; error?: { message?: string } });
    if (inner.success === false) {
      throw new Error(inner.error?.message || 'The server refused the request');
    }
    return inner.data as T;
  }
  return body as T;
};

const BASE = '/import-export';

export const importExportApi = {
  uploadImportFile: async (kind: ImportKind, file: File): Promise<ImportJob> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${BASE}/imports/${kind}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<ImportJob>(response.data);
  },

  getImportJob: async (id: number): Promise<ImportJob> =>
    unwrap<ImportJob>((await apiClient.get(`${BASE}/imports/${id}`)).data),

  commitImportJob: async (id: number): Promise<ImportJob> =>
    unwrap<ImportJob>((await apiClient.post(`${BASE}/imports/${id}/commit`)).data),

  listImportJobs: async (limit = 20): Promise<ImportJob[]> =>
    unwrap<{ jobs?: ImportJob[] }>((await apiClient.get(`${BASE}/imports`, { params: { limit } })).data).jobs ?? [],

  createExport: async (kind: ExportKind, format: ExportFormat): Promise<ExportJob> =>
    unwrap<ExportJob>((await apiClient.post(`${BASE}/exports`, { export_type: kind, file_format: format })).data),

  getExportJob: async (id: number): Promise<ExportJob> =>
    unwrap<ExportJob>((await apiClient.get(`${BASE}/exports/${id}`)).data),

  listExportJobs: async (limit = 20): Promise<ExportJob[]> =>
    unwrap<{ exports?: ExportJob[] }>((await apiClient.get(`${BASE}/exports`, { params: { limit } })).data).exports ?? [],

  /** The file of a finished export job, as it was written. */
  downloadExport: async (id: number): Promise<Blob> =>
    (await apiClient.get(`${BASE}/exports/${id}/download`, { responseType: 'blob' })).data as Blob,
};

/** Asks for a job again and again until `done` says so, or gives up after `tries`. */
export async function pollJob<T>(
  ask: () => Promise<T>,
  done: (job: T) => boolean,
  { tries = 120, waitMs = 1000 }: { tries?: number; waitMs?: number } = {},
): Promise<T | null> {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const job = await ask();
    if (done(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return null;
}
