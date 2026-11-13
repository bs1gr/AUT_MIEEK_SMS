/**
 * A staff member's own notes about students, stored per account on the server
 * (backend/routers/routers_student_notes.py). They used to live in the browser's localStorage.
 *
 * Only the default `apiClient` is imported from './api', so tests that mock '@/api/api' with just
 * a default export keep working.
 */
import apiClient from './api';

export const studentNotesAPI = {
  /** Every note of the signed-in account, keyed by the student's id. */
  list: async (): Promise<Record<number, string>> => {
    const response = await apiClient.get<{ notes?: Record<string, string> }>('/student-notes/');
    const notes: Record<number, string> = {};
    Object.entries(response?.data?.notes ?? {}).forEach(([id, text]) => {
      if (typeof text === 'string') notes[Number(id)] = text;
    });
    return notes;
  },

  /** Save the note about one student; blank text removes it. */
  save: async (studentId: number, text: string): Promise<void> => {
    await apiClient.put(`/student-notes/${studentId}`, { text });
  },
};

export default studentNotesAPI;
