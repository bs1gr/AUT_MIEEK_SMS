/**
 * ΜΙΕΕΚ absence rules per enrolled student: absences (Absent + Excused) against the semester's
 * scheduled periods. Over the Class Participation limit (10%) the Class Participation share
 * counts as 0; over the fail limit (30%) attendance is insufficient and the course is failed.
 * Shown as flags only: nothing is blocked.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { attendanceAPI } from '@/api/api';
import type { AbsenceLimitStatus, Student } from '@/types';

export interface AbsenceLimitsPanelProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  courseId: number | '';
  students: Student[];
  /** Any value that changes after attendance is saved; triggers a reload. */
  refreshKey?: unknown;
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

const AbsenceLimitsPanel = ({ t, courseId, students, refreshKey }: AbsenceLimitsPanelProps) => {
  const [rows, setRows] = useState<AbsenceLimitStatus[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (id: number) => {
    try {
      setRows(await attendanceAPI.getCourseAbsenceStatus(id));
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
          Number(b.participation_forfeited) - Number(a.participation_forfeited) ||
          (nameById.get(a.student_id) || '').localeCompare(nameById.get(b.student_id) || '')
      ),
    [rows, nameById]
  );

  if (!courseId) return null;

  const insufficientCount = rows.filter((r) => r.attendance_insufficient).length;
  const forfeitedCount = rows.filter((r) => r.participation_forfeited).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="absence-limits-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={20} className={insufficientCount > 0 ? 'text-red-600' : 'text-amber-600'} />
          {t('absenceLimitTitle')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {forfeitedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded border bg-amber-100 text-amber-800 border-amber-300">
              {t('absenceLimitColumnParticipation')}: {forfeitedCount}
            </span>
          )}
          {insufficientCount > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded border bg-red-100 text-red-800 border-red-300">
              {t('absenceLimitStatusInsufficient')}: {insufficientCount}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mb-4">{t('absenceLimitHelp')}</p>

      {loadFailed ? (
        <p className="text-sm text-red-600">{t('absenceLimitLoadFailed')}</p>
      ) : sortedRows.length === 0 ? (
        <p className="text-sm text-gray-600">{t('absenceLimitNoStudents')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600 border-b">
                <th className="py-2 pr-3">{t('absenceLimitColumnStudent')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnAbsences')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnParticipation')}</th>
                <th className="py-2 pr-3">{t('absenceLimitColumnAllowed')}</th>
                <th className="py-2">{t('absenceLimitColumnStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
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
                    <div className="text-xs text-gray-600">
                      {t('absenceLimitExcusedBreakdown', { unexcused: row.unexcused_absences, excused: row.excused_absences })}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {row.participation_allowed_absences === null ? (
                      <span className="text-xs text-gray-600">—</span>
                    ) : row.participation_forfeited ? (
                      <span className="text-xs font-semibold text-amber-800">
                        {t('absenceLimitParticipationLost', { allowed: row.participation_allowed_absences })}
                      </span>
                    ) : (
                      <span className="text-xs text-green-800">
                        {t('absenceLimitParticipationKept', { allowed: row.participation_allowed_absences })}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {row.allowed_absences === null ? (
                      <span className="text-xs text-gray-600">{t('absenceLimitUnknownHelp')}</span>
                    ) : (
                      <>
                        <span>{t('absenceLimitAllowed', { allowed: row.allowed_absences, limit: row.limit_percent })}</span>
                        <div className="text-xs text-gray-600">{t('absenceLimitRemaining', { count: row.remaining_absences ?? 0 })}</div>
                      </>
                    )}
                  </td>
                  <td className="py-2">
                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded border ${STATUS_BADGE[row.status]}`}>
                      {t(STATUS_LABEL_KEY[row.status])}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AbsenceLimitsPanel;
