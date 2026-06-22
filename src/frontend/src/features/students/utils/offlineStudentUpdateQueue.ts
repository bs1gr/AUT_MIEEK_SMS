import type { StudentFormData } from '@/types';
import { getItem, setItem } from '@/utils/appStorage';

export interface QueuedStudentUpdate {
  id: string;
  studentId: number;
  data: Partial<StudentFormData> & { re_enroll_previous?: boolean };
  enqueuedAt: string;
}

const STORAGE_KEY = 'sms_students_offline_update_queue_v1';

const readQueue = (): QueuedStudentUpdate[] => {
  try {
    const raw = getItem(STORAGE_KEY);
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
  try {
    setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
};

export const getQueuedStudentUpdates = (): QueuedStudentUpdate[] => readQueue();

export const getQueuedStudentUpdateCount = (): number => getQueuedStudentUpdates().length;

export const enqueueStudentUpdate = (
  studentId: number,
  data: Partial<StudentFormData> & { re_enroll_previous?: boolean },
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
  writeQueue(readQueue().filter((item) => item.id !== id));
};
