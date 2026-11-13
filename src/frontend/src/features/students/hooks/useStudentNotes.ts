/**
 * The signed-in account's notes about students: loaded from the server once, saved a moment after
 * typing stops.
 *
 * The notes used to be kept in this browser's localStorage (`student_notes_<id>`), unencrypted and
 * only on that device. On the first visit after the update each of those is sent to the server and
 * then removed from the browser, so nothing is left behind. If the account already has a note for
 * that student on the server, the browser's text is added below it rather than replacing it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { studentNotesAPI } from '@/api/studentNotesAPI';

const LEGACY_KEY = /^student_notes_(\d+)$/;
export const NOTE_SAVE_DELAY_MS = 800;

const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

/** The notes still sitting in this browser from before they were stored on the server. */
const readLegacyNotes = (): { key: string; studentId: number; text: string }[] => {
  const found: { key: string; studentId: number; text: string }[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      const match = key ? LEGACY_KEY.exec(key) : null;
      if (key && match) found.push({ key, studentId: Number(match[1]), text: localStorage.getItem(key) ?? '' });
    }
  } catch {
    // Storage is unavailable (private window, blocked): then there is nothing to move.
  }
  return found;
};

const removeLegacy = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do: the next visit tries again.
  }
};

export interface StudentNotes {
  notesById: Record<number, string>;
  /** Students whose latest text could not be saved; it is retried on the next change. */
  failedIds: ReadonlySet<number>;
  updateNote: (studentId: number, value: string) => void;
}

export function useStudentNotes(): StudentNotes {
  const [serverNotes, setServerNotes] = useState<Record<number, string>>({});
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [failedIds, setFailedIds] = useState<ReadonlySet<number>>(new Set());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<number, string>());
  const mounted = useRef(true);

  const markFailed = useCallback((studentId: number, failed: boolean) => {
    if (!mounted.current) return;
    setFailedIds((current) => {
      if (current.has(studentId) === failed) return current;
      const next = new Set(current);
      if (failed) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  }, []);

  const send = useCallback(
    async (studentId: number) => {
      const text = pending.current.get(studentId);
      if (text === undefined) return;
      pending.current.delete(studentId);
      try {
        await studentNotesAPI.save(studentId, text);
        markFailed(studentId, false);
      } catch {
        // Keep the text for the next attempt unless something newer is already waiting.
        if (!pending.current.has(studentId)) pending.current.set(studentId, text);
        markFailed(studentId, true);
      }
    },
    [markFailed]
  );

  useEffect(() => {
    mounted.current = true;
    let active = true;

    const moveLegacyNotes = async (onServer: Record<number, string>) => {
      for (const legacy of readLegacyNotes()) {
        const local = legacy.text.trim();
        if (!local) {
          removeLegacy(legacy.key);
          continue;
        }
        const existing = (onServer[legacy.studentId] ?? '').trim();
        const merged = !existing ? legacy.text : existing.includes(local) ? existing : `${existing}\n\n${legacy.text}`;
        try {
          if (merged !== existing) await studentNotesAPI.save(legacy.studentId, merged);
          removeLegacy(legacy.key);
          if (active) setServerNotes((current) => ({ ...current, [legacy.studentId]: merged }));
        } catch (error) {
          // The student no longer exists: the note has nowhere to go. Anything else: try next visit.
          if (httpStatus(error) === 404) removeLegacy(legacy.key);
        }
      }
    };

    void (async () => {
      try {
        const notes = await studentNotesAPI.list();
        if (!active) return;
        setServerNotes(notes);
        await moveLegacyNotes(notes);
      } catch {
        // Not allowed or offline: the page works without notes, and the browser copies stay put.
      }
    })();

    const timerMap = timers.current;
    const pendingMap = pending.current;
    return () => {
      active = false;
      mounted.current = false;
      // Leaving the page must not drop what was typed in the last moment.
      timerMap.forEach((timer) => clearTimeout(timer));
      timerMap.clear();
      pendingMap.forEach((text, studentId) => {
        void studentNotesAPI.save(studentId, text).catch(() => undefined);
      });
      pendingMap.clear();
    };
  }, []);

  const updateNote = useCallback(
    (studentId: number, value: string) => {
      setEdits((current) => ({ ...current, [studentId]: value }));
      pending.current.set(studentId, value);
      const existing = timers.current.get(studentId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        studentId,
        setTimeout(() => {
          timers.current.delete(studentId);
          void send(studentId);
        }, NOTE_SAVE_DELAY_MS)
      );
    },
    [send]
  );

  const notesById = useMemo(() => ({ ...serverNotes, ...edits }), [serverNotes, edits]);

  return { notesById, failedIds, updateNote };
}

export default useStudentNotes;
