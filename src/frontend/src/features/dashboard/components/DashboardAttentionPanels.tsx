import type { ReactNode } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceGaps, useClassOverview } from '@/api/hooks/useAnalytics';
import type { Translate } from './AnalyticsCharts';
import { AbsenceBadge, formatPercent } from './analyticsUi';

const MAX_ROWS = 8;

const Panel = ({ icon, title, help, children, testId }: {
  icon: ReactNode;
  title: string;
  help: string;
  children: ReactNode;
  testId: string;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs" data-testid={testId}>
    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
      {icon}
      <span>{title}</span>
    </h3>
    <p className="mb-4 mt-1 text-sm text-slate-600">{help}</p>
    {children}
  </section>
);

/** Active students failing a course, who lost Class Participation, or near/over the absence fail limit. */
export const StudentsNeedingAttention = ({ t }: { t: Translate }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useClassOverview({});
  const atRisk = (data?.students ?? [])
    .filter((s) => s.at_risk)
    .sort(
      (a, b) =>
        b.failing_courses.length - a.failing_courses.length ||
        b.participation_forfeited.length - a.participation_forfeited.length ||
        a.name.localeCompare(b.name)
    );

  return (
    <Panel
      testId="dashboard-needs-attention"
      icon={<AlertTriangle size={22} className="text-amber-600" />}
      title={t('dashboard.attentionTitle', { count: atRisk.length })}
      help={t('analytics.overview.atRiskHelp')}
    >
      {isError ? (
        <p className="text-sm text-red-700">{t('analytics.dashboardError')}</p>
      ) : isLoading ? (
        <p className="text-sm text-slate-600">{t('loadingStudentData')}</p>
      ) : atRisk.length === 0 ? (
        <p className="text-sm text-emerald-700">{t('analytics.overview.atRiskNone')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {atRisk.slice(0, MAX_ROWS).map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-600">
                  {[s.academic_year, s.class_division].filter(Boolean).join(' · ')}
                  {s.average_final_grade !== null && ` · ${t('analytics.overview.averageFinalGrade')} ${formatPercent(s.average_final_grade)}`}
                </p>
                {s.failing_courses.length > 0 && (
                  <p className="text-xs text-red-700">
                    {t('dashboard.attentionFailing', { courses: s.failing_courses.join(', ') })}
                  </p>
                )}
                {s.participation_forfeited.length > 0 && (
                  <p className="text-xs text-amber-800">
                    {t('analytics.overview.participationLostIn', { courses: s.participation_forfeited.join(', ') })}
                  </p>
                )}
              </div>
              <AbsenceBadge status={s.absence_status} t={t} />
            </li>
          ))}
        </ul>
      )}
      {atRisk.length > MAX_ROWS && (
        <p className="mt-2 text-xs text-slate-600">{t('dashboard.attentionMore', { count: atRisk.length - MAX_ROWS })}</p>
      )}
      <button
        type="button"
        onClick={() => navigate('/analytics')}
        className="mt-4 text-sm font-semibold text-indigo-700 hover:underline"
      >
        {t('dashboard.openAnalytics')}
      </button>
    </Panel>
  );
};

/** Courses whose scheduled teaching days in the last week have no attendance entered. */
export const AttendanceNotRecorded = ({ t, formatDate }: { t: Translate; formatDate: (d: string) => string }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAttendanceGaps(7);

  return (
    <Panel
      testId="dashboard-attendance-gaps"
      icon={<Calendar size={22} className="text-red-600" />}
      title={t('dashboard.attendanceGapsTitle', { count: data?.missing.length ?? 0 })}
      help={
        data?.from && data.to
          ? t('dashboard.attendanceGapsHelp', { from: formatDate(data.from), to: formatDate(data.to) })
          : t('dashboard.attendanceGapsHelpShort')
      }
    >
      {isError ? (
        <p className="text-sm text-red-700">{t('analytics.dashboardError')}</p>
      ) : isLoading || !data ? (
        <p className="text-sm text-slate-600">{t('loadingStudentData')}</p>
      ) : data.missing.length === 0 ? (
        <p className="text-sm text-emerald-700">{t('dashboard.attendanceGapsNone')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.missing.map((c) => (
            <li key={c.id} className="py-3">
              <p className="font-medium text-slate-900">
                {c.course_name} <span className="text-xs font-normal text-slate-600">{c.course_code}</span>
              </p>
              <p className="text-xs text-red-700">{c.missing_dates.map(formatDate).join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
      {data && data.unscheduled.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          {t('dashboard.attendanceGapsUnscheduled', { count: data.unscheduled.length })}
        </p>
      )}
      <button
        type="button"
        onClick={() => navigate('/attendance')}
        className="mt-4 text-sm font-semibold text-indigo-700 hover:underline"
      >
        {t('dashboard.openAttendance')}
      </button>
    </Panel>
  );
};
