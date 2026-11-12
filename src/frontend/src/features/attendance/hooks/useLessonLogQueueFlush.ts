import { useCallback } from 'react';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import { useQueueFlushTriggers } from '@/hooks/useQueueFlushTriggers';
import { isOfflineError } from '@/utils/databaseAvailability';
import type { LessonLogSavePayload } from '@/types';
import {
  dequeueSentLessonLogText,
  getLessonLogQueue,
  getQueuedLessonLog,
  removeQueuedLessonLog,
} from '../utils/lessonLogQueue';

/** A failure a later attempt can fix, as opposed to text the server will never accept. */
const isTemporaryError = (error: unknown): boolean => {
  if (isOfflineError(error)) return true;
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === undefined) return true;
  return status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
};

let flushing = false;

/**
 * Send the lesson-log text that was queued while the server was unreachable. It stops at the
 * first temporary failure and keeps everything that is left for the next trigger; text the
 * server rejects for good (the course was deleted, the text is invalid) is dropped, because
 * retrying it forever would help nobody.
 */
export async function flushLessonLogQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (const { key } of getLessonLogQueue()) {
      // Read it again: the editor may have replaced or removed this entry since the loop began.
      const entry = getQueuedLessonLog(key);
      if (!entry) continue;

      const payload: LessonLogSavePayload = {
        course_id: entry.courseId,
        date: entry.date,
        period_number: entry.periodNumber,
      };
      if (entry.materialCovered !== undefined) payload.material_covered = entry.materialCovered;
      if (entry.teacherNotes !== undefined) payload.teacher_notes = entry.teacherNotes;

      try {
        await lessonLogsAPI.save(payload);
        dequeueSentLessonLogText(key, {
          materialCovered: entry.materialCovered,
          teacherNotes: entry.teacherNotes,
        });
      } catch (error) {
        if (isTemporaryError(error)) return;
        console.warn('Dropping queued lesson log text the server rejected', key, error);
        removeQueuedLessonLog(key);
      }
    }
  } finally {
    flushing = false;
  }
}

/** Keeps trying to send queued lesson-log text while the Attendance page is open. */
export function useLessonLogQueueFlush(): void {
  const flush = useCallback(async () => {
    if (getLessonLogQueue().length === 0) return;
    await flushLessonLogQueue();
  }, []);

  useQueueFlushTriggers(flush);
}
