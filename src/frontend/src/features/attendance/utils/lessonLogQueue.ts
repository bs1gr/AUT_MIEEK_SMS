/**
 * Lesson-log text that could not be sent because the server (or its database) was unreachable.
 * It stays on this device and is sent later by `useLessonLogQueueFlush`, so a teacher who typed a
 * paragraph during an outage does not lose it. One entry per course, date and period; a field is
 * present only if it was edited while offline, so the other field is never overwritten.
 */
import { getItem, setItem } from '@/utils/appStorage';

export interface LessonLogFieldValues {
  materialCovered?: string;
  teacherNotes?: string;
}

export interface QueuedLessonLog extends LessonLogFieldValues {
  key: string;
  courseId: number;
  date: string;
  periodNumber: number;
  enqueuedAt: string;
}

export type LessonLogField = keyof LessonLogFieldValues;

const STORAGE_KEY = 'sms_lesson_log_offline_queue_v1';

export const lessonLogKey = (courseId: number, date: string, periodNumber: number): string =>
  `${courseId}|${date}|${periodNumber}`;

const isQueuedLessonLog = (item: unknown): item is QueuedLessonLog => {
  if (typeof item !== 'object' || item === null) return false;
  const entry = item as QueuedLessonLog;
  return (
    typeof entry.key === 'string' &&
    typeof entry.courseId === 'number' &&
    typeof entry.date === 'string' &&
    typeof entry.periodNumber === 'number' &&
    (entry.materialCovered === undefined || typeof entry.materialCovered === 'string') &&
    (entry.teacherNotes === undefined || typeof entry.teacherNotes === 'string')
  );
};

const parseQueue = (raw: string | null): QueuedLessonLog[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isQueuedLessonLog) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedLessonLog[]): void => {
  try {
    setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: the app keeps working online-only.
  }
};

export const getLessonLogQueue = (): QueuedLessonLog[] => parseQueue(getItem(STORAGE_KEY));

export const getPendingLessonLogCount = (): number => getLessonLogQueue().length;

export const getQueuedLessonLog = (key: string): QueuedLessonLog | undefined =>
  getLessonLogQueue().find((entry) => entry.key === key);

/** Queue unsent text. Fields merge into the period's existing entry; the newer text wins. */
export const enqueueLessonLog = (
  input: { courseId: number; date: string; periodNumber: number } & LessonLogFieldValues
): void => {
  const key = lessonLogKey(input.courseId, input.date, input.periodNumber);
  const queue = getLessonLogQueue();
  const existing = queue.find((entry) => entry.key === key);
  const merged: QueuedLessonLog = {
    ...existing,
    key,
    courseId: input.courseId,
    date: input.date,
    periodNumber: input.periodNumber,
    enqueuedAt: new Date().toISOString(),
  };
  if (input.materialCovered !== undefined) merged.materialCovered = input.materialCovered;
  if (input.teacherNotes !== undefined) merged.teacherNotes = input.teacherNotes;
  writeQueue(existing ? queue.map((entry) => (entry.key === key ? merged : entry)) : [...queue, merged]);
};

const withoutFields = (
  entry: QueuedLessonLog,
  shouldDrop: (field: LessonLogField) => boolean
): QueuedLessonLog | null => {
  const next: QueuedLessonLog = { ...entry };
  if (shouldDrop('materialCovered')) delete next.materialCovered;
  if (shouldDrop('teacherNotes')) delete next.teacherNotes;
  return next.materialCovered === undefined && next.teacherNotes === undefined ? null : next;
};

const rewriteEntry = (key: string, update: (entry: QueuedLessonLog) => QueuedLessonLog | null): void => {
  const queue = getLessonLogQueue();
  if (!queue.some((entry) => entry.key === key)) return;
  writeQueue(
    queue.flatMap((entry) => {
      if (entry.key !== key) return [entry];
      const next = update(entry);
      return next ? [next] : [];
    })
  );
};

/** Drop fields from a period's queued entry because newer text is about to be sent online. */
export const dequeueLessonLogFields = (key: string, fields: LessonLogField[]): void => {
  rewriteEntry(key, (entry) => withoutFields(entry, (field) => fields.includes(field)));
};

/** Drop fields that were just delivered, but only if the queue still holds exactly that text. */
export const dequeueSentLessonLogText = (key: string, sent: LessonLogFieldValues): void => {
  rewriteEntry(key, (entry) =>
    withoutFields(entry, (field) => sent[field] !== undefined && entry[field] === sent[field])
  );
};

export const removeQueuedLessonLog = (key: string): void => {
  writeQueue(getLessonLogQueue().filter((entry) => entry.key !== key));
};

export const clearLessonLogQueue = (): void => {
  writeQueue([]);
};
