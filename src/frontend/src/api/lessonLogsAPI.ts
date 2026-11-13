/**
 * Lesson logs: the material covered and the teacher's notes for each teaching period
 * (backend/routers/routers_lesson_logs.py).
 *
 * Only the default `apiClient` is imported from './api'. Tests that mock '@/api/api' with just a
 * default export (AttendanceView's) must keep working, and a named import missing from such a
 * mock throws as soon as it is touched.
 */
import apiClient from './api';
import type { LessonLog, LessonLogSavePayload, PaginatedResponse } from '@/types';

export interface LessonLogListParams {
  course_id?: number;
  /** Exact date, YYYY-MM-DD. */
  date?: string;
  period_number?: number;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export type LessonLogExportFormat = 'pdf' | 'excel';

export interface LessonLogExportParams {
  course_id: number;
  include_notes?: boolean;
  start_date?: string;
  end_date?: string;
  /** 'en' or 'el': the language of the headings in the file. */
  lang?: string;
}

export interface LessonLogExportFile {
  blob: Blob;
  filename: string;
}

// Saves go out one at a time, in call order. A save that was queued while the server was
// unreachable and a newer one typed afterwards must never reach the server the other way round.
let saveChain: Promise<unknown> = Promise.resolve();

export const lessonLogsAPI = {
  /** Lesson logs, newest date first. A malformed or empty body is treated as an empty page. */
  list: async (params: LessonLogListParams): Promise<PaginatedResponse<LessonLog>> => {
    const response = await apiClient.get<PaginatedResponse<LessonLog>>('/lesson-logs/', { params });
    const body = (response?.data ?? {}) as Partial<PaginatedResponse<LessonLog>>;
    const items = Array.isArray(body.items) ? body.items : [];
    return {
      items,
      total: body.total ?? items.length,
      skip: body.skip ?? params.skip ?? 0,
      limit: body.limit ?? params.limit ?? items.length,
      pages: body.pages ?? 1,
      current_page: body.current_page ?? 1,
    };
  },

  /**
   * The course's lesson log as a PDF or Excel file (material covered by date and period). The
   * teacher's notes are private and only printed when `include_notes` is set.
   */
  exportFile: async (format: LessonLogExportFormat, params: LessonLogExportParams): Promise<LessonLogExportFile> => {
    const response = await apiClient.get<Blob>(`/lesson-logs/export/${format}`, { params, responseType: 'blob' });
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    // The header is not always readable (cross-origin on the phone), so there is a fallback name.
    const disposition = String((response.headers as Record<string, unknown> | undefined)?.['content-disposition'] ?? '');
    const named = /filename="?([A-Za-z0-9._-]+)"?/.exec(disposition)?.[1];
    return { blob: response.data, filename: named || `lesson_log_${params.course_id}.${extension}` };
  },

  /** Create the log of one period, or update the fields that are present in the payload. */
  save: (payload: LessonLogSavePayload): Promise<LessonLog> => {
    const run = saveChain.then(async () => {
      const response = await apiClient.put<LessonLog>('/lesson-logs/', payload);
      return response.data;
    });
    saveChain = run.catch(() => undefined);
    return run;
  },
};

export default lessonLogsAPI;
