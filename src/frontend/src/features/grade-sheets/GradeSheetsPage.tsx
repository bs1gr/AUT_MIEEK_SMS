/**
 * Grade sheets (plan todo 75 stage 2): every student of a course, A to Z by surname, for one
 * assessment, for every assessment, or by category; on screen, and as a PDF to print or an
 * Excel file (backend/services/grade_sheet_service.py).
 *
 * The course, the kind of sheet and the assessment live in the address
 * (`#/operations/reports/grade-sheets?courseId=7&kind=assessment&assessment=final|...`), so the
 * Grading page, Analytics and Utils → Reports can open a sheet directly, and a reload keeps it.
 * The table shows what the PDF prints, with the same marks: * over the absence limit (the course
 * is failed whatever the grade), † a final grade from the mean of the grades when the sheet mixes
 * that with grades from the rules, ‡ a category the final grade zeroed for absences.
 *
 * Only the sheet the controls name is ever shown or downloaded: while the next one loads, the
 * previous one (perhaps another course's) is not on screen. The list of assessments is the
 * course's own, never one still held from the course chosen before.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download, RotateCcw, Settings2 } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { useDateTimeSettings } from '@/contexts/DateTimeSettingsContext';
import { coursesAPI } from '@/api/api';
import {
  gradeSheetsAPI,
  type AssessmentList,
  type AssessmentSheet,
  type CategoriesSheet,
  type FinalFields,
  type GradeSheet,
  type GradeSheetAssessment,
  type GradeSheetCourse,
  type GradeSheetFormat,
  type GradeSheetKind,
  type MatrixSheet,
} from '@/api/gradeSheetsAPI';
import { cn } from '@/lib/utils';
import { downloadBlob } from '@/utils/downloadFile';
import type { DateFormatOption } from '@/utils/dateTime';
import type { Course } from '@/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;
type LoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'forbidden';

const KINDS: GradeSheetKind[] = ['assessment', 'matrix', 'categories'];
const KIND_LABELS: Record<GradeSheetKind, string> = {
  assessment: 'kindAssessment',
  matrix: 'kindMatrix',
  categories: 'kindCategories',
};
// The marks of the printed sheet (grade_sheet_export.py), explained in the notes under the table.
const MARK_OVER_LIMIT = '*';
const MARK_AVERAGE = '†';
const MARK_FORFEITED = '‡';
const SEPARATOR = ' · ';
const NO_FIGURE = '–';
// Messages on the page's own background (the app's, light or dark), readable in both themes.
const MESSAGE = 'text-sm text-slate-600 dark:text-slate-300';
const MESSAGE_ERROR = 'text-sm text-red-600 dark:text-red-400';

const isKind = (value: string | null): value is GradeSheetKind => KINDS.includes(value as GradeSheetKind);

/** 77, 67.5, 33.33: as the PDF prints them (the server rounds every figure to two decimals). */
const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(Math.round(value * 100) / 100);

/** 'YYYY-MM-DD' in the app's date format, without going through Date (a UTC midnight can show the day before). */
const formatDay = (iso: string | null, format: DateFormatOption): string => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  if (format === 'en-us') return `${month}/${day}/${year}`;
  if (format === 'gr-ddmmyy') return `${day}/${month}/${year.slice(-2)}`;
  return `${day}/${month}/${year}`;
};

/** One date, or "first - last" when an assessment was graded over several days (as the PDF). */
const formatRange = (first: string | null, last: string | null, format: DateFormatOption): string => {
  const from = formatDay(first, format);
  const to = formatDay(last, format);
  return from && to && from !== to ? `${from} - ${to}` : from || to;
};

const courseTitle = (course: GradeSheetCourse): string =>
  [course.course_code, course.course_name].filter(Boolean).join(' - ');

const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

const byCode = (a: Course, b: Course) => String(a.course_code ?? '').localeCompare(String(b.course_code ?? ''));

/** The sheet the controls name, or null: a sheet answered for an earlier choice is never shown. */
const sheetFor = (
  sheet: GradeSheet | null,
  courseId: number | null,
  kind: GradeSheetKind,
  assessmentKey: string | null
): GradeSheet | null => {
  if (!sheet || sheet.course?.id !== courseId || sheet.kind !== kind) return null;
  if (sheet.kind === 'assessment' && sheet.assessment?.key !== assessmentKey) return null;
  return sheet;
};

