import type { ClassOverview } from '@/api/hooks/useAnalytics';
import {
  AttendanceBreakdownChart,
  AttendanceGradeScatter,
  CourseAveragesChart,
  GradeDistributionChart,
  type Translate,
} from './AnalyticsCharts';
import { AbsenceBadge, formatPercent } from './analyticsUi';

export interface AnalyticsClassViewProps {
  t: Translate;
  visibleCharts: Set<string>;
  overview: ClassOverview;
  onOpenStudent: (id: number) => void;
}

const CELL = 'px-3 py-2 text-sm text-slate-700';
const HEAD = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600';

const AnalyticsClassView = ({ t, visibleCharts, overview, onOpenStudent }: AnalyticsClassViewProps) => {
  const { courses, students, distribution } = overview;
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <p className="text-slate-600">{t('analytics.overview.noStudents')}</p>
      </div>
    );
  }

  const atRisk = students
    .filter((s) => s.at_risk)
    .sort((a, b) => b.failing_courses.length - a.failing_courses.length || a.name.localeCompare(b.name));
  const scatter = students
    .filter((s) => s.attendance_rate !== null && s.average_final_grade !== null)
    .map((s) => ({ name: s.name, attendance: s.attendance_rate as number, grade: s.average_final_grade as number }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {visibleCharts.has('courseComparison') && (
          <CourseAveragesChart
            data={courses.map((c) => ({
              course: c.course_code,
              average: c.average_final_grade,
              passing: c.passing,
              failing: c.failing,
            }))}
            title={t('analytics.overview.chartCourseAverages')}
            t={t}
          />
        )}
        {visibleCharts.has('gradeDistribution') && (
          <GradeDistributionChart data={distribution} title={t('analytics.overview.chartDistribution')} t={t} />
        )}
        {visibleCharts.has('scatter') && (
          <AttendanceGradeScatter data={scatter} title={t('analytics.overview.chartAttendanceVsGrade')} t={t} />
        )}
        {visibleCharts.has('attendance') && (
          <AttendanceBreakdownChart
            data={courses.map((c) => ({
              course: c.course_code,
              present: c.attendance.present,
              late: c.attendance.late,
              absent: c.attendance.absent,
              excused: c.attendance.excused,
            }))}
            title={t('analytics.overview.chartAttendance')}
            t={t}
          />
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="analytics-at-risk">
        <h3 className="px-6 pt-5 text-lg font-semibold text-slate-900">
          {t('analytics.overview.atRiskTitle', { count: atRisk.length })}
        </h3>
        <p className="px-6 text-sm text-slate-600">{t('analytics.overview.atRiskHelp')}</p>
        {atRisk.length === 0 ? (
          <p className="px-6 py-5 text-sm text-emerald-700">{t('analytics.overview.atRiskNone')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={HEAD}>{t('analytics.studentLabel')}</th>
                  <th className={HEAD}>{t('analytics.overview.averageFinalGrade')}</th>
                  <th className={HEAD}>{t('analytics.overview.failingCourses')}</th>
                  <th className={HEAD}>{t('analytics.overview.attendanceRate')}</th>
                  <th className={HEAD}>{t('analytics.overview.absenceLimit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atRisk.map((s) => (
                  <tr key={s.id}>
                    <td className={CELL}>
                      <button
                        type="button"
                        onClick={() => onOpenStudent(s.id)}
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        {s.name}
                      </button>
                      <div className="text-xs text-slate-600">
                        {[s.academic_year, s.class_division].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className={CELL}>{formatPercent(s.average_final_grade)}</td>
                    <td className={`${CELL} text-red-700`}>{s.failing_courses.join(', ') || '—'}</td>
                    <td className={CELL}>{formatPercent(s.attendance_rate)}</td>
                    <td className={CELL}>
                      <AbsenceBadge status={s.absence_status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200" data-testid="analytics-class-courses">
          <thead className="bg-slate-50">
            <tr>
              <th className={HEAD}>{t('analytics.courseLabel')}</th>
              <th className={HEAD}>{t('analytics.overview.students')}</th>
              <th className={HEAD}>{t('analytics.overview.averageFinalGrade')}</th>
              <th className={HEAD}>{t('analytics.overview.passFail')}</th>
              <th className={HEAD}>{t('analytics.overview.attendanceRate')}</th>
              <th className={HEAD}>{t('analytics.overview.absenceLimit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className={CELL}>
                  <div className="font-medium text-slate-900">{c.course_name}</div>
                  <div className="text-xs text-slate-600">{c.course_code}</div>
                </td>
                <td className={CELL}>
                  {c.students}
                  {c.graded < c.students && (
                    <span className="block text-xs text-slate-600">
                      {t('analytics.overview.gradedOf', { graded: c.graded, total: c.students })}
                    </span>
                  )}
                </td>
                <td className={`${CELL} font-semibold`}>{formatPercent(c.average_final_grade)}</td>
                <td className={CELL}>
                  <span className="text-emerald-700">{c.passing}</span>
                  {' / '}
                  <span className={c.failing > 0 ? 'text-red-700' : ''}>{c.failing}</span>
                </td>
                <td className={CELL}>{formatPercent(c.attendance_rate)}</td>
                <td className={CELL}>
                  {c.absence_insufficient > 0 || c.absence_warning > 0
                    ? t('analytics.overview.absenceCounts', {
                        over: c.absence_insufficient,
                        near: c.absence_warning,
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsClassView;
