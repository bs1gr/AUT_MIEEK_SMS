import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NOTE_SAVE_DELAY_MS, useStudentNotes } from '../useStudentNotes';
import { studentNotesAPI } from '@/api/studentNotesAPI';

vi.mock('@/api/studentNotesAPI', () => ({
  studentNotesAPI: { list: vi.fn(), save: vi.fn() },
}));

const api = studentNotesAPI as unknown as {
  list: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const legacyKeys = () =>
  Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key) =>
    key?.startsWith('student_notes_')
  );

describe('useStudentNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.list.mockResolvedValue({});
    api.save.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the notes the server holds for this account', async () => {
    api.list.mockResolvedValue({ 7: 'from the server' });

    const { result } = renderHook(() => useStudentNotes());

    await waitFor(() => expect(result.current.notesById[7]).toBe('from the server'));
    expect(api.save).not.toHaveBeenCalled();
  });

  it('saves on the server a moment after typing stops, and never in the browser', async () => {
    const { result } = renderHook(() => useStudentNotes());
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    vi.useFakeTimers();

    act(() => result.current.updateNote(7, 'a'));
    act(() => result.current.updateNote(7, 'ab'));
    expect(result.current.notesById[7]).toBe('ab'); // the field shows the text at once
    expect(api.save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTE_SAVE_DELAY_MS + 10);
    });

    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save).toHaveBeenCalledWith(7, 'ab');
    expect(legacyKeys()).toEqual([]);
  });

  it('flags a note that could not be saved and sends it again with the next change', async () => {
    const { result } = renderHook(() => useStudentNotes());
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    vi.useFakeTimers();
    api.save.mockRejectedValueOnce(new Error('offline'));

    act(() => result.current.updateNote(7, 'first'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTE_SAVE_DELAY_MS + 10);
    });
    expect(result.current.failedIds.has(7)).toBe(true);

    act(() => result.current.updateNote(7, 'first, then more'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTE_SAVE_DELAY_MS + 10);
    });

    expect(api.save).toHaveBeenLastCalledWith(7, 'first, then more');
    expect(result.current.failedIds.has(7)).toBe(false);
  });

  it('sends what was typed in the last moment when the page is left', async () => {
    const { result, unmount } = renderHook(() => useStudentNotes());
    await waitFor(() => expect(api.list).toHaveBeenCalled());

    act(() => result.current.updateNote(7, 'typed just before leaving'));
    unmount();

    expect(api.save).toHaveBeenCalledWith(7, 'typed just before leaving');
  });

  describe('notes left in the browser by earlier versions', () => {
    it('moves them to the server and removes them from the browser', async () => {
      localStorage.setItem('student_notes_7', 'old browser note');
      localStorage.setItem('student_notes_8', '   ');
      localStorage.setItem('theme', 'dark');

      const { result } = renderHook(() => useStudentNotes());

      await waitFor(() => expect(legacyKeys()).toEqual([]));
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith(7, 'old browser note');
      await waitFor(() => expect(result.current.notesById[7]).toBe('old browser note'));
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('adds the browser text below a note the server already has, without repeating it', async () => {
      api.list.mockResolvedValue({ 7: 'server note', 8: 'same text' });
      localStorage.setItem('student_notes_7', 'browser note');
      localStorage.setItem('student_notes_8', 'same text');

      const { result } = renderHook(() => useStudentNotes());

      await waitFor(() => expect(legacyKeys()).toEqual([]));
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.save).toHaveBeenCalledWith(7, 'server note\n\nbrowser note');
      await waitFor(() => expect(result.current.notesById[7]).toBe('server note\n\nbrowser note'));
      expect(result.current.notesById[8]).toBe('same text');
    });

    it('keeps a browser note that could not be sent, to try again next time', async () => {
      localStorage.setItem('student_notes_7', 'still here');
      api.save.mockRejectedValue({ response: { status: 500 } });

      renderHook(() => useStudentNotes());

      await waitFor(() => expect(api.save).toHaveBeenCalled());
      expect(localStorage.getItem('student_notes_7')).toBe('still here');
    });

    it('drops the browser note of a student who no longer exists', async () => {
      localStorage.setItem('student_notes_7', 'orphan');
      api.save.mockRejectedValue({ response: { status: 404 } });

      renderHook(() => useStudentNotes());

      await waitFor(() => expect(legacyKeys()).toEqual([]));
    });

    it('leaves them alone when the server cannot be reached at all', async () => {
      localStorage.setItem('student_notes_7', 'untouched');
      api.list.mockRejectedValue(new Error('offline'));

      renderHook(() => useStudentNotes());

      await waitFor(() => expect(api.list).toHaveBeenCalled());
      expect(api.save).not.toHaveBeenCalled();
      expect(localStorage.getItem('student_notes_7')).toBe('untouched');
    });
  });
});
