/**
 * Editing state for the lesson log of ONE teaching period (course + date + period): the material
 * covered and the teacher's notes. The text loads once, saves by itself, and is never lost:
 *
 * - typing starts a 2 s quiet period (the same as the attendance autosave), blur saves at once;
 * - pending text is also sent when the editor unmounts or the tab is hidden;
 * - if the server or its database is unreachable the text goes to a local queue
 *   (`lessonLogQueue`) and is sent later by `useLessonLogQueueFlush`;
 * - any other failure keeps the text pending, so the next edit or blur retries it.
 *
 * The parameters must not change during the hook's life. Remount the component with a `key`
 * (course|date|period) instead: that flushes the old period and loads the new one.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import { isOfflineError } from '@/utils/databaseAvailability';
import type { LessonLog, LessonLogSavePayload } from '@/types';
import {
  dequeueLessonLogFields,
  enqueueLessonLog,
  getQueuedLessonLog,
  lessonLogKey,
  type LessonLogField,
  type LessonLogFieldValues,
} from '../utils/lessonLogQueue';

/** Quiet period before typing is saved; the Help says attendance "autosaves after 2 seconds". */
export const LESSON_LOG_AUTOSAVE_MS = 2000;
/** Same limit as the backend (MAX_LESSON_LOG_TEXT). */
export const LESSON_LOG_MAX_CHARS = 20000;

export type LessonLogLoadState = 'loading' | 'ready' | 'failed' | 'forbidden';
export type LessonLogSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'queued' | 'error';

const FIELDS: LessonLogField[] = ['materialCovered', 'teacherNotes'];

const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

export interface UseLessonLogEditorParams {
  courseId: number;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  /** Called with the server's copy after every successful save. */
  onSaved?: (log: LessonLog) => void;
  debounceMs?: number;
}

export interface LessonLogEditor {
  material: string;
  notes: string;
  setMaterial: (value: string) => void;
  setNotes: (value: string) => void;
  loadState: LessonLogLoadState;
  saveState: LessonLogSaveState;
  /** Save whatever is pending now (blur, Retry). */
  saveNow: () => Promise<void>;
  /** Try loading the existing text again after a failed load. */
  reload: () => void;
}

export function useLessonLogEditor({
  courseId,
  date,
  periodNumber,
  onSaved,
  debounceMs = LESSON_LOG_AUTOSAVE_MS,
}: UseLessonLogEditorParams): LessonLogEditor {
  const [material, setMaterialText] = useState('');
  const [notes, setNotesText] = useState('');
  const [loadState, setLoadState] = useState<LessonLogLoadState>('loading');
  const [saveState, setSaveState] = useState<LessonLogSaveState>('idle');
  const [reloadToken, setReloadToken] = useState(0);

  // What the save path reads lives in refs, so a save never works from a stale render.
  const values = useRef<Required<LessonLogFieldValues>>({ materialCovered: '', teacherNotes: '' });
  const dirty = useRef<Record<LessonLogField, boolean>>({ materialCovered: false, teacherNotes: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const mounted = useRef(false);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const key = lessonLogKey(courseId, date, periodNumber);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /** One attempt to send the fields that are pending. */
  const sendPending = useCallback(async (): Promise<'sent' | 'nothing' | 'failed'> => {
    const fields = FIELDS.filter((field) => dirty.current[field]);
    if (fields.length === 0) return 'nothing';

    const sent: LessonLogFieldValues = {};
    fields.forEach((field) => {
      sent[field] = values.current[field];
    });
    const payload: LessonLogSavePayload = { course_id: courseId, date, period_number: periodNumber };
    if (sent.materialCovered !== undefined) payload.material_covered = sent.materialCovered;
    if (sent.teacherNotes !== undefined) payload.teacher_notes = sent.teacherNotes;

    // Typing from here on makes the fields pending again. Text queued earlier for them is older
    // than what is being sent now and must not reach the server after it.
    fields.forEach((field) => {
      dirty.current[field] = false;
    });
    dequeueLessonLogFields(key, fields);

    if (mounted.current) setSaveState('saving');
    try {
      const saved = await lessonLogsAPI.save(payload);
      if (mounted.current) setSaveState(FIELDS.some((field) => dirty.current[field]) ? 'dirty' : 'saved');
      onSavedRef.current?.(saved);
      return 'sent';
    } catch (error) {
      if (isOfflineError(error)) {
        enqueueLessonLog({ courseId, date, periodNumber, ...sent });
        if (mounted.current) setSaveState('queued');
      } else {
        fields.forEach((field) => {
          dirty.current[field] = true;
        });
        if (mounted.current) setSaveState('error');
      }
      return 'failed';
    }
  }, [courseId, date, periodNumber, key]);

  const saveNow = useCallback(async (): Promise<void> => {
    clearTimer();
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    saving.current = true;
    try {
      // A save asked for while one was running always gets its own attempt afterwards, also when
      // that one failed. Otherwise the text typed during a slow or failed save stayed pending
      // with nothing left to send it (only the first few characters were saved or queued).
      do {
        saveAgain.current = false;
        await sendPending();
      } while (saveAgain.current);
    } finally {
      saving.current = false;
    }
  }, [clearTimer, sendPending]);

  const scheduleSave = useCallback(() => {
    setSaveState('dirty');
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveNow();
    }, debounceMs);
  }, [clearTimer, debounceMs, saveNow]);

  const setMaterial = useCallback(
    (value: string) => {
      values.current.materialCovered = value;
      dirty.current.materialCovered = true;
      setMaterialText(value);
      scheduleSave();
    },
    [scheduleSave]
  );

  const setNotes = useCallback(
    (value: string) => {
      values.current.teacherNotes = value;
      dirty.current.teacherNotes = true;
      setNotesText(value);
      scheduleSave();
    },
    [scheduleSave]
  );

  // Load the existing text. Text still queued for this period (typed while offline) is newer than
  // the server's copy, so it wins.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await lessonLogsAPI.list({
          course_id: courseId,
          date,
          period_number: periodNumber,
          limit: 1,
        });
        if (cancelled) return;
        const existing = page.items[0];
        const queued = getQueuedLessonLog(key);
        const loaded: Required<LessonLogFieldValues> = {
          materialCovered: queued?.materialCovered ?? existing?.material_covered ?? '',
          teacherNotes: queued?.teacherNotes ?? existing?.teacher_notes ?? '',
        };
        values.current = loaded;
        dirty.current = { materialCovered: false, teacherNotes: false };
        setMaterialText(loaded.materialCovered);
        setNotesText(loaded.teacherNotes);
        setSaveState(queued ? 'queued' : 'idle');
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        setLoadState(httpStatus(error) === 403 ? 'forbidden' : 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, date, periodNumber, key, reloadToken]);

  // Whatever is pending when the editor goes away, or its period changes, is still sent.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimer();
      void saveNow();
    };
  }, [clearTimer, saveNow]);

  // A hidden tab may never come back (a phone app is switched away), so send what is pending.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void saveNow();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [saveNow]);

  const reload = useCallback(() => {
    setLoadState('loading');
    setReloadToken((token) => token + 1);
  }, []);

  return { material, notes, setMaterial, setNotes, loadState, saveState, saveNow, reload };
}

export default useLessonLogEditor;
