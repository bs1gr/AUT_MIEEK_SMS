import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import type { LessonLog } from '@/types';
import {
  clearLessonLogQueue,
  enqueueLessonLog,
  getQueuedLessonLog,
  lessonLogKey,
} from '../../utils/lessonLogQueue';
import { LESSON_LOG_AUTOSAVE_MS, useLessonLogEditor } from '../useLessonLogEditor';

vi.mock('@/api/lessonLogsAPI', () => ({
  lessonLogsAPI: { list: vi.fn(), save: vi.fn() },
}));

const api = lessonLogsAPI as unknown as { list: Mock; save: Mock };

const page = (items: LessonLog[] = []) => ({ items, total: items.length, skip: 0, limit: 1, pages: 1, current_page: 1 });

const log = (overrides: Partial<LessonLog> = {}): LessonLog => ({
  id: 1,
  course_id: 7,
  date: '2026-11-12',
  period_number: 1,
  material_covered: null,
  teacher_notes: null,
  created_at: '2026-11-12T08:00:00Z',
  updated_at: '2026-11-12T08:00:00Z',
  ...overrides,
});

const params = { courseId: 7, date: '2026-11-12', periodNumber: 1 };
const key = lessonLogKey(7, '2026-11-12', 1);
const network = { code: 'ERR_NETWORK', message: 'Network Error' };

const mountReady = async (onSaved?: (saved: LessonLog) => void) => {
  const hook = renderHook(() => useLessonLogEditor({ ...params, onSaved }));
  await waitFor(() => expect(hook.result.current.loadState).toBe('ready'));
  return hook;
};