const GradeSheetsPage = () => {
  const { t, language } = useLanguage();
  const { dateFormat } = useDateTimeSettings();
  const g = useCallback((key: string, options?: Record<string, unknown>) => t(`reports.gradeSheets.${key}`, options), [t]);
  const [params, setParams] = useSearchParams();
  const courseId = Number(params.get('courseId')) || null;
  const kindParam = params.get('kind');
  const kind: GradeSheetKind = isKind(kindParam) ? kindParam : 'assessment';
  const assessmentKey = params.get('assessment');
  // Only one assessment needs the list of them; the other two sheets stand alone.
  const needsList = kind === 'assessment';

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesState, setCoursesState] = useState<LoadState>('loading');
  const [list, setList] = useState<AssessmentList | null>(null);
  const [listState, setListState] = useState<LoadState>('idle');
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [sheetState, setSheetState] = useState<LoadState>('idle');
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState<GradeSheetFormat | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  // Only the newest request may fill the page, whatever order the answers arrive in.
  const latestList = useRef(0);
  const latestSheet = useRef(0);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            if (value) next.set(name, value);
            else next.delete(name);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  useEffect(() => {
    let alive = true;
    coursesAPI
      .getAll(0, 1000)
      .then((data) => {
        if (!alive) return;
        setCourses([...data].sort(byCode));
        setCoursesState('ready');
      })
      .catch(() => {
        if (alive) setCoursesState('failed');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId || !needsList) {
      latestList.current += 1;
      setList(null);
      setListState('idle');
      return;
    }
    const request = ++latestList.current;
    setList(null);
    setListState('loading');
    gradeSheetsAPI
      .assessments(courseId)
      .then((data) => {
        if (request !== latestList.current) return;
        setList(data);
        setListState('ready');
      })
      .catch((error) => {
        if (request !== latestList.current) return;
        setListState(httpStatus(error) === 403 ? 'forbidden' : 'failed');
      });
  }, [courseId, needsList, retry]);

  // The list of this course only: in the render where the course has just changed, the previous
  // course's list is still in state, and it must not choose an assessment for the new one.
  const courseList = list && list.course?.id === courseId ? list : null;
  const listReady = listState === 'ready' && courseList !== null;
  const knownAssessment = Boolean(courseList?.assessments.some((a) => a.key === assessmentKey));

  // One assessment: the newest unless the address names one the course has.
  useEffect(() => {
    if (!needsList || !listReady || !courseList || knownAssessment) return;
    const newest = courseList.assessments[courseList.assessments.length - 1];
    update({ assessment: newest ? newest.key : null });
  }, [needsList, listReady, courseList, knownAssessment, update]);

  const sheetWanted = Boolean(courseId) && (!needsList || (listReady && knownAssessment));
  useEffect(() => {
    if (!courseId || !sheetWanted) {
      latestSheet.current += 1;
      setSheet(null);
      setSheetState('idle');
      return;
    }
    const request = ++latestSheet.current;
    setSheetState('loading');
    setExportFailed(false);
    gradeSheetsAPI
      .sheet(courseId, kind, needsList ? (assessmentKey ?? undefined) : undefined)
      .then((data) => {
        if (request !== latestSheet.current) return;
        setSheet(data);
        setSheetState('ready');
      })
      .catch((error) => {
        if (request !== latestSheet.current) return;
        setSheet(null);
        setSheetState(httpStatus(error) === 403 ? 'forbidden' : 'failed');
      });
  }, [courseId, kind, assessmentKey, needsList, sheetWanted, retry]);

  const shown = sheetFor(sheet, courseId, kind, assessmentKey);

  const download = async (format: GradeSheetFormat) => {
    if (!courseId || !shown || exporting) return;
    setExporting(format);
    setExportFailed(false);
    try {
      const file = await gradeSheetsAPI.exportFile(courseId, format, {
        kind: shown.kind,
        assessment: shown.kind === 'assessment' ? shown.assessment.key : undefined,
        lang: language,
      });
      await downloadBlob(file.blob, file.filename);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  const categoryLabel = useCallback(
    (labelKey: string | null, category: string | null) =>
      labelKey ? g(`categories.${labelKey}`) : (category ?? '').trim(),
    [g]
  );

  const assessmentOption = (a: GradeSheetAssessment) =>
    [
      a.name,
      categoryLabel(a.label_key, a.category),
      formatRange(a.first_date, a.last_date, dateFormat),
      g('assessmentGraded', { graded: a.graded, enrolled: a.enrolled }),
    ]
      .filter(Boolean)
      .join(SEPARATOR);

  const forbidden = (needsList && listState === 'forbidden') || sheetState === 'forbidden';
  const failed = (needsList && listState === 'failed') || sheetState === 'failed';
  const loading = (needsList && listState === 'loading') || sheetState === 'loading';
  const noAssessments = needsList && listReady && courseList !== null && courseList.assessments.length === 0;

  // As the Analytics page: no page background of its own (the app's, light or dark), the title in
  // both themes' colours, the controls and the sheet on white cards.
  return (
    <div className="space-y-6" data-testid="grade-sheets-page">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/operations?tab=reports"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
            {g('back')}
          </Link>
          <Link
            to="/operations/reports/builder"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 underline dark:text-indigo-300"
            data-testid="grade-sheets-advanced"
          >
            <Settings2 size={16} />
            {g('advanced')}
          </Link>
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100" data-testid="grade-sheets-title">
          {g('title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g('subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-medium text-slate-700 sm:w-auto">
            {g('course')}
            <select
              value={courseId ?? ''}
              onChange={(event) => update({ courseId: event.target.value || null, assessment: null })}
              className="w-full max-w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto sm:min-w-[16rem]"
              data-testid="grade-sheets-course"
            >
              <option value="">{g('chooseCourse')}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {[course.course_code, course.course_name].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex min-w-0 flex-col gap-1">
            <legend className="mb-1 text-sm font-medium text-slate-700">{g('kind')}</legend>
            <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-slate-300" role="group">
              {KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => update({ kind: value })}
                  className={`px-3 py-2 text-sm font-medium ${
                    kind === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  data-testid={`grade-sheets-kind-${value}`}
                >
                  {g(KIND_LABELS[value])}
                </button>
              ))}
            </div>
          </fieldset>

          {needsList && courseList && courseList.assessments.length > 0 && (
            <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-medium text-slate-700 sm:w-auto">
              {g('assessment')}
              <select
                value={knownAssessment ? (assessmentKey ?? '') : ''}
                onChange={(event) => update({ assessment: event.target.value || null })}
                className="w-full max-w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto sm:min-w-[20rem]"
                data-testid="grade-sheets-assessment"
              >
                {courseList.assessments.map((a) => (
                  <option key={a.key} value={a.key}>
                    {assessmentOption(a)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {shown && (
            <div className="flex flex-wrap items-center gap-2" data-testid="grade-sheets-downloads">
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                <Download size={16} className="text-indigo-600" />
                {g('download')}
              </span>
              {(['pdf', 'excel'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => void download(format)}
                  disabled={exporting !== null}
                  className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  data-testid={`grade-sheets-download-${format}`}
                >
                  {g(format === 'pdf' ? 'downloadPdf' : 'downloadExcel')}
                </button>
              ))}
              <span className="text-sm" role="status">
                {exporting ? (
                  <span className="text-slate-600">{g('exporting')}</span>
                ) : exportFailed ? (
                  <span className="text-red-600">{g('exportFailed')}</span>
                ) : null}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        {coursesState === 'failed' && <p className={`mb-4 ${MESSAGE_ERROR}`}>{g('coursesFailed')}</p>}
        {forbidden ? (
          <p className={MESSAGE_ERROR}>{g('forbidden')}</p>
        ) : !courseId ? (
          <p className={MESSAGE}>{g('chooseCourse')}</p>
        ) : failed ? (
          <div className="flex flex-wrap items-center gap-3" role="alert" data-testid="grade-sheets-failed">
            <p className={MESSAGE_ERROR}>{g('loadFailed')}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              data-testid="grade-sheets-retry"
            >
              <RotateCcw size={14} />
              {g('retry')}
            </button>
          </div>
        ) : noAssessments ? (
          <p className={MESSAGE} data-testid="grade-sheets-no-assessments">
            {courseList?.enrolled === 0 ? g('noStudents') : g('noAssessments')}
          </p>
        ) : shown ? (
          <SheetView sheet={shown} g={g} categoryLabel={categoryLabel} dateFormat={dateFormat} />
        ) : loading ? (
          <p className={MESSAGE} data-testid="grade-sheets-loading">
            {g('loading')}
          </p>
        ) : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

const CELL = 'px-3 py-2 text-sm text-slate-800 whitespace-nowrap';
const HEAD = 'px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap';
const NUMBER_HEAD = 'px-3 py-2 text-right text-xs font-semibold text-slate-600 whitespace-normal';
const NUMBER_CELL = `${CELL} text-right tabular-nums`;
// The surname stays in view while a wide sheet scrolls sideways (its background hides what passes under it).
const STICKY = 'sticky left-0 z-10 shadow-[1px_0_0_0_rgb(226_232_240)]';

interface SheetViewProps {
  sheet: GradeSheet;
  g: Translate;
  categoryLabel: (labelKey: string | null, category: string | null) => string;
  dateFormat: DateFormatOption;
}

const SheetView = ({ sheet, g, categoryLabel, dateFormat }: SheetViewProps) => {
  if (sheet.rows.length === 0) {
    return (
      <p className={MESSAGE} data-testid="grade-sheets-empty">
        {g('noStudents')}
      </p>
    );
  }
  return sheet.kind === 'assessment' ? (
    <AssessmentTable sheet={sheet} g={g} categoryLabel={categoryLabel} dateFormat={dateFormat} />
  ) : (
    <FinalTable sheet={sheet} g={g} categoryLabel={categoryLabel} />
  );
};

/** The course the sheet is of, as the PDF's heading names it: never in doubt on screen. */
const CourseLine = ({ course }: { course: GradeSheetCourse }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700" data-testid="grade-sheets-course-title">
    {[courseTitle(course), course.semester].filter(Boolean).join(SEPARATOR)}
  </p>
);

const StudentCells = ({
  row,
  background = 'bg-white',
}: {
  row: { number: number; student: { student_id: string; last_name: string; first_name: string } };
  background?: string;
}) => (
  <>
    <td className={NUMBER_CELL}>{row.number}</td>
    <td className={CELL}>{row.student.student_id}</td>
    <td className={`${CELL} ${STICKY} ${background} font-medium`}>{row.student.last_name}</td>
    <td className={CELL}>{row.student.first_name}</td>
  </>
);

/** The header cells of the student columns, the surname one kept in view. */
const StudentHeads = ({ g }: { g: Translate }) => (
  <>
    <th scope="col" className={HEAD}>
      {g('number')}
    </th>
    <th scope="col" className={HEAD}>
      {g('regNo')}
    </th>
    <th scope="col" className={`${HEAD} ${STICKY} bg-slate-50`}>
      {g('surname')}
    </th>
    <th scope="col" className={HEAD}>
      {g('firstName')}
    </th>
  </>
);

/** The averages row's student cells: the label under the surname. */
const AverageLabel = ({ g }: { g: Translate }) => (
  <>
    <td className={CELL} />
    <td className={CELL} />
    <td className={`${CELL} ${STICKY} bg-slate-50 font-semibold`}>{g('average')}</td>
    <td className={CELL} />
  </>
);

const AssessmentTable = ({
  sheet,
  g,
  categoryLabel,
  dateFormat,
}: {
  sheet: AssessmentSheet;
  g: Translate;
  categoryLabel: SheetViewProps['categoryLabel'];
  dateFormat: DateFormatOption;
}) => {
  const { assessment: a, summary } = sheet;
  const heading = [
    categoryLabel(a.label_key, a.category),
    formatRange(a.first_date, a.last_date, dateFormat),
    a.max_grade !== null ? g('outOf', { max: formatNumber(a.max_grade) }) : '',
  ]
    .filter(Boolean)
    .join(SEPARATOR);
  const summaryValues = {
    graded: summary.graded,
    enrolled: summary.enrolled,
    average: formatNumber(summary.average) || '-',
    median: formatNumber(summary.median) || '-',
    highest: formatNumber(summary.highest) || '-',
    lowest: formatNumber(summary.lowest) || '-',
    passed: summary.passed,
    failed: summary.failed,
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="grade-sheets-sheet">
      <div className="px-6 pt-5">
        <CourseLine course={sheet.course} />
        <h2 className="text-lg font-semibold text-slate-900">{a.name}</h2>
        <p className="text-sm text-slate-600">{heading}</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200" data-testid="grade-sheets-table">
          <thead className="bg-slate-50">
            <tr>
              <StudentHeads g={g} />
              <th scope="col" className={NUMBER_HEAD}>
                {g('score')}
              </th>
              <th scope="col" className={NUMBER_HEAD}>
                {g('percent')}
              </th>
              <th scope="col" className={HEAD}>
                {g('remarks')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.rows.map((row) => {
              const otherMax = row.score !== null && row.max_grade !== null && row.max_grade !== a.max_grade;
              return (
                <tr
                  key={row.student.id}
                  className={row.score === null ? 'bg-slate-50 text-slate-500' : undefined}
                  data-testid={`grade-sheets-row-${row.student.id}`}
                >
                  <StudentCells row={row} background={row.score === null ? 'bg-slate-50' : 'bg-white'} />
                  <td className={NUMBER_CELL}>
                    {row.score === null ? (
                      <span className="text-slate-400" title={g('notGraded')} aria-label={g('notGraded')}>
                        {NO_FIGURE}
                      </span>
                    ) : otherMax ? (
                      `${formatNumber(row.score)} / ${formatNumber(row.max_grade)}`
                    ) : (
                      formatNumber(row.score)
                    )}
                  </td>
                  {/* cn(), as on the other two sheets: a second text colour must replace the
                      cell's own, which Tailwind emits after it and would print instead. */}
                  <td
                    className={cn(NUMBER_CELL, row.passed === false && 'text-red-700')}
                    data-testid={`grade-sheets-percent-${row.student.id}`}
                  >
                    {formatNumber(row.percentage)}
                  </td>
                  <td className={cn(CELL, 'text-slate-600')} data-testid={`grade-sheets-remarks-${row.student.id}`}>
                    {row.entries > 1 ? g('entries', { n: row.entries }) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
            <tr>
              <AverageLabel g={g} />
              <td className={CELL} />
              <td className={`${NUMBER_CELL} font-semibold`}>{formatNumber(summary.average)}</td>
              <td className={CELL} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-6 py-4 text-sm text-slate-600" data-testid="grade-sheets-summary">
        {g('summaryAssessment', summaryValues)}
      </p>
    </section>
  );
};

const finalMarks = (row: FinalFields, mixed: boolean): string =>
  [
    mixed && row.grade_basis === 'average' && row.final_grade !== null ? MARK_AVERAGE : '',
    row.result === 'failed_absences' ? MARK_OVER_LIMIT : '',
  ]
    .filter(Boolean)
    .join(' ');

const FinalTable = ({
  sheet,
  g,
  categoryLabel,
}: {
  sheet: MatrixSheet | CategoriesSheet;
  g: Translate;
  categoryLabel: SheetViewProps['categoryLabel'];
}) => {
  const titles = useMemo(() => {
    const raw = sheet.columns.map((column) => {
      if (sheet.kind === 'matrix') {
        const a = column as GradeSheetAssessment;
        return a.shared_name ? `${a.name} (${categoryLabel(a.label_key, a.category) || '-'})` : a.name || '-';
      }
      const c = column as CategoriesSheet['columns'][number];
      const label = categoryLabel(c.label_key, c.category) || '-';
      return c.weight !== null ? `${label} (${formatNumber(c.weight)}%)` : label;
    });
    // Two titles that would still read the same get a number, as on the printed sheet.
    const seen: Record<string, number> = {};
    return raw.map((title) => {
      if (raw.filter((other) => other === title).length < 2) return title;
      seen[title] = (seen[title] ?? 0) + 1;
      return `${title} [${seen[title]}]`;
    });
  }, [sheet, categoryLabel]);

  const bases = new Set(sheet.rows.filter((r) => r.final_grade !== null).map((r) => r.grade_basis));
  const mixed = bases.has('rules') && bases.has('average');
  const deductions =
    sheet.kind === 'categories' &&
    sheet.rows.some((r) => (r.participation_deduction ?? 0) + (r.absence_deduction ?? 0) > 0);
  // Plan todo 77: a Late is attended, not an absence, and the teacher weighs it at the end.
  const late = sheet.rows.some((r) => (r.late ?? 0) > 0);
  const overLimit = sheet.rows.some((r) => r.result === 'failed_absences');
  const forfeitedAny = sheet.kind === 'categories' && sheet.rows.some((r) => r.forfeited.some(Boolean));
  const summary = sheet.summary;
  const summaryValues = {
    enrolled: summary.enrolled,
    average: formatNumber(summary.final_average) || '-',
    passed: summary.passed,
    failed: summary.failed,
    absences: summary.failed_absences,
    noGrade: summary.no_grade,
  };
  const notes = [
    g(summary.failed_absences ? 'summaryFinalAbsences' : 'summaryFinal', summaryValues),
    sheet.kind === 'categories' ? g(sheet.basis === 'rules' ? 'basisRules' : 'basisGrades') : '',
    late ? g('lateNote') : '',
    deductions ? g('deductionsNote') : '',
    bases.has('rules') ? g('finalRules') : '',
    bases.has('average') ? g(bases.has('rules') ? 'finalAverageMarked' : 'finalAverage') : '',
    overLimit ? g('overLimit') : '',
    forfeitedAny ? g('forfeitedNote') : '',
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" data-testid="grade-sheets-sheet">
      <div className="px-6 pt-5">
        <CourseLine course={sheet.course} />
        <h2 className="text-lg font-semibold text-slate-900">{g(KIND_LABELS[sheet.kind])}</h2>
        {sheet.columns.length === 0 && (
          <p className="text-sm text-slate-600" data-testid="grade-sheets-no-columns">
            {g(bases.size > 0 ? 'ratingsOnly' : 'noColumns')}
          </p>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200" data-testid="grade-sheets-table">
          <thead className="bg-slate-50">
            <tr>
              <StudentHeads g={g} />
              {titles.map((title, index) => (
                <th key={sheet.columns[index].key} scope="col" className={NUMBER_HEAD}>
                  {title}
                </th>
              ))}
              {late && (
                <th scope="col" className={NUMBER_HEAD}>
                  {g('late')}
                </th>
              )}
              {deductions && (
                <th scope="col" className={NUMBER_HEAD}>
                  {g('deductions')}
                </th>
              )}
              <th scope="col" className={NUMBER_HEAD}>
                {g('finalGrade')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.rows.map((row) => {
              const marks = finalMarks(row, mixed);
              const lost = (row.participation_deduction ?? 0) + (row.absence_deduction ?? 0);
              return (
                <tr key={row.student.id} data-testid={`grade-sheets-row-${row.student.id}`}>
                  <StudentCells row={row} />
                  {row.cells.map((value, index) => {
                    const zeroed = sheet.kind === 'categories' && (row as CategoriesSheet['rows'][number]).forfeited[index];
                    return (
                      <td
                        key={sheet.columns[index].key}
                        // cn(): a second text colour must replace the cell's grey, which Tailwind
                        // would otherwise emit after red and so print instead of it.
                        className={cn(NUMBER_CELL, zeroed && 'text-red-700')}
                        title={zeroed ? g('forfeitedCell') : undefined}
                      >
                        {zeroed ? `0 ${MARK_FORFEITED}` : formatNumber(value)}
                      </td>
                    );
                  })}
                  {late && (
                    <td className={NUMBER_CELL} data-testid={`grade-sheets-late-${row.student.id}`}>
                      {row.late ? row.late : ''}
                    </td>
                  )}
                  {deductions && <td className={NUMBER_CELL}>{lost ? formatNumber(-lost) : ''}</td>}
                  <td
                    className={cn(
                      NUMBER_CELL,
                      'font-semibold',
                      (row.result === 'failed' || row.result === 'failed_absences') && 'text-red-700'
                    )}
                    data-testid={`grade-sheets-final-${row.student.id}`}
                  >
                    {formatNumber(row.final_grade) || (marks ? NO_FIGURE : '')}
                    {marks && (
                      <span
                        className="ml-1"
                        title={row.result === 'failed_absences' ? g('overLimitBadge') : g('averageBasisCell')}
                      >
                        {marks}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
            <tr>
              <AverageLabel g={g} />
              {sheet.column_averages.map((value, index) => (
                <td key={sheet.columns[index].key} className={`${NUMBER_CELL} font-semibold`}>
                  {formatNumber(value)}
                </td>
              ))}
              {late && <td className={CELL} />}
              {deductions && <td className={CELL} />}
              <td className={`${NUMBER_CELL} font-semibold`}>{formatNumber(summary.final_average)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="space-y-1 px-6 py-4 text-sm text-slate-600" data-testid="grade-sheets-notes">
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </section>
  );
};

export default GradeSheetsPage;
