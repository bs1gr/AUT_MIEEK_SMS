import type { StudentOverviewCourse } from '@/api/hooks/useAnalytics';
import {
  AttendanceBreakdownChart,
  CourseComparisonChart,
  GradeTimelineChart,
  PASS_MARK,
  type Translate,
} from './AnalyticsCharts';
import { AbsenceBadge, formatPercent } from './analyticsUi';

export interface AnalyticsStudentViewProps {
  t: Translate;
  formatDate: (date: string) => string;
  visibleCharts: Set<string>;
  /** Already narrowed to the chosen course, when there is one. */
  courses: StudentOverviewCourse[];
  singleCourse: boolean;
}

const CELL = 'px-3 py-2 text-sm text-slate-700';
const HEAD = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600';

const AnalyticsStudentView = ({ t, formatDate, visibleCharts, courses, singleCourse }: AnalyticsStudentViewProps) => {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center" data-testid="analytics-no-courses">
        <p className="text-slate-600">{t('analytics.overview.noEnrollments')}</p>
      </div>
    );
  }

  const comparison = courses.map((c) => ({
    course: c.course_code,
    finalGrade: c.final_grade,
    classAverage: c.class_average,
  }));
  const timeline = courses.map((c) => ({
    course: c.course_code,
    points: c.grades
      .filter((g) => g.date)
      .map((g) => ({ date: g.date as string, label: formatDate(g.date as string), percentage: g.percentage })),
  }));
  const attendance = courses.map((c) => ({
    course: c.course_code,
    present: c.attendance.present,
    late: c.attendance.late,
    absent: c.attendance.absent,
    excused: c.attendance.excused,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {visibleCharts.has('courseComparison') && (
          <CourseComparisonChart data={comparison} title={t('analytics.overview.chartFinalVsClass')} t={t} />
        )}
        {visibleCharts.has('gradeTimeline') && (
          <GradeTimelineChart series={timeline} title={t('analytics.overview.chartGradeTimeline')} t={t} />
        )}
        {visibleCharts.has('attendance') && (
          <AttendanceBreakdownChart data={attendance} title={t('analytics.overview.chartAttendance')} t={t} />
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200" data-testid="analytics-student-courses">
          <thead className="bg-slate-50">
            <tr>
              <th className={HEAD}>{t('analytics.courseLabel')}</th>
              <th className={HEAD}>{t('analytics.overview.finalGrade')}</th>
              <th className={HEAD}>{t('analytics.overview.classAverage')}</th>
              <th className={HEAD}>{t('analytics.overview.rank')}</th>
              <th className={HEAD}>{t('analytics.overview.attendanceRate')}</th>
              <th className={HEAD}>{t('analytics.overview.absences')}</th>
              <th className={HEAD}>{t('analytics.overview.absenceLimit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className={CELL}>
                  <div className="font-medium text-slate-900">{c.course_name}</div>
                  <div className="text-xs text-slate-600">
                    {t('analytics.overview.gradesRecorded', { count: c.grade_count })}
                    {c.grade_basis === 'average' && ` · ${t('analytics.overview.noRulesNote')}`}
                  </div>
                </td>
                <td className={`${CELL} font-semibold ${c.passing === false ? 'text-red-700' : 'text-slate-900'}`}>
                  {formatPercent(c.final_grade)}
                </td>
                <td className={CELL}>{formatPercent(c.class_average)}</td>
                <td className={CELL}>{c.rank ? t('analytics.overview.rankOf', { rank: c.rank, total: c.ranked_of }) : '—'}</td>
                <td className={CELL}>{formatPercent(c.attendance.rate)}</td>
                <td className={CELL}>
                  {c.absence.allowed_absences !== null && c.absence.allowed_absences !== undefined
                    ? t('analytics.overview.absencesOfAllowed', {
                        used: c.absence.absences ?? 0,
                        allowed: c.absence.allowed_absences,
                      })
                    : c.absence.absences ?? 0}
                </td>
                <td className={CELL}>
                  <AbsenceBadge status={c.absence.status} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {singleCourse && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <h3 className="px-6 pt-5 text-lg font-semibold text-slate-900">{t('analytics.overview.gradeList')}</h3>
          {courses[0].grades.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate-600">{t('analytics.overview.noGrades')}</p>
          ) : (
            <table className="mt-3 min-w-full divide-y divide-slate-200" data-testid="analytics-grade-list">
              <thead className="bg-slate-50">
                <tr>
                  <th className={HEAD}>{t('analytics.overview.date')}</th>
                  <th className={HEAD}>{t('analytics.overview.category')}</th>
                  <th className={HEAD}>{t('analytics.overview.assignment')}</th>
                  <th className={HEAD}>{t('analytics.overview.score')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses[0].grades.map((g, i) => (
                  <tr key={`${g.date}-${i}`}>
                    <td className={CELL}>{g.date ? formatDate(g.date) : '—'}</td>
                    <td className={CELL}>{g.category ?? '—'}</td>
                    <td className={CELL}>{g.assignment ?? '—'}</td>
                    <td className={`${CELL} ${g.percentage < PASS_MARK ? 'text-red-700' : ''}`}>{formatPercent(g.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsStudentView;
