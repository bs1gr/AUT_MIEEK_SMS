import type { Dashboard } from '../hooks/useDashboards';
import type { Translate } from './AnalyticsCharts';

export type AnalyticsViewMode = 'student' | 'class';

interface Option {
  id: number;
  label: string;
}

export interface AnalyticsFilterBarProps {
  t: Translate;
  viewMode: AnalyticsViewMode;
  onViewModeChange: (mode: AnalyticsViewMode) => void;
  academicYears: string[];
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  divisions: string[];
  division: string;
  onDivisionChange: (division: string) => void;
  /** Student view only: active students in the chosen year/division. */
  students: Option[];
  studentId: number | null;
  onStudentChange: (id: number | null) => void;
  /** Student view: that student's enrolled courses. Class view: courses of the selection. */
  courses: Option[];
  courseId: number | null;
  onCourseChange: (id: number | null) => void;
  dashboards: Dashboard[];
  selectedDashboardId: number | null;
  onDashboardChange: (id: number | null) => void;
  onManageDashboards: () => void;
}

const SELECT =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-100';
const LABEL = 'block text-sm font-medium text-slate-600 dark:text-slate-300';
// Each filter takes at least this width and grows to fill the row; the row wraps on narrow screens.
const FIELD = `${LABEL} w-full min-w-44 sm:w-auto sm:flex-1`;

const AnalyticsFilterBar = ({
  t,
  viewMode,
  onViewModeChange,
  academicYears,
  academicYear,
  onAcademicYearChange,
  divisions,
  division,
  onDivisionChange,
  students,
  studentId,
  onStudentChange,
  courses,
  courseId,
  onCourseChange,
  dashboards,
  selectedDashboardId,
  onDashboardChange,
  onManageDashboards,
}: AnalyticsFilterBarProps) => (
  <div className="flex flex-wrap items-end gap-4" data-testid="analytics-filters">
    <div className="w-full sm:w-auto sm:min-w-72">
      <span className={LABEL}>{t('analytics.viewMode')}</span>
      <div className="mt-1 flex gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group">
        {(['student', 'class'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            aria-pressed={viewMode === mode}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              viewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t(mode === 'student' ? 'analytics.studentView' : 'analytics.classView')}
          </button>
        ))}
      </div>
    </div>

    <label className={FIELD}>
      {t('analytics.overview.academicYear')}
      <select value={academicYear} onChange={(e) => onAcademicYearChange(e.target.value)} className={SELECT}>
        <option value="">{t('analytics.overview.allYears')}</option>
        {academicYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>

    <label className={FIELD}>
      {t('analytics.divisionLabel')}
      <select value={division} onChange={(e) => onDivisionChange(e.target.value)} className={SELECT}>
        <option value="">{t('analytics.selectDivision')}</option>
        {divisions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>

    {viewMode === 'student' && (
      <label className={FIELD}>
        {t('analytics.studentLabel')}
        <select
          value={studentId ?? ''}
          onChange={(e) => onStudentChange(e.target.value ? Number(e.target.value) : null)}
          className={SELECT}
          data-testid="analytics-student-select"
        >
          <option value="">{t('analytics.selectStudent')}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    )}

    <label className={FIELD}>
      {t('analytics.courseLabel')}
      <select
        value={courseId ?? ''}
        onChange={(e) => onCourseChange(e.target.value ? Number(e.target.value) : null)}
        className={SELECT}
        disabled={viewMode === 'student' && !studentId}
        data-testid="analytics-course-select"
      >
        <option value="">{t('analytics.overview.allCourses')}</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>

    <div className="flex w-full items-end gap-2 sm:w-auto sm:min-w-72">
      <label className={`${LABEL} min-w-0 flex-1`}>
        {t('dashboard.selectDashboard')}
        <select
          value={selectedDashboardId ?? ''}
          onChange={(e) => onDashboardChange(e.target.value ? Number(e.target.value) : null)}
          className={SELECT}
        >
          <option value="">{t('dashboard.defaultDashboard')}</option>
          {dashboards.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onManageDashboards}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:text-slate-900"
        title={t('dashboard.manageDashboards')}
      >
        {t('dashboard.manage')}
      </button>
    </div>
  </div>
);

export default AnalyticsFilterBar;
