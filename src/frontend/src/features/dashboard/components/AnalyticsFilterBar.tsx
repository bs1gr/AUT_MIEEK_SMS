import type { Course, Student } from '@/types';
import type { Dashboard } from '../hooks/useDashboards';

export interface AnalyticsFilterBarProps {
  t: (key: string) => string;
  viewMode: 'student' | 'class';
  setViewMode: (mode: 'student' | 'class') => void;
  setSelectedDivision: (division: string) => void;
  setSelectedStudent: (id: number | null) => void;
  effectiveSelectedStudent: number | null;
  activeStudents: Student[];
  selectedDivision: string;
  students: Student[];
  normalizeDivisionLabel: (label?: string | null) => string;
  effectiveSelectedCourse: number | null;
  setSelectedCourse: (id: number | null) => void;
  selectableCourses: Course[];
  selectedDashboardId: number | null;
  setSelectedDashboardId: (id: number | null) => void;
  dashboards: Dashboard[];
  onManageDashboards: () => void;
}

const AnalyticsFilterBar = ({
  t,
  viewMode,
  setViewMode,
  setSelectedDivision,
  setSelectedStudent,
  effectiveSelectedStudent,
  activeStudents,
  selectedDivision,
  students,
  normalizeDivisionLabel,
  effectiveSelectedCourse,
  setSelectedCourse,
  selectableCourses,
  selectedDashboardId,
  setSelectedDashboardId,
  dashboards,
  onManageDashboards,
}: AnalyticsFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-600">
          {t('analytics.viewMode')}
        </label>
        <div className="mt-1 flex gap-2 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => {
              setViewMode('student');
              setSelectedDivision('');
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              viewMode === 'student'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('analytics.studentView')}
          </button>
          <button
            onClick={() => {
              setViewMode('class');
              setSelectedStudent(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              viewMode === 'class'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('analytics.classView')}
          </button>
        </div>
      </div>

      {viewMode === 'student' && (
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.studentLabel')}
          </label>
          <select
            value={effectiveSelectedStudent ?? ''}
            onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectStudent')}</option>
            {activeStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {viewMode === 'class' && (
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.divisionLabel')}
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectDivision')}</option>
            {Array.from(new Set(students.map((s) => normalizeDivisionLabel(s.class_division)).filter(Boolean)))
              .sort()
              .map((division) => (
                <option key={division as string} value={division as string}>
                  {division as string}
                </option>
              ))}
          </select>
        </div>
      )}
      {viewMode === 'student' && effectiveSelectedStudent && (
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.courseLabel')}
          </label>
          <select
            value={effectiveSelectedCourse ?? ''}
            onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectCourse')}</option>
            {selectableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600">
          {t('dashboard.selectDashboard')}
        </label>
        <select
          value={selectedDashboardId ?? ''}
          onChange={(e) => setSelectedDashboardId(e.target.value ? Number(e.target.value) : null)}
          className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{t('dashboard.defaultDashboard')}</option>
          {dashboards.map((d: Dashboard) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onManageDashboards}
        className="self-end rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        title={t('dashboard.manageDashboards')}
      >
        {t('dashboard.manage')}
      </button>
    </div>
  );
};

export default AnalyticsFilterBar;
