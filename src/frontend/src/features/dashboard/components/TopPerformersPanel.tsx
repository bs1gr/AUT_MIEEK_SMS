import { useState } from 'react';
import { Award, Target } from 'lucide-react';
import { useClassOverview, type ClassOverview } from '@/api/hooks/useAnalytics';
import type { Translate } from './AnalyticsCharts';
import { formatPercent } from './analyticsUi';

type Student = ClassOverview['students'][number];
type Mode = 'final' | 'attendance' | 'exams';

const TOP = 5;
const MODES: { id: Mode; labelKey: string; value: (s: Student) => number | null }[] = [
  { id: 'final', labelKey: 'dashboard.topByFinalGrade', value: (s) => s.average_final_grade },
  { id: 'attendance', labelKey: 'dashboard.topByAttendance', value: (s) => s.attendance_rate },
  { id: 'exams', labelKey: 'dashboard.topByExams', value: (s) => s.exam_average },
];
const ROW_ACCENTS = ['border-amber-400 bg-amber-50', 'border-slate-300 bg-slate-50', 'border-orange-300 bg-orange-50'];

/** Top 5 active students by average final grade, attendance or exam average (GET /analytics/overview). */
export const rankStudents = (students: Student[], mode: Mode): Student[] => {
  const value = MODES.find((m) => m.id === mode)!.value;
  return students
    .filter((s) => value(s) !== null)
    .sort((a, b) => (value(b) as number) - (value(a) as number) || a.name.localeCompare(b.name))
    .slice(0, TOP);
};

const TopPerformersPanel = ({ t, onExportGrades }: { t: Translate; onExportGrades: () => void }) => {
  const [mode, setMode] = useState<Mode>('final');
  const { data, isLoading, isError } = useClassOverview({});
  const ranked = rankStudents(data?.students ?? [], mode);
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs" data-testid="top-performers">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Award size={22} className="text-amber-500" />
          <span>{t('topPerformingStudents')}</span>
        </h3>
        <button type="button" onClick={onExportGrades} className="export-referral-link">
          {t('exportGradesLink')}
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-600">{t('dashboard.topHelp')}</p>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              mode === m.id ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t(m.labelKey)}
          </button>
        ))}
      </div>

      {isError ? (
        <p className="text-sm text-red-700">{t('analytics.dashboardError')}</p>
      ) : isLoading ? (
        <p className="py-6 text-sm text-slate-600">{t('loadingStudentData')}</p>
      ) : ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600">
          <Target size={42} className="opacity-40" />
          <p>{t('dashboard.topNoData')}</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.map((s, index) => (
            <li key={s.id} className={`rounded-xl border-l-4 p-4 ${ROW_ACCENTS[index] ?? 'border-indigo-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {[s.academic_year, s.class_division].filter(Boolean).join(' · ')}
                    {' · '}
                    {t('dashboard.topCoursesCredits', { courses: s.courses, credits: s.credits })}
                  </p>
                  <p className="text-xs text-slate-700">
                    {t('dashboard.topSummary', {
                      final: formatPercent(s.average_final_grade),
                      attendance: formatPercent(s.attendance_rate),
                      exams: formatPercent(s.exam_average),
                    })}
                  </p>
                  {s.failing_courses.length > 0 && (
                    <p className="text-xs text-red-700">{t('dashboard.attentionFailing', { courses: s.failing_courses.join(', ') })}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap text-xl font-semibold text-indigo-700 sm:text-2xl">
                    {formatPercent(current.value(s))}
                  </p>
                  <p className="text-[11px] text-slate-600">{t(current.labelKey)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default TopPerformersPanel;
