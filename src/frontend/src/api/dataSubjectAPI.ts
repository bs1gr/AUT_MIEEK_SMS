/**
 * Administrator tools for a student's personal data: the health information (special-category
 * data, kept out of every general response), the export that answers an access request, and
 * permanent erasure (backend/routers/routers_students.py and routers_data_subject.py).
 */
import apiClient from './api';

export interface DataSubjectFile {
  blob: Blob;
  filename: string;
}

export const dataSubjectAPI = {
  getHealth: async (studentId: number): Promise<string> => {
    const response = await apiClient.get<{ health_issue?: string | null }>(`/students/${studentId}/health`);
    return response?.data?.health_issue ?? '';
  },

  saveHealth: async (studentId: number, text: string): Promise<string> => {
    const response = await apiClient.put<{ health_issue?: string | null }>(`/students/${studentId}/health`, {
      health_issue: text,
    });
    return response?.data?.health_issue ?? '';
  },

  /** Everything the system holds about the student, as a JSON file. */
  exportData: async (studentId: number): Promise<DataSubjectFile> => {
    const response = await apiClient.get<Blob>(`/data-subject/students/${studentId}/export`, { responseType: 'blob' });
    const disposition = String((response.headers as Record<string, unknown> | undefined)?.['content-disposition'] ?? '');
    const named = /filename="?([A-Za-z0-9._-]+)"?/.exec(disposition)?.[1];
    return { blob: response.data, filename: named || `personal_data_${studentId}.json` };
  },

  /** Permanent erasure; `confirm` is the student's registry number, typed by the administrator. */
  erase: async (studentId: number, confirm: string): Promise<void> => {
    await apiClient.delete(`/data-subject/students/${studentId}`, { params: { confirm } });
  },
};

export default dataSubjectAPI;
