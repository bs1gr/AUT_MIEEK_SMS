import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import type { ScheduleChangePreview, ScheduleChangeTotals } from '@/api/api';
// The check whether to show this dialog is scheduleChangeNeedsWarning (utils/scheduleChange).

/**
 * Before a Teaching Schedule is saved that changes the absence limits (plan todo 69).
 *
 * A course's absence total is its periods per week times the semester's weeks, for the whole
 * semester, past weeks included: going from 2 to 3 periods raises it from 28 to 42, and going
 * down can push students over the fail (30 %) or the Class Participation (10 %) limit. Nothing
 * showed that before a save. This dialog shows the totals before and after, and the students
 * whose status or participation share would change, with Save and Back.
 *
 * When the periods per week change in a course that has been taught (plan todo 71, the owner's
 * choice), it asks from when: "from week N on" keeps the weeks before N at the count they were
 * taught with (N is the week today is in, counted from the first recorded lesson); "it was
 * wrong from the start" counts the whole semester at the new number. Each answer asks the
 * server again, so the totals and the students shown are those the save would give.
 */

type Props = {
  preview: ScheduleChangePreview;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** The week the new periods apply from, or null for a correction of the whole semester. */
  fromWeek: number | null;
  onFromWeekChange: (week: number | null) => void;
  /** True while the server is asked again for another answer. */
  checking: boolean;
};

const STATUS_KEYS: Record<string, string> = {
  ok: 'attendance.absenceLimitStatusOk',
  warning: 'attendance.absenceLimitStatusWarning',
  insufficient: 'attendance.absenceLimitStatusInsufficient',
  unknown: 'attendance.absenceLimitStatusUnknown',
};

const number = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
};

const ScheduleChangeDialog: React.FC<Props> = ({
  preview,
  saving,
  onConfirm,
  onCancel,
  fromWeek,
  onFromWeekChange,
  checking,
}) => {
  const { t } = useLanguage();
  const text = (key: string, options?: Record<string, unknown>) => t(`courses.scheduleChange.${key}`, options);
  const status = (value: string) => t(STATUS_KEYS[value] ?? STATUS_KEYS.unknown);
  const share = (lost: boolean) => text(lost ? 'shareLost' : 'shareKept');
  const weeks = preview.semester_weeks || 14;
  const asksWhen = preview.periods_change && preview.has_attendance;
  const [weekText, setWeekText] = useState(String(fromWeek ?? preview.suggested_from_week ?? 1));
  const [lastWeek, setLastWeek] = useState<number>(fromWeek ?? preview.suggested_from_week ?? 1);
  const busy = saving || checking;

  const onWeekText = (value: string) => {
    setWeekText(value);
    const week = Number(value);
    if (Number.isInteger(week) && week >= 1 && week <= weeks) {
      setLastWeek(week);
      onFromWeekChange(week);
    }
  };
  const weekValid = (() => {
    const week = Number(weekText);
    return Number.isInteger(week) && week >= 1 && week <= weeks;
  })();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const rows: Array<[string, keyof ScheduleChangeTotals]> = [
    ['periods', 'periods_per_week'],
    ['total', 'scheduled_periods'],
    ['allowed', 'allowed_absences'],
    ['participation', 'participation_allowed_absences'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-change-title"
        data-testid="schedule-change-dialog"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100"
      >
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle size={24} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <h3 id="schedule-change-title" className="text-lg font-bold">{text('title')}</h3>
        </div>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">{text('intro')}</p>

        {asksWhen && (
          <fieldset
            className="mb-4 space-y-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
            data-testid="schedule-change-when"
          >
            <legend className="px-1 font-semibold">{text('whenTitle')}</legend>
            <label className="flex flex-wrap items-center gap-2">
              <input
                type="radio"
                name="schedule-change-when"
                checked={fromWeek !== null}
                onChange={() => onFromWeekChange(lastWeek)}
                disabled={saving}
                data-testid="schedule-change-from-week"
              />
              <span>{text('fromWeek')}</span>
              <input
                type="number"
                min={1}
                max={weeks}
                value={weekText}
                onChange={(event) => onWeekText(event.target.value)}
                onFocus={() => { if (fromWeek === null) onFromWeekChange(lastWeek); }}
                disabled={saving}
                aria-label={text('weekLabel', { weeks })}
                aria-invalid={!weekValid}
                data-testid="schedule-change-week"
                className="w-16 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
              />
              <span className="w-full text-xs text-gray-600 dark:text-gray-400">{text('fromWeekHelp', { weeks })}</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="schedule-change-when"
                checked={fromWeek === null}
                onChange={() => onFromWeekChange(null)}
                disabled={saving}
                className="mt-1"
                data-testid="schedule-change-correction"
              />
              <span>{text('correction')}</span>
            </label>
            {checking && <p className="text-xs text-gray-600 dark:text-gray-400">{text('checking')}</p>}
          </fieldset>
        )}

        <table className="mb-4 w-full text-sm" data-testid="schedule-change-totals">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(([label, field]) => (
              <tr key={field} data-testid={`schedule-change-${field}`}>
                <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{text(label)}</td>
                <td className="py-1.5 text-right font-semibold whitespace-nowrap">
                  {number(preview.before[field])} → {number(preview.after[field])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!preview.has_attendance ? (
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400" data-testid="schedule-change-no-attendance">{text('noAttendanceYet')}</p>
        ) : preview.changes.length === 0 ? (
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400" data-testid="schedule-change-none">{text('noStudentChanges')}</p>
        ) : (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-semibold">{text('studentsTitle')}</h4>
            <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm" data-testid="schedule-change-students">
              {preview.changes.map((change) => (
                <li
                  key={change.student_id}
                  data-testid={`schedule-change-student-${change.student_id}`}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40"
                >
                  <div className="font-medium">
                    {change.student_name || `#${change.student_id}`}{' '}
                    <span className="font-normal text-gray-600 dark:text-gray-400">({text('absences', { count: change.absences })})</span>
                  </div>
                  {change.status_before !== change.status_after && (
                    <div>{status(change.status_before)} → {status(change.status_after)}</div>
                  )}
                  {change.participation_forfeited_before !== change.participation_forfeited_after && (
                    <div>{share(change.participation_forfeited_before)} → {share(change.participation_forfeited_after)}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            autoFocus
            data-testid="schedule-change-cancel"
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {text('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || (asksWhen && fromWeek !== null && !weekValid)}
            data-testid="schedule-change-save"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {text('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleChangeDialog;
