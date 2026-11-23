/**
 * The Analytics page by category, whatever the course (plan todo 75 stage 3): how a student does
 * in each kind of work (exams, labs, homework, participation...) across all their courses, against
 * the class, and the same for a whole selection of students. A course's own category names fold
 * into one list (backend/services/grade_categories.py), so "Εργαστήριο" in one course and
 * "Lab Work" in another are one category here.
 *
 * Strength and difficulty are the server's marks (analytics_overview_service.category_signal),
 * judged on the figures as they are shown here (one decimal): under 50 a difficulty and 85 or more
 * a strength, whatever the class; in between, 10 points under or over the class decide. A mark is
 * never colour alone: it has its word (badge) or a sign (▼ ▲) with the word for screen readers.
 */
import type { CategoryColumn, CategorySignal, ClassCategories, StudentCategory } from '@/api/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import type { Translate } from './AnalyticsCharts';
import { formatPercent } from './analyticsUi';

const CELL = 'px-3 py-2 text-sm text-slate-700';
const HEAD = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600';
const NUMBER_HEAD = 'px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600';
const NUMBER_CELL = `${CELL} text-right tabular-nums`;
const ROW_HEAD = `${CELL} text-left font-normal`;
// The map's name column stays in view while a phone scrolls through the categories.
const STICKY = 'sticky left-0 z-10';

/** A category as people call it: the translated standard label, or the course's own name. */
export const categoryName = (t: Translate, column: Pick<CategoryColumn, 'label_key' | 'name'>): string =>
  column.label_key ? t(`reports.gradeSheets.categories.${column.label_key}`) : column.name;

// emerald-700 (not -800): the ΜΙΕΕΚ Dark appearance lightens it, so it stays readable on black.
// The rings are dark enough to see (3:1) beside a white cell.
const SIGNAL_CLASS: Record<'strength' | 'difficulty', string> = {
  strength: 'bg-emerald-50 text-emerald-700 ring-emerald-600',
  difficulty: 'bg-red-50 text-red-800 ring-red-500',
};
const SIGNAL_GLYPH: Record<'strength' | 'difficulty', string> = { strength: '▲', difficulty: '▼' };

/** A mark as a sign, and its word for screen readers (the sign alone says nothing to them). */
const SignalMark = ({ signal, t }: { signal: CategorySignal; t: Translate }) =>
  signal ? (
    <>
      <span aria-hidden="true">{SIGNAL_GLYPH[signal]}</span>
      <span className="sr-only">{t(`analytics.categories.${signal}`)}</span>
    </>
  ) : null;

const SignalBadge = ({ signal, t }: { signal: CategorySignal; t: Translate }) =>
  signal ? (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${SIGNAL_CLASS[signal]}`}
      data-signal={signal}
    >
      {t(`analytics.categories.${signal}`)}
    </span>
  ) : null;

/**
 * The student's average as a bar, the class's as a mark on it. Colours that no appearance
 * repaints: ΜΙΕΕΚ Dark blackens bg-slate-50/100 (and any class containing "bg-slate-50", such as
 * bg-slate-500) and turns bg-indigo-500 into a hollow button, which took the track and the fill.
 * The fill is always there, even at 0, so the bar's children keep their order.
 */
const ScoreBar = ({ average, classAverage }: { average: number | null; classAverage: number | null }) => (
  <div className="relative h-2 w-32 rounded-full bg-slate-200" aria-hidden="true">
    <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${Math.max(0, Math.min(100, average ?? 0))}%` }} />
    {classAverage !== null && (
      <div
        className="absolute -top-1 h-4 w-0.5 bg-zinc-500"
        style={{ left: `${Math.max(0, Math.min(100, classAverage))}%` }}
      />
    )}
  </div>
);

/** Two figures as shown (one decimal) apart, so the three add up on the page. */
const differenceOf = (value: number | null | undefined, reference: number | null | undefined): number | null =>
  value === null || value === undefined || reference === null || reference === undefined
    ? null
    : Math.round((value - reference) * 10) / 10;

