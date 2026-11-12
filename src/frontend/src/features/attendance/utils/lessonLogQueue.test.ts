import { beforeEach, describe, expect, it } from 'vitest';
import { setItem } from '@/utils/appStorage';
import {
  clearLessonLogQueue,
  dequeueLessonLogFields,
  dequeueSentLessonLogText,
  enqueueLessonLog,
  getLessonLogQueue,
  getPendingLessonLogCount,
  getQueuedLessonLog,
  lessonLogKey,
  removeQueuedLessonLog,
} from './lessonLogQueue';

const period1 = { courseId: 7, date: '2026-11-12', periodNumber: 1 };
const key1 = lessonLogKey(7, '2026-11-12', 1);

describe('lessonLogQueue', () => {
  beforeEach(() => {
    clearLessonLogQueue();
  });

  it('keys an entry by course, date and period', () => {
    expect(key1).toBe('7|2026-11-12|1');
  });

  it('starts empty', () => {
    expect(getLessonLogQueue()).toEqual([]);
    expect(getPendingLessonLogCount()).toBe(0);
    expect(getQueuedLessonLog(key1)).toBeUndefined();
  });

  it('stores only the field that was edited', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'Chapter 1' });

    const entry = getQueuedLessonLog(key1);
    expect(entry).toMatchObject({ courseId: 7, date: '2026-11-12', periodNumber: 1, materialCovered: 'Chapter 1' });
    expect(entry).not.toHaveProperty('teacherNotes');
  });

  it('merges later edits of the same period into one entry, and the newer text wins', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'old' });
    enqueueLessonLog({ ...period1, teacherNotes: 'Quiz next week' });
    enqueueLessonLog({ ...period1, materialCovered: 'new' });

    expect(getPendingLessonLogCount()).toBe(1);
    expect(getQueuedLessonLog(key1)).toMatchObject({ materialCovered: 'new', teacherNotes: 'Quiz next week' });
  });

  it('keeps other periods, dates and courses apart', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'a' });
    enqueueLessonLog({ ...period1, periodNumber: 2, materialCovered: 'b' });
    enqueueLessonLog({ ...period1, date: '2026-11-13', materialCovered: 'c' });
    enqueueLessonLog({ ...period1, courseId: 8, materialCovered: 'd' });

    expect(getPendingLessonLogCount()).toBe(4);
  });

  it('can queue an empty string, because clearing a field is an edit too', () => {
    enqueueLessonLog({ ...period1, materialCovered: '' });
    expect(getQueuedLessonLog(key1)?.materialCovered).toBe('');
  });

  it('dropping fields keeps the rest, and removes the entry when nothing is left', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'a', teacherNotes: 'b' });

    dequeueLessonLogFields(key1, ['materialCovered']);
    expect(getQueuedLessonLog(key1)).toMatchObject({ teacherNotes: 'b' });
    expect(getQueuedLessonLog(key1)).not.toHaveProperty('materialCovered');

    dequeueLessonLogFields(key1, ['teacherNotes']);
    expect(getQueuedLessonLog(key1)).toBeUndefined();
    expect(getPendingLessonLogCount()).toBe(0);
  });

  it('a delivered field leaves the queue only if the queue still holds exactly that text', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'sent text', teacherNotes: 'typed afterwards' });

    dequeueSentLessonLogText(key1, { materialCovered: 'sent text', teacherNotes: 'what was sent earlier' });

    const entry = getQueuedLessonLog(key1);
    expect(entry).not.toHaveProperty('materialCovered');
    expect(entry?.teacherNotes).toBe('typed afterwards');
  });

  it('dropping from an entry that is not there does nothing', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'a' });
    dequeueLessonLogFields('9|2026-01-01|1', ['materialCovered']);
    dequeueSentLessonLogText('9|2026-01-01|1', { materialCovered: 'a' });
    expect(getPendingLessonLogCount()).toBe(1);
  });

  it('removes a whole entry', () => {
    enqueueLessonLog({ ...period1, materialCovered: 'a' });
    enqueueLessonLog({ ...period1, periodNumber: 2, materialCovered: 'b' });

    removeQueuedLessonLog(key1);

    expect(getLessonLogQueue().map((entry) => entry.periodNumber)).toEqual([2]);
  });

  it('survives corrupted storage and drops malformed entries', () => {
    setItem('sms_lesson_log_offline_queue_v1', '{not json');
    expect(getLessonLogQueue()).toEqual([]);

    setItem(
      'sms_lesson_log_offline_queue_v1',
      JSON.stringify([{ key: key1, courseId: 7, date: '2026-11-12', periodNumber: 1, materialCovered: 5 }, 'junk'])
    );
    expect(getLessonLogQueue()).toEqual([]);
  });
});
