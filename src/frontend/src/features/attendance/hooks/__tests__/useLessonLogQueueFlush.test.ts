import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import {
  clearLessonLogQueue,
  enqueueLessonLog,
  getPendingLessonLogCount,
  getQueuedLessonLog,
  lessonLogKey,
} from '../../utils/lessonLogQueue';
import { flushLessonLogQueue, useLessonLogQueueFlush } from '../useLessonLogQueueFlush';

vi.mock('@/api/lessonLogsAPI', () => ({
  lessonLogsAPI: { list: vi.fn(), save: vi.fn() },
}));

const api = lessonLogsAPI as unknown as { list: Mock; save: Mock };

const network = { code: 'ERR_NETWORK', message: 'Network Error' };
const first = { courseId: 7, date: '2026-11-12', periodNumber: 1 };
const second = { courseId: 8, date: '2026-11-13', periodNumber: 2 };

describe('flushLessonLogQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLessonLogQueue();
    api.save.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends every queued entry with only its edited fields, then empties the queue', async () => {
    enqueueLessonLog({ ...first, materialCovered: 'Chapter 1' });
    enqueueLessonLog({ ...second, teacherNotes: 'Quiz next week' });

    await flushLessonLogQueue();

    expect(api.save).toHaveBeenNthCalledWith(1, {
      course_id: 7,
      date: '2026-11-12',
      period_number: 1,
      material_covered: 'Chapter 1',
    });
    expect(api.save).toHaveBeenNthCalledWith(2, {
      course_id: 8,
      date: '2026-11-13',
      period_number: 2,
      teacher_notes: 'Quiz next week',
    });
    expect(getPendingLessonLogCount()).toBe(0);
  });

  it('stops at the first unreachable-server failure and keeps everything that is left', async () => {
    enqueueLessonLog({ ...first, materialCovered: 'a' });
    enqueueLessonLog({ ...second, materialCovered: 'b' });
    api.save.mockRejectedValueOnce(network);

    await flushLessonLogQueue();

    expect(api.save).toHaveBeenCalledTimes(1);
    expect(getPendingLessonLogCount()).toBe(2);
  });

  it.each([401, 403, 408, 429, 500, 502])('keeps text that failed with HTTP %i for a later attempt', async (status) => {
    enqueueLessonLog({ ...first, materialCovered: 'a' });
    api.save.mockRejectedValueOnce({ response: { status } });

    await flushLessonLogQueue();

    expect(getPendingLessonLogCount()).toBe(1);
  });

  it('drops text the server rejects for good and carries on with the rest', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    enqueueLessonLog({ ...first, materialCovered: 'course was deleted' });
    enqueueLessonLog({ ...second, materialCovered: 'fine' });
    api.save.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({});

    await flushLessonLogQueue();

    expect(api.save).toHaveBeenCalledTimes(2);
    expect(getPendingLessonLogCount()).toBe(0);
  });

  it('keeps text that was typed while an earlier version was being sent', async () => {
    enqueueLessonLog({ ...first, materialCovered: 'sent text' });
    api.save.mockImplementationOnce(async () => {
      enqueueLessonLog({ ...first, materialCovered: 'typed meanwhile' });
      return {};
    });

    await flushLessonLogQueue();

    expect(getQueuedLessonLog(lessonLogKey(7, '2026-11-12', 1))).toMatchObject({ materialCovered: 'typed meanwhile' });
  });

  it('never runs two flushes at once', async () => {
    enqueueLessonLog({ ...first, materialCovered: 'a' });
    let release: (value: unknown) => void = () => undefined;
    api.save.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));

    const running = flushLessonLogQueue();
    await flushLessonLogQueue(); // returns straight away: one is already in progress
    expect(api.save).toHaveBeenCalledTimes(1);

    release({});
    await running;
    expect(getPendingLessonLogCount()).toBe(0);
  });
});

describe('useLessonLogQueueFlush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLessonLogQueue();
    api.save.mockResolvedValue({});
  });

  it('sends queued text as soon as the page opens', async () => {
    enqueueLessonLog({ ...first, teacherNotes: 'typed last week, offline' });

    renderHook(() => useLessonLogQueueFlush());

    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getPendingLessonLogCount()).toBe(0));
  });

  it('does nothing when there is nothing queued', async () => {
    renderHook(() => useLessonLogQueueFlush());
    await Promise.resolve();
    expect(api.save).not.toHaveBeenCalled();
  });
});