/** "+10.0", "-2.5", and "0.0" without a sign (never "-0.0"). Rounded as formatPercent rounds,
 * on the size of the difference, so -23.75 and +23.75 print as -23.8 and +23.8. */
export const formatDifference = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  const size = Math.abs(value).toFixed(1);
  if (size === '0.0') return '0.0';
  return `${value > 0 ? '+' : '-'}${size}`;
};

/**
 * The student's categories for the chosen course: that course's own figures (and its signal), or
 * every category across the courses when no course is chosen. A category the course lacks is left out.
 */
export const categoriesForCourse = (all: StudentCategory[], courseId: number | null): StudentCategory[] => {
  if (!courseId) return all;
  return all.flatMap((category) => {
    const own = category.courses.find((c) => c.id === courseId);
    if (!own) return [];
    return [
      {
        ...category,
        average: own.average,
        class_average: own.class_average,
        difference: differenceOf(own.average, own.class_average),
        signal: own.signal,
        courses: [own],
      },
    ];
  });
};

export interface AnalyticsCategoryProfileProps {
  t: Translate;
  /** Already narrowed to the chosen course, when there is one; none from an older server. */
  categories: StudentCategory[] | undefined;
  singleCourse: boolean;
  /** Class Participation was lost to absences (in the chosen course, or in one of them). */
  participationLost?: boolean;
  /** Courses whose grades so far are all outside their evaluation rules, so no category counts them. */
  outsideRules?: string[];
}

