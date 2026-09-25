/**
 * ΜΙΕΕΚ absence limit per enrolled student: absences (Absent + Excused) against 10% of the
 * semester's scheduled periods, or the extended limit (15%) when the Directorate approved it.
 * Going over marks attendance insufficient — shown as a warning only, nothing is blocked.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { attendanceAPI, enrollmentsAPI } from '@/api/api';
import type { AbsenceLimitStatus, Student } from '@/types';

export interface AbsenceLimitsPanelProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  courseId: number | '';
  students: Student[];
  /** Any value that changes after attendance is saved; triggers a reload. */
  refreshKey?: unknown;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const STATUS_ORDER: Record<AbsenceLimitStatus['status'], number> = { insufficient: 0, warning: 1, ok: 2, unknown: 3 };

const STATUS_BADGE: Record<AbsenceLimitStatus['status'], string> = {
  insufficient: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  unknown: 'bg-gray-100 text-gray-700 border-gray-300',
};

const STATUS_LABEL_KEY: Record<AbsenceLimitStatus['status'], string> = {
  insufficient: 'absenceLimitStatusInsufficient',
  warning: 'absenceLimitStatusWarning',
  ok: 'absenceLimitStatusOk',
  unknown: 'absenceLimitStatusUnknown',
};

const AbsenceLimitsPanel = ({ t, courseId, students, refreshKey, showToast }: AbsenceLimitsPanelProps) => {
  const [rows, setRows] = useState<AbsenceLimitStatus[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  // showToast is recreated on every parent render; keep it out of effect deps.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const load = useCallback(async (id: number) => {
    try {
      const data = await attendanceAPI.getCourseAbsenceStatus(id);
      setRows(data);
      setNotes(Object.fromEntries(data.map((r) => [r.student_id, r.extended_absence_note || ''])));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!courseId) {
      setRows([]);
      return;
    }
    void load(courseId);
  }, [courseId, refreshKey, load]);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    students.forEach((s) => map.set(s.id, `${s.last_name} ${s.first_name}`.trim()));
    return map;
  }, [students]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          (nameById.get(a.student_id) || '').localeCompare(nameById.get(b.student_id) || '')
      ),
    [rows, nameById]
  );

  const saveApproval = async (row: AbsenceLimitStatus, approved: boolean, note?: string) => {
    if (!courseId) return;
    setSavingStudentId(row.student_id);
    try {
      await enrollmentsAPI.setExtendedAbsenceApproval(courseId, row.student_id, approved, note);
      await load(courseId);
      toastRef.current(t('absenceLimitApprovalSaved'), 'success');
    } catch {
      toastRef.current(t('absenceLimitApprovalFailed'), 'error');
    } finally {
      setSavingStudentId(null);
    }
  };

  if (!courseId) return null;

  const insufficientCount = rows.filter((r) => r.attendance_insufficient).length;

  return (
    <div className="bg-white rounded-2xl shadow p-6" data-testid="absence-limits-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={20} className={insufficientCount > 0 ? 'text-red-600' : 'text-amber-600'} />
          {t('absenceLimitTitle')}
        </h3>
        {insufficientCount > 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded border bg-red-100 text-red-800 border-red-300">
            {t('absenceLimitStatusInsufficient')}: {insufficientCount}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">{t('absenceLimitHelp')}</p>

      {loadFailed ? (
        <p className="text-sm text-red-600">{t('absenceLimitLoadFailed')}</p>
      ) : sortedRows.length === 0 ? (
        <p className="text-sm text-gray-500">{t('absenceLimitNoStudents')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-3">{t('absenceLimitColumnStudent')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnAbsences')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnAllowed')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnStatus')}</th>
                <th className="py-2">{t('absenceLimitColumnApproval')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const busy = savingStudentId === row.student_id;
                return (
                  <tr key={row.student_id} className="border-b last:border-0 align-top" data-testid={`absence-limit-row-${row.student_id}`}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{nameById.get(row.student_id) || `#${row.student_id}`}</td>
                    <td className="py-2 pr-3">
                      {row.status === 'unknown' ? (
                        <span>{row.absences}</span>
                      ) : (
                        <span>
                          {t('absenceLimitSummary', {
                            absences: row.absences,
                            scheduled: row.scheduled_periods,
                            percent: row.absence_percent,
                          })}
                        </span>
                      )}
                      <div className="text-xs text-gray-500">
                        {t('absenceLimitExcusedBreakdown', { unexcused: row.unexcused_absences, excused: row.excused_absences })}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {row.allowed_absences === null ? (
                        <span className="text-xs text-gray-500">{t('absenceLimitUnknownHelp')}</span>
                      ) : (
                        <>
                          <span>{t('absenceLimitAllowed', { allowed: row.allowed_absences, limit: row.limit_percent })}</span>
                          <div className="text-xs text-gray-500">{t('absenceLimitRemaining', { count: row.remaining_absences ?? 0 })}</div>
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded border ${STATUS_BADGE[row.status]}`}>
                        {t(STATUS_LABEL_KEY[row.status])}
                      </span>
                    </td>
                    <td className="py-2">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={row.extended_approved}
                          disabled={busy}
                          onChange={(e) => void saveApproval(row, e.target.checked, notes[row.student_id])}
                          aria-label={`${t('absenceLimitColumnApproval')} (${row.extended_limit_percent}%)`}
                          className="w-4 h-4"
                        />
                        <span>{row.extended_limit_percent}%</span>
                      </label>
                      {row.extended_approved && (
                        <div className="mt-1 space-y-1">
                          {row.extended_absence_approved_at && (
                            <div className="text-xs text-gray-500">{t('absenceLimitApprovedOn', { date: row.extended_absence_approved_at })}</div>
                          )}
                          <input
                            type="text"
                            value={notes[row.student_id] ?? ''}
                            disabled={busy}
                            maxLength={1000}
                            placeholder={t('absenceLimitApprovalNote')}
                            aria-label={t('absenceLimitApprovalNote')}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [row.student_id]: e.target.value }))}
                            onBlur={() => {
                              const note = notes[row.student_id] ?? '';
                              if (note !== (row.extended_absence_note || '')) void saveApproval(row, true, note);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AbsenceLimitsPanel;
