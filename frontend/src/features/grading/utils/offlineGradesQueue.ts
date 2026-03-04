import type { Grade } from '@/types';

export interface QueuedGradeMutation {
  id: string;
  op: 'create' | 'update';
  gradeId?: number;
  payload: Omit<Grade, 'id'>;
  enqueuedAt: string;
}

const STORAGE_KEY = 'sms_grades_offline_queue_v1';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readQueue = (): QueuedGradeMutation[] => {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedGradeMutation => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as QueuedGradeMutation).id === 'string' &&
        ((item as QueuedGradeMutation).op === 'create' || (item as QueuedGradeMutation).op === 'update') &&
        typeof (item as QueuedGradeMutation).payload === 'object'
      );
    });
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedGradeMutation[]) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage write errors; app can still behave online-only
  }
};

export const getQueuedGradeMutations = (): QueuedGradeMutation[] => readQueue();

export const getQueuedGradeMutationCount = (): number => getQueuedGradeMutations().length;

export const enqueueGradeMutation = (input: Omit<QueuedGradeMutation, 'id' | 'enqueuedAt'>): QueuedGradeMutation => {
  const queue = readQueue();
  const item: QueuedGradeMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    op: input.op,
    gradeId: input.gradeId,
    payload: input.payload,
    enqueuedAt: new Date().toISOString(),
  };

  if (item.op === 'update' && item.gradeId) {
    const idx = queue.findIndex((q) => q.op === 'update' && q.gradeId === item.gradeId);
    if (idx >= 0) {
      queue[idx] = item;
      writeQueue(queue);
      return item;
    }
  }

  queue.push(item);
  writeQueue(queue);
  return item;
};

export const removeQueuedGradeMutation = (id: string): void => {
  const queue = readQueue();
  writeQueue(queue.filter((item) => item.id !== id));
};
