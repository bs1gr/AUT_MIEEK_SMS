import type { StudentFormData } from '@/types';

export interface QueuedStudentUpdate {
  id: string;
  studentId: number;
  data: Partial<StudentFormData> & { re_enroll_previous?: boolean };
  enqueuedAt: string;
}

const STORAGE_KEY = 'sms_students_offline_update_queue_v1';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readQueue = (): QueuedStudentUpdate[] => {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedStudentUpdate => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as QueuedStudentUpdate).id === 'string' &&
        typeof (item as QueuedStudentUpdate).studentId === 'number' &&
        typeof (item as QueuedStudentUpdate).data === 'object'
      );
    });
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedStudentUpdate[]) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage write failures
  }
};

export const getQueuedStudentUpdates = (): QueuedStudentUpdate[] => readQueue();

export const getQueuedStudentUpdateCount = (): number => getQueuedStudentUpdates().length;

export const enqueueStudentUpdate = (
  studentId: number,
  data: Partial<StudentFormData> & { re_enroll_previous?: boolean }
): QueuedStudentUpdate => {
  const queue = readQueue();
  const item: QueuedStudentUpdate = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    studentId,
    data,
    enqueuedAt: new Date().toISOString(),
  };

  const existingIndex = queue.findIndex((q) => q.studentId === studentId);
  if (existingIndex >= 0) {
    queue[existingIndex] = item;
  } else {
    queue.push(item);
  }

  writeQueue(queue);
  return item;
};

export const removeQueuedStudentUpdate = (id: string): void => {
  const queue = readQueue();
  writeQueue(queue.filter((item) => item.id !== id));
};
