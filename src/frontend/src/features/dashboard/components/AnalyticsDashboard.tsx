import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, Calendar, Download, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import { useClassOverview, useStudentOverview } from '@/api/hooks/useAnalytics';
import { useAnalyticsExport } from '../hooks/useAnalyticsExport';
import { useDashboards, type Dashboard } from '../hooks/useDashboards';
import AnalyticsFilterBar, { type AnalyticsViewMode } from './AnalyticsFilterBar';
import AnalyticsClassView from './AnalyticsClassView';
import AnalyticsStudentView from './AnalyticsStudentView';
import { PASS_MARK } from './AnalyticsCharts';
import { SummaryCard, absenceStatusLabel, formatPercent, resolveVisibleCharts } from './analyticsUi';

/**
 * Analytics page. Every number comes from GET /analytics/overview (class view) or
 * GET /analytics/student/{id}/overview (student view): course final grades from the
 * evaluation rules, attendance with Present + Late as attended, and the ΜΙΕΕΚ absence limit.
 */
export const AnalyticsDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatDate } = useDateTimeFormatter();
  const { exportPDF, exportExcel, isExporting, exportError } = useAnalyticsExport();
  const { dashboards, defaultDashboard } = useDashboards();

  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('student');
  const [academicYear, setAcademicYear] = useState('');
  const [division, setDivision] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);

  // The selection without a course: it lists the students and courses to choose from.
  const selection = useClassOverview({ academicYear, classDivision: division });
  const classOverview = useClassOverview({
    academicYear,
    classDivision: division,
    courseId: viewMode === 'class' ? courseId : null,
  });
  const selectionStudents = useMemo(() => selection.data?.students ?? [], [selection.data]);

  // Student view: the chosen student while they are in the selection, else its first student.
  const effectiveStudentId = useMemo(() => {
    if (studentId && selectionStudents.some((s) => s.id === studentId)) return studentId;
    return selectionStudents[0]?.id ?? null;
  }, [studentId, selectionStudents]);
  const studentOverview = useStudentOverview(viewMode === 'student' ? effectiveStudentId : null);

  const courseOptions = useMemo(() => {
    const source = viewMode === 'student' ? studentOverview.data?.courses ?? [] : selection.data?.courses ?? [];
    return source.map((c) => ({ id: c.id, label: c.course_name }));
  }, [viewMode, studentOverview.data, selection.data]);
  // A course that is not in the current list (another student's, another class's) means "all".
  const effectiveCourseId = courseId && courseOptions.some((c) => c.id === courseId) ? courseId : null;

  const studentCourses = useMemo(() => {
    const all = studentOverview.data?.courses ?? [];
    return effectiveCourseId ? all.filter((c) => c.id === effectiveCourseId) : all;
  }, [studentOverview.data, effectiveCourseId]);

  const activeDashboard = selectedDashboardId ? dashboards.find((d: Dashboard) => d.id === selectedDashboardId) : defaultDashboard;
  const visibleCharts = useMemo(
    () => resolveVisibleCharts(activeDashboard?.configuration?.charts as string[] | undefined),
    [activeDashboard]
  );

  const changeViewMode = (mode: AnalyticsViewMode) => {
    setViewMode(mode);
    setCourseId(null);
  };
  const changeYear = (year: string) => {
    setAcademicYear(year);
    setDivision('');
    setCourseId(null);
  };
  const openStudent = (id: number) => {
    setViewMode('student');
    setStudentId(id);
    setCourseId(null);
  };

  const cards = (() => {
    if (viewMode === 'class') {
      const s = classOverview.data?.summary;
      return [
        { icon: Users, label: t('analytics.overview.students'), value: s?.students ?? '—', hint: s ? t('analytics.overview.coursesCount', { count: s.courses }) : undefined },
        {
          icon: TrendingUp,
          label: t('analytics.overview.averageFinalGrade'),
          value: formatPercent(s?.average_final_grade),
          hint: s?.pass_rate !== null && s?.pass_rate !== undefined ? t('analytics.overview.passRate', { rate: formatPercent(s.pass_rate) }) : t('analytics.overview.nothingGraded'),
          tone: s?.average_final_grade !== null && s?.average_final_grade !== undefined && s.average_final_grade < PASS_MARK ? ('bad' as const) : ('default' as const),
        },
        { icon: Calendar, label: t('analytics.overview.attendanceRate'), value: formatPercent(s?.attendance_rate), hint: t('analytics.overview.attendanceRule') },
        {
          icon: AlertTriangle,
          label: t('analytics.overview.atRiskStudents'),
          value: s?.at_risk_students ?? '—',
          tone: s && s.at_risk_students > 0 ? ('warn' as const) : ('good' as const),
        },
      ];
    }
    const summary = studentOverview.data?.summary;
    const one = effectiveCourseId ? studentCourses[0] : undefined;
    if (one) {
      return [
        {
          icon: TrendingUp,
          label: t('analytics.overview.finalGrade'),
          value: formatPercent(one.final_grade),
          hint: one.class_average !== null ? t('analytics.overview.classAverageIs', { value: formatPercent(one.class_average) }) : undefined,
          tone: one.passing === false ? ('bad' as const) : ('default' as const),
        },
        { icon: BookOpen, label: t('analytics.overview.gradesTitle'), value: one.grade_count, hint: one.rank ? t('analytics.overview.rankHint', { rank: one.rank, total: one.ranked_of }) : undefined },
        { icon: Calendar, label: t('analytics.overview.attendanceRate'), value: formatPercent(one.attendance.rate), hint: t('analytics.overview.attendanceRule') },
        {
          icon: AlertTriangle,
          label: t('analytics.overview.absenceLimit'),
          value: absenceStatusLabel(one.absence.status, t),
          hint:
            one.absence.allowed_absences !== null
              ? t('analytics.overview.absencesOfAllowed', { used: one.absence.absences ?? 0, allowed: one.absence.allowed_absences })
              : undefined,
          tone: one.absence.status === 'insufficient' ? ('bad' as const) : one.absence.status === 'warning' ? ('warn' as const) : ('good' as const),
        },
      ];
    }
    return [
      { icon: BookOpen, label: t('analytics.overview.enrolledCourses'), value: summary?.courses ?? '—', hint: summary ? t('analytics.overview.gradedOf', { graded: summary.graded_courses, total: summary.courses }) : undefined },
      {
        icon: TrendingUp,
        label: t('analytics.overview.averageFinalGrade'),
        value: formatPercent(summary?.average_final_grade),
        hint: summary ? t('analytics.overview.passingFailing', { passing: summary.passing, failing: summary.failing }) : undefined,
        tone: summary && summary.failing > 0 ? ('bad' as const) : ('default' as const),
      },
      { icon: Calendar, label: t('analytics.overview.attendanceRate'), value: formatPercent(summary?.attendance.rate), hint: t('analytics.overview.attendanceRule') },
      {
        icon: AlertTriangle,
        label: t('analytics.overview.absenceLimit'),
        value: absenceStatusLabel(summary?.absence_status, t),
        tone: summary?.absence_status === 'insufficient' ? ('bad' as const) : summary?.absence_status === 'warning' ? ('warn' as const) : ('good' as const),
      },
    ];
  })();

  const loading = selection.isLoading || (viewMode === 'class' ? classOverview.isLoading : studentOverview.isFetching && !studentOverview.data);
  const failed = selection.isError || (viewMode === 'class' ? classOverview.isError : studentOverview.isError);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="" className="h-10 w-auto object-contain" />
          <div>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t('analytics.dashboardTitle')}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('analytics.overview.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            {t('dashboardOverviewTab')}
          </button>
          <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white" aria-current="page">
            {t('dashboardAnalyticsTab')}
          </button>
        </div>
      </div>

      <AnalyticsFilterBar
        t={t}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        academicYears={selection.data?.filters.academic_years ?? []}
        academicYear={academicYear}
        onAcademicYearChange={changeYear}
        divisions={selection.data?.filters.class_divisions ?? []}
        division={division}
        onDivisionChange={(d) => {
          setDivision(d);
          setCourseId(null);
        }}
        students={selectionStudents.map((s) => ({ id: s.id, label: s.name }))}
        studentId={effectiveStudentId}
        onStudentChange={(id) => {
          setStudentId(id);
          setCourseId(null);
        }}
        courses={courseOptions}
        courseId={effectiveCourseId}
        onCourseChange={setCourseId}
        dashboards={dashboards}
        selectedDashboardId={selectedDashboardId}
        onDashboardChange={setSelectedDashboardId}
        onManageDashboards={() => navigate('/dashboard-manager')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {failed ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" role="alert">
          {t('analytics.dashboardError')}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12" aria-busy="true">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : viewMode === 'class' && classOverview.data ? (
        <AnalyticsClassView t={t} visibleCharts={visibleCharts} overview={classOverview.data} onOpenStudent={openStudent} />
      ) : viewMode === 'student' && !effectiveStudentId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <p className="text-slate-600">{t('analytics.overview.noStudents')}</p>
        </div>
      ) : (
        <AnalyticsStudentView
          t={t}
          formatDate={(d) => formatDate(d)}
          visibleCharts={visibleCharts}
          courses={studentCourses}
          singleCourse={Boolean(effectiveCourseId)}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => exportPDF()}
          disabled={isExporting}
          title={t('analytics.overview.exportScope')}
          className="flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={18} />
          {isExporting ? t('analytics.exporting') : 'PDF'}
        </button>
        <button
          type="button"
          onClick={() => exportExcel()}
          disabled={isExporting}
          title={t('analytics.overview.exportScope')}
          className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={18} />
          {isExporting ? t('analytics.exporting') : 'Excel'}
        </button>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics'] })}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
        >
          {t('analytics.refresh')}
        </button>
      </div>
      {exportError && (
        <p className="text-sm text-red-600" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