/** A student's strengths and difficulties by category, across their courses. */
export const AnalyticsCategoryProfile = ({
  t,
  categories,
  singleCourse,
  participationLost = false,
  outsideRules = [],
}: AnalyticsCategoryProfileProps) => {
  // A server older than todo 75 stage 3 sends no categories: show nothing rather than "no grade".
  if (!categories) return null;
  const strengths = categories.filter((c) => c.signal === 'strength').map((c) => categoryName(t, c));
  const difficulties = categories.filter((c) => c.signal === 'difficulty').map((c) => categoryName(t, c));
  // Why nothing is counted, when nothing is: every reason that applies, else "no grade yet".
  const emptyReasons = [
    participationLost && 'analytics.categories.noDataLost',
    outsideRules.length > 0 && 'analytics.categories.noDataOutsideRules',
  ].filter((key): key is string => Boolean(key));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="analytics-category-profile">
      <div className="px-6 pt-5">
        <h3 className="text-lg font-semibold text-slate-900">{t('analytics.categories.title')}</h3>
        <p className="text-sm text-slate-600">
          {t(singleCourse ? 'analytics.categories.helpCourse' : 'analytics.categories.help')}
        </p>
      </div>
      {categories.length === 0 ? (
        <div className="space-y-1 px-6 py-5 text-sm text-slate-600">
          {(emptyReasons.length ? emptyReasons : ['analytics.categories.noData']).map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-1 px-6 pt-3 text-sm" data-testid="analytics-category-summary">
            {difficulties.length > 0 && (
              <p className="font-medium text-red-800">
                {t('analytics.categories.difficulties', { list: difficulties.join(', ') })}
              </p>
            )}
            {strengths.length > 0 && (
              <p className="font-medium text-emerald-700">
                {t('analytics.categories.strengths', { list: strengths.join(', ') })}
              </p>
            )}
            {strengths.length === 0 && difficulties.length === 0 && (
              <p className="text-slate-600">{t('analytics.categories.noSignals')}</p>
            )}
            {outsideRules.length > 0 && (
              <p className="text-slate-600">{t('analytics.categories.outsideRules', { courses: outsideRules.join(', ') })}</p>
            )}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" data-testid="analytics-category-table">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className={cn(HEAD, STICKY, 'bg-slate-50')}>
                    {t('analytics.categories.category')}
                  </th>
                  <th scope="col" className={NUMBER_HEAD}>
                    {t('analytics.categories.student')}
                  </th>
                  <th scope="col" className={NUMBER_HEAD}>
                    {t('analytics.categories.classAverage')}
                  </th>
                  <th scope="col" className={NUMBER_HEAD}>
                    {t('analytics.categories.difference')}
                  </th>
                  <th scope="col" className={HEAD}>
                    <span className="sr-only">{t('analytics.categories.bar')}</span>
                  </th>
                  {!singleCourse && (
                    <th scope="col" className={HEAD}>
                      {t('analytics.categories.courses')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.key} data-testid={`analytics-category-${c.key}`}>
                    <th scope="row" className={cn(ROW_HEAD, STICKY, 'bg-white')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{categoryName(t, c)}</span>
                        <SignalBadge signal={c.signal} t={t} />
                      </div>
                    </th>
                    <td className={`${NUMBER_CELL} font-semibold`}>{formatPercent(c.average)}</td>
                    <td className={NUMBER_CELL}>{formatPercent(c.class_average)}</td>
                    <td
                      className={cn(
                        NUMBER_CELL,
                        c.difference !== null && c.difference < 0 && 'text-red-700',
                        c.difference !== null && c.difference > 0 && 'text-emerald-700'
                      )}
                    >
                      {formatDifference(c.difference)}
                    </td>
                    <td className={CELL}>
                      <ScoreBar average={c.average} classAverage={c.class_average} />
                    </td>
                    {!singleCourse && (
                      <td className={CELL}>
                        <div className="flex flex-wrap gap-1">
                          {c.courses.map((course) => (
                            <span
                              key={course.id}
                              title={course.course_name}
                              data-signal={course.signal ?? undefined}
                              className={cn(
                                'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs ring-1',
                                course.signal ? SIGNAL_CLASS[course.signal] : 'bg-slate-50 text-slate-700 ring-slate-200'
                              )}
                            >
                              {course.course_code} {formatPercent(course.average)}
                              <SignalMark signal={course.signal} t={t} />
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-6 py-4 text-xs text-slate-600">{t('analytics.categories.legend')}</p>
        </>
      )}
      {categories.length === 0 && emptyReasons.length > 0 && (
        <p className="px-6 pb-4 text-xs text-slate-600">{t('analytics.categories.legend')}</p>
      )}
    </section>
  );
};

export interface AnalyticsCategoryMatrixProps {
  t: Translate;
  block: ClassCategories | undefined;
  /** A course is chosen: the map is of that course, not across courses. */
  singleCourse?: boolean;
  /** Students of the selection with nothing counted in any category yet (they have no row). */
  unlisted?: number;
  onOpenStudent: (id: number) => void;
}

/** A cell's tooltip: its mark, and the average it was judged against (the course's, with one). */
const cellTitle = (t: Translate, signal: CategorySignal, reference: number | null, singleCourse: boolean): string | undefined =>
  [
    signal ? t(`analytics.categories.${signal}`) : '',
    reference === null
      ? ''
      : t(singleCourse ? 'analytics.categories.courseAverage' : 'analytics.categories.sameCourses', {
          value: formatPercent(reference),
        }),
  ]
    .filter(Boolean)
    .join(' · ') || undefined;

/** A selection of students by category across their courses, and its courses by category. */
export const AnalyticsCategoryMatrix = ({
  t,
  block,
  singleCourse = false,
  unlisted = 0,
  onOpenStudent,
}: AnalyticsCategoryMatrixProps) => {
  if (!block || block.columns.length === 0) return null;
  // The students who need help first: the most difficulties, then the name.
  const students = [...block.students].sort((a, b) => b.difficulties - a.difficulties || a.name.localeCompare(b.name));
  const names = block.columns.map((column) => categoryName(t, column));
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="analytics-category-matrix">
        <div className="px-6 pt-5">
          <h3 className="text-lg font-semibold text-slate-900">
            {t(singleCourse ? 'analytics.categories.matrixTitleCourse' : 'analytics.categories.matrixTitle')}
          </h3>
          <p className="text-sm text-slate-600">
            {t(singleCourse ? 'analytics.categories.matrixHelpCourse' : 'analytics.categories.matrixHelp')}
          </p>
          {unlisted > 0 && (
            <p className="mt-1 text-sm text-slate-600">{t('analytics.categories.unlisted', { count: unlisted })}</p>
          )}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className={cn(HEAD, STICKY, 'bg-slate-50')}>
                  {t('analytics.categories.student')}
                </th>
                {names.map((name, index) => (
                  <th key={block.columns[index].key} scope="col" className={NUMBER_HEAD}>
                    {name}
                  </th>
                ))}
                <th scope="col" className={NUMBER_HEAD}>
                  {t('analytics.categories.difficultyCount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} data-testid={`analytics-category-student-${s.id}`}>
                  <th scope="row" className={cn(ROW_HEAD, STICKY, 'bg-white')}>
                    <button
                      type="button"
                      onClick={() => onOpenStudent(s.id)}
                      className="text-left font-medium text-indigo-700 underline-offset-2 hover:underline"
                    >
                      {s.name}
                    </button>
                  </th>
                  {s.cells.map((value, index) => {
                    const signal = s.signals[index];
                    const reference = s.class_averages[index];
                    const difference = differenceOf(value, reference);
                    return (
                      <td
                        key={block.columns[index].key}
                        className={cn(NUMBER_CELL, signal && `${SIGNAL_CLASS[signal]} ring-1 ring-inset`)}
                        title={value === null ? undefined : cellTitle(t, signal, reference, singleCourse)}
                        data-signal={signal ?? undefined}
                      >
                        {value === null ? (
                          '—'
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1">
                              {formatPercent(value)}
                              <SignalMark signal={signal} t={t} />
                            </span>
                            {/* Visible, not only on hover: how far from what the mark was judged against. */}
                            {difference !== null && (
                              <span className="block text-xs text-slate-600" data-testid="analytics-category-gap">
                                {formatDifference(difference)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className={cn(NUMBER_CELL, s.difficulties > 0 && 'font-semibold text-red-700')}>{s.difficulties}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50">
              <tr>
                <th scope="row" className={cn(ROW_HEAD, STICKY, 'bg-slate-50 font-semibold')}>
                  {t('analytics.categories.studentsAverage')}
                </th>
                {block.averages.map((value, index) => (
                  <td key={block.columns[index].key} className={`${NUMBER_CELL} font-semibold`}>
                    {value === null ? '—' : formatPercent(value)}
                  </td>
                ))}
                <td className={CELL} />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-6 py-4 text-xs text-slate-600">
          {t(singleCourse ? 'analytics.categories.matrixLegendCourse' : 'analytics.categories.matrixLegend')}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="analytics-category-courses">
        <div className="px-6 pt-5">
          <h3 className="text-lg font-semibold text-slate-900">{t('analytics.categories.byCourseTitle')}</h3>
          <p className="text-sm text-slate-600">{t('analytics.categories.byCourseHelp')}</p>
        </div>
        <div className="mt-3 overflow-x-auto pb-4">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className={cn(HEAD, STICKY, 'bg-slate-50')}>
                  {t('analytics.categories.course')}
                </th>
                {names.map((name, index) => (
                  <th key={block.columns[index].key} scope="col" className={NUMBER_HEAD}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row" className={cn(ROW_HEAD, STICKY, 'bg-white')}>
                    <div className="font-medium text-slate-900">{course.course_name}</div>
                    <div className="text-xs text-slate-600">{course.course_code}</div>
                  </th>
                  {course.cells.map((value, index) => (
                    <td key={block.columns[index].key} className={NUMBER_CELL}>
                      {value === null ? '—' : formatPercent(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