describe('useLessonLogEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLessonLogQueue();
    api.list.mockResolvedValue(page());
    api.save.mockImplementation(async (payload) => log({ material_covered: payload.material_covered ?? null }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading', () => {
    it('loads the stored text of the period', async () => {
      api.list.mockResolvedValue(page([log({ material_covered: 'Chapter 1', teacher_notes: 'Quiz next week' })]));

      const { result } = renderHook(() => useLessonLogEditor(params));
      expect(result.current.loadState).toBe('loading');
      await waitFor(() => expect(result.current.loadState).toBe('ready'));

      expect(result.current.material).toBe('Chapter 1');
      expect(result.current.notes).toBe('Quiz next week');
      expect(result.current.saveState).toBe('idle');
      expect(api.list).toHaveBeenCalledWith({ course_id: 7, date: '2026-11-12', period_number: 1, limit: 1 });
    });

    it('starts empty for a period nobody wrote about yet', async () => {
      const { result } = await mountReady();
      expect(result.current.material).toBe('');
      expect(result.current.notes).toBe('');
    });

    it('reports a refusal (read-only roles) so the page can hide the feature', async () => {
      api.list.mockRejectedValue({ response: { status: 403 } });
      const { result } = renderHook(() => useLessonLogEditor(params));
      await waitFor(() => expect(result.current.loadState).toBe('forbidden'));
    });

    it('can retry a load that failed', async () => {
      api.list.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(page([log({ teacher_notes: 'back' })]));
      const { result } = renderHook(() => useLessonLogEditor(params));
      await waitFor(() => expect(result.current.loadState).toBe('failed'));

      act(() => result.current.reload());
      expect(result.current.loadState).toBe('loading');
      await waitFor(() => expect(result.current.loadState).toBe('ready'));

      expect(result.current.notes).toBe('back');
    });

    it('shows text that is still queued from an offline session instead of the older server copy', async () => {
      enqueueLessonLog({ ...params, materialCovered: 'typed offline' });
      api.list.mockResolvedValue(page([log({ material_covered: 'server copy', teacher_notes: 'server notes' })]));

      const { result } = await mountReady();

      expect(result.current.material).toBe('typed offline');
      expect(result.current.notes).toBe('server notes'); // only the edited field is overridden
      expect(result.current.saveState).toBe('queued');
    });
  });

  describe('autosave', () => {
    it('saves only the field that changed, after the quiet period', async () => {
      const onSaved = vi.fn();
      const { result } = await mountReady(onSaved);
      vi.useFakeTimers();

      act(() => result.current.setMaterial('Chapter 2'));
      expect(result.current.saveState).toBe('dirty');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LESSON_LOG_AUTOSAVE_MS - 1);
      });
      expect(api.save).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith({
        course_id: 7,
        date: '2026-11-12',
        period_number: 1,
        material_covered: 'Chapter 2',
      });
      expect(result.current.saveState).toBe('saved');
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('keeps waiting while the teacher keeps typing', async () => {
      const { result } = await mountReady();
      vi.useFakeTimers();

      act(() => result.current.setMaterial('Cha'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      act(() => result.current.setMaterial('Chapter'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(api.save).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ material_covered: 'Chapter' }));
    });

    it('sends both fields in one request when both changed', async () => {
      const { result } = await mountReady();
      vi.useFakeTimers();

      act(() => {
        result.current.setMaterial('Chapter 2');
        result.current.setNotes('Ran out of time');
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LESSON_LOG_AUTOSAVE_MS);
      });

      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({ material_covered: 'Chapter 2', teacher_notes: 'Ran out of time' })
      );
    });

    it('can clear a field: an empty string is sent, not skipped', async () => {
      api.list.mockResolvedValue(page([log({ material_covered: 'old text' })]));
      const { result } = await mountReady();

      act(() => result.current.setMaterial(''));
      await act(async () => {
        await result.current.saveNow();
      });

      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ material_covered: '' }));
    });

    it('saves at once when asked to (blur) and then has nothing left to send', async () => {
      const { result } = await mountReady();

      act(() => result.current.setNotes('Quiz next week'));
      await act(async () => {
        await result.current.saveNow();
      });
      await act(async () => {
        await result.current.saveNow();
      });

      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ teacher_notes: 'Quiz next week' }));
      expect(result.current.saveState).toBe('saved');
    });

    it('sends nothing when nothing was typed', async () => {
      const { result } = await mountReady();
      await act(async () => {
        await result.current.saveNow();
      });
      expect(api.save).not.toHaveBeenCalled();
    });

    it('sends pending text when the editor goes away', async () => {
      const { result, unmount } = await mountReady();

      act(() => result.current.setMaterial('typed just before leaving'));
      unmount();

      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ material_covered: 'typed just before leaving' }));
    });

    it('sends pending text when the tab is hidden', async () => {
      const { result } = await mountReady();
      act(() => result.current.setMaterial('typed, then switched apps'));

      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      try {
        await act(async () => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
      } finally {
        delete (document as unknown as Record<string, unknown>).visibilityState;
      }

      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ material_covered: 'typed, then switched apps' }));
    });

    it('sends text typed during a save in a second request, after the first finishes', async () => {
      let finishFirst: (saved: LessonLog) => void = () => undefined;
      api.save.mockImplementationOnce(() => new Promise<LessonLog>((resolve) => (finishFirst = resolve)));
      const { result } = await mountReady();

      act(() => result.current.setMaterial('first'));
      let firstSave: Promise<void> = Promise.resolve();
      act(() => {
        firstSave = result.current.saveNow();
      });
      await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));

      act(() => result.current.setMaterial('first and more'));
      await act(async () => {
        await result.current.saveNow(); // while the first request is still in flight
      });
      expect(api.save).toHaveBeenCalledTimes(1); // never two requests at once

      await act(async () => {
        finishFirst(log({ material_covered: 'first' }));
        await firstSave;
      });

      expect(api.save).toHaveBeenCalledTimes(2);
      expect(api.save).toHaveBeenLastCalledWith(expect.objectContaining({ material_covered: 'first and more' }));
      expect(result.current.saveState).toBe('saved');
    });
  });

  describe('when saving fails', () => {
    it('queues the text on this device if the server is unreachable', async () => {
      api.save.mockRejectedValue(network);
      const { result } = await mountReady();

      act(() => result.current.setMaterial('typed during an outage'));
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.saveState).toBe('queued');
      expect(getQueuedLessonLog(key)).toMatchObject({ materialCovered: 'typed during an outage' });
      expect(result.current.material).toBe('typed during an outage'); // still on screen
    });

    it('queues the text when the server answers 503 DATABASE_UNAVAILABLE', async () => {
      api.save.mockRejectedValue({ response: { status: 503, data: { error: { code: 'DATABASE_UNAVAILABLE' } } } });
      const { result } = await mountReady();

      act(() => result.current.setNotes('db is down'));
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.saveState).toBe('queued');
      expect(getQueuedLessonLog(key)).toMatchObject({ teacherNotes: 'db is down' });
    });

    it('keeps the text pending after any other error, and the next save sends it again', async () => {
      api.save.mockRejectedValueOnce({ response: { status: 500 } });
      const { result } = await mountReady();

      act(() => result.current.setMaterial('worth keeping'));
      await act(async () => {
        await result.current.saveNow();
      });
      expect(result.current.saveState).toBe('error');
      expect(getQueuedLessonLog(key)).toBeUndefined();

      await act(async () => {
        await result.current.saveNow();
      });

      expect(api.save).toHaveBeenCalledTimes(2);
      expect(api.save.mock.calls[1][0]).toEqual(api.save.mock.calls[0][0]);
      expect(result.current.saveState).toBe('saved');
    });

    it('removes older queued text for a field before newer text for it is sent', async () => {
      enqueueLessonLog({ ...params, materialCovered: 'older, from an earlier outage' });
      api.save.mockImplementation(async () => {
        // by the time the request goes out, the stale queued copy must already be gone
        expect(getQueuedLessonLog(key)).toBeUndefined();
        return log();
      });
      const { result } = await mountReady();

      act(() => result.current.setMaterial('newer'));
      await act(async () => {
        await result.current.saveNow();
      });

      expect(api.save).toHaveBeenCalledTimes(1);
      expect(getQueuedLessonLog(key)).toBeUndefined();
    });
  });
});
