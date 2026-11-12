/**
 * The two lesson-log textareas of one teaching period (material covered, teacher's notes) with
 * their save status. Shared by the Attendance page's lesson-log card and by the editable rows of
 * the lesson-log history. Mount it with a `key` of course|date|period: see useLessonLogEditor.
 */
import { useEffect } from 'react';
import { AlertTriangle, Check, CloudUpload, WifiOff } from 'lucide-react';
import type { LessonLog } from '@/types';
import {
  LESSON_LOG_MAX_CHARS,
  useLessonLogEditor,
  type LessonLogSaveState,
} from '../hooks/useLessonLogEditor';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LessonLogFieldsProps {
  t: Translate;
  courseId: number;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  /** Keeps element ids and test ids unique when several editors are on the page. */
  idPrefix: string;
  rows?: number;
  onSaved?: (log: LessonLog) => void;
  /** Called when the server refuses this user lesson logs altogether (read-only roles). */
  onForbidden?: () => void;
}

const STATUS: Record<Exclude<LessonLogSaveState, 'idle'>, { key: string; fallback: string; className: string }> = {
  dirty: { key: 'lessonLogStatusPending', fallback: 'Changes pending…', className: 'text-gray-600' },
  saving: { key: 'lessonLogStatusSaving', fallback: 'Saving…', className: 'text-blue-600' },
  saved: { key: 'lessonLogStatusSaved', fallback: 'Saved', className: 'text-green-700' },
  queued: {
    key: 'lessonLogStatusQueued',
    fallback: 'Saved on this device. It will be sent when the connection returns.',
    className: 'text-amber-700',
  },
  error: {
    key: 'lessonLogStatusError',
    fallback: 'Could not save. It will be retried on your next change.',
    className: 'text-red-600',
  },
};

const TEXTAREA_CLASS =
  'w-full min-h-[100px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 ' +
  'focus:outline-none disabled:bg-gray-50 disabled:text-gray-500';

const StatusIcon = ({ state }: { state: Exclude<LessonLogSaveState, 'idle'> }) => {
  switch (state) {
    case 'saved':
      return <Check size={14} aria-hidden="true" />;
    case 'queued':
      return <WifiOff size={14} aria-hidden="true" />;
    case 'error':
      return <AlertTriangle size={14} aria-hidden="true" />;
    case 'saving':
      return <CloudUpload size={14} className="animate-pulse" aria-hidden="true" />;
    default:
      return <CloudUpload size={14} aria-hidden="true" />;
  }
};

const LessonLogFields = ({
  t,
  courseId,
  date,
  periodNumber,
  idPrefix,
  rows = 4,
  onSaved,
  onForbidden,
}: LessonLogFieldsProps) => {
  const editor = useLessonLogEditor({ courseId, date, periodNumber, onSaved });
  const { loadState, saveState } = editor;

  useEffect(() => {
    if (loadState === 'forbidden') onForbidden?.();
  }, [loadState, onForbidden]);

  if (loadState === 'forbidden') return null;

  if (loadState === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-3" data-testid={`${idPrefix}-load-failed`}>
        <p className="text-sm text-red-600">{t('lessonLogLoadFailed') || 'The lesson log could not be loaded.'}</p>
        <button type="button" onClick={editor.reload} className="text-sm font-semibold text-indigo-700 underline">
          {t('lessonLogRetry') || 'Retry'}
        </button>
      </div>
    );
  }

  const loading = loadState === 'loading';
  const status = saveState === 'idle' ? null : STATUS[saveState];

  return (
    <div className="space-y-4" data-testid={`${idPrefix}-fields`}>
      <div>
        <label htmlFor={`${idPrefix}-material`} className="block text-sm font-semibold text-gray-700 mb-1">
          {t('lessonLogMaterialLabel') || 'Material covered'}
        </label>
        <textarea
          id={`${idPrefix}-material`}
          data-testid={`${idPrefix}-material`}
          className={TEXTAREA_CLASS}
          rows={rows}
          maxLength={LESSON_LOG_MAX_CHARS}
          disabled={loading}
          value={editor.material}
          placeholder={t('lessonLogMaterialPlaceholder') || 'What was taught in this period…'}
          onChange={(event) => editor.setMaterial(event.target.value)}
          onBlur={() => void editor.saveNow()}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-notes`} className="block text-sm font-semibold text-gray-700 mb-1">
          {t('lessonLogNotesLabel') || "Teacher's notes"}
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          data-testid={`${idPrefix}-notes`}
          className={TEXTAREA_CLASS}
          rows={rows}
          maxLength={LESSON_LOG_MAX_CHARS}
          disabled={loading}
          value={editor.notes}
          aria-describedby={`${idPrefix}-notes-hint`}
          placeholder={t('lessonLogNotesPlaceholder') || 'Your own notes about this period…'}
          onChange={(event) => editor.setNotes(event.target.value)}
          onBlur={() => void editor.saveNow()}
        />
        <p id={`${idPrefix}-notes-hint`} className="mt-1 text-xs text-gray-600">
          {t('lessonLogNotesHint') || 'Visible to teachers and administrators only.'}
        </p>
      </div>

      <div className="min-h-[1.25rem] text-xs" role="status" aria-live="polite" data-testid={`${idPrefix}-status`}>
        {loading ? (
          <span className="text-gray-600">{t('lessonLogStatusLoading') || 'Loading…'}</span>
        ) : status ? (
          <span className={`inline-flex items-center gap-1 font-medium ${status.className}`}>
            <StatusIcon state={saveState as Exclude<LessonLogSaveState, 'idle'>} />
            {t(status.key) || status.fallback}
            {saveState === 'error' && (
              <button type="button" onClick={() => void editor.saveNow()} className="ml-2 underline">
                {t('lessonLogRetry') || 'Retry'}
              </button>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default LessonLogFields;
