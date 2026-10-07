import type { ComponentType } from 'react';
import type { AbsenceStatus } from '@/api/hooks/useAnalytics';
import type { Translate } from './AnalyticsCharts';

/** "72.5%", or an em dash when there is nothing to measure yet (never a fake 0). */
export const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${value.toFixed(1)}%`;

interface SummaryCardProps {
  icon: ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}

const TONES = {
  default: 'bg-indigo-100 text-indigo-600',
  good: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-700',
};

export const SummaryCard = ({ icon: Icon, label, value, hint, tone = 'default' }: SummaryCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs" data-testid="summary-card">
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
      </div>
    </div>
  </div>
);

const BADGE = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  insufficient: 'bg-red-50 text-red-800 ring-red-200',
  unknown: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export const absenceStatusLabel = (status: AbsenceStatus | null | undefined, t: Translate): string =>
  status ? t(`analytics.overview.absence.${status}`) : '—';

export const AbsenceBadge = ({ status, t }: { status: AbsenceStatus | null | undefined; t: Translate }) =>
  status ? (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${BADGE[status]}`}>
      {absenceStatusLabel(status, t)}
    </span>
  ) : (
    <span className="text-slate-500">—</span>
  );

/** Chart ids a saved custom dashboard can list; older dashboards used ids for charts that are gone. */
export const ANALYTICS_CHART_IDS = ['courseComparison', 'gradeTimeline', 'attendance', 'gradeDistribution', 'scatter'];
const LEGACY_CHART_IDS: Record<string, string> = {
  performance: 'gradeTimeline',
  trend: 'gradeTimeline',
  boxplot: 'courseComparison',
  treemap: 'courseComparison',
  heatmap: 'gradeTimeline',
  sankey: 'gradeDistribution',
  pieChart: 'gradeDistribution',
};

/** Current chart ids for a saved list: legacy ids mapped, unknown ones dropped, no duplicates. */
export const normalizeChartIds = (configured: string[] | undefined | null): string[] =>
  Array.from(
    new Set(
      (configured ?? [])
        .map((id) => (ANALYTICS_CHART_IDS.includes(id) ? id : LEGACY_CHART_IDS[id]))
        .filter((id): id is string => Boolean(id))
    )
  );

/** Charts to show: the dashboard's own, or all of them when it names none that still exist. */
export const resolveVisibleCharts = (configured: string[] | undefined | null): Set<string> => {
  const ids = normalizeChartIds(configured);
  return new Set(ids.length > 0 ? ids : ANALYTICS_CHART_IDS);
};
