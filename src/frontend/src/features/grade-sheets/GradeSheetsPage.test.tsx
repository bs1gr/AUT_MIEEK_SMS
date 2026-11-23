import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import GradeSheetsPage from './GradeSheetsPage';
import { gradeSheetsLink } from './gradeSheetsLink';
import { gradeSheetsAPI } from '@/api/gradeSheetsAPI';
import { coursesAPI } from '@/api/api';

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);
// What the language and date settings say; a test may change them before it renders.
const settings = { language: 'el', dateFormat: 'gr-ddmmyyyy' };
vi.mock('@/LanguageContext', () => ({ useLanguage: () => ({ t, language: settings.language }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeSettings: () => ({ dateFormat: settings.dateFormat }),
}));
vi.mock('@/api/gradeSheetsAPI', () => ({
  gradeSheetsAPI: { assessments: vi.fn(), sheet: vi.fn(), exportFile: vi.fn() },
}));
vi.mock('@/api/api', () => ({ coursesAPI: { getAll: vi.fn() } }));
const downloadBlob = vi.fn();
vi.mock('@/utils/downloadFile', () => ({ downloadBlob: (...args: unknown[]) => downloadBlob(...args) }));

const api = gradeSheetsAPI as unknown as Record<'assessments' | 'sheet' | 'exportFile', ReturnType<typeof vi.fn>>;
const courses = coursesAPI as unknown as { getAll: ReturnType<typeof vi.fn> };

const g = (key: string) => `reports.gradeSheets.${key}`;
const course = (id: number, code = id === 7 ? 'MATH' : 'PHYS') => ({
  id,
  course_code: code,
  course_name: `Course ${code}`,
  semester: 'Fall',
});
const student = (id: number, last: string, first: string) => ({ id, student_id: `GS${id}`, last_name: last, first_name: first });
const assessment = (overrides: Record<string, unknown> = {}) => ({
  key: 'final|τελικη',
  name: 'Τελική',
  category: 'Final Exam',
  category_key: 'final',
  label_key: 'final',
  max_grade: 20,
  first_date: '2026-02-01',
  last_date: '2026-02-03',
  graded: 2,
  enrolled: 3,
  shared_name: false,
  ...overrides,
});
const listOf = (assessments: ReturnType<typeof assessment>[], enrolled = 3, courseId = 7) => ({
  course: course(courseId),
  enrolled,
  assessments,
});
const final = (overrides: Record<string, unknown> = {}) => ({
  final_grade: 77,
  grade_basis: 'rules',
  result: 'passed',
  absence_status: 'ok',
  participation_forfeited: false,
  participation_deduction: 0,
  absence_deduction: 0,
  ...overrides,
});

const assessmentSheet = {
  kind: 'assessment',
  course: course(7),
  assessment: assessment(),
  rows: [
    { number: 1, student: student(2, 'Άβερωφ', 'Ελένη'), score: 9, max_grade: 20, percentage: 45, date: '2026-02-01', entries: 1, passed: false },
    { number: 2, student: student(3, 'Ελευθερίου', 'Μαρία'), score: null, max_grade: null, percentage: null, date: null, entries: 0, passed: null },
    { number: 3, student: student(1, 'Ζήσης', 'Νίκος'), score: 15, max_grade: 20, percentage: 75, date: '2026-02-03', entries: 2, passed: true },
    { number: 4, student: student(4, 'Ιωάννου', 'Άννα'), score: 75, max_grade: 100, percentage: 75, date: '2026-02-03', entries: 1, passed: true },
  ],
  summary: { enrolled: 4, graded: 3, missing: 1, average: 65, median: 75, highest: 75, lowest: 45, passed: 2, failed: 1 },
};

/** A matrix sheet of the course, with one student named after it. */
const matrixOf = (courseId: number, surname: string, finals: Record<string, unknown>[] = [{}]) => ({
  kind: 'matrix',
  course: course(courseId),
  columns: [assessment()],
  column_averages: [75],
  rows: finals.map((overrides, index) => ({
    number: index + 1,
    student: student(index + 1, index ? `${surname}${index}` : surname, 'Χ'),
    cells: [75],
    ...final(overrides),
  })),
  summary: { enrolled: finals.length, final_average: 77, passed: finals.length, failed: 0, failed_absences: 0, no_grade: 0 },
});

const LocationProbe = () => <div data-testid="location">{useLocation().search}</div>;

const renderPage = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/operations/reports/grade-sheets${search}`]}>
      <Routes>
        <Route
          path="/operations/reports/grade-sheets"
          element={
            <>
              <GradeSheetsPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const pickCourse = async (id: number) => {
  await screen.findByRole('option', { name: `${course(id).course_code} - Course ${course(id).course_code}` });
  fireEvent.change(screen.getByTestId('grade-sheets-course'), { target: { value: String(id) } });
};

describe('GradeSheetsPage', () => {
  beforeEach(() => {
    // Reset, not just clear: an implementation one test sets must not leak into the next.
    vi.resetAllMocks();
    settings.language = 'el';
    settings.dateFormat = 'gr-ddmmyyyy';
    courses.getAll.mockResolvedValue([course(8), course(7)]);
    api.assessments.mockResolvedValue(listOf([assessment()]));
    // An assessment sheet of whatever course and assessment is asked for.
    api.sheet.mockImplementation((id: number, _kind: string, key?: string) =>
      Promise.resolve({ ...assessmentSheet, course: course(id), assessment: assessment({ key }) })
    );
  });

  it('lists the courses by code and asks for one', async () => {
    renderPage();

    const select = await screen.findByTestId('grade-sheets-course');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      g('chooseCourse'),
      'MATH - Course MATH',
      'PHYS - Course PHYS',
    ]);
    expect(api.assessments).not.toHaveBeenCalled();
    expect(screen.getByTestId('grade-sheets-advanced')).toHaveAttribute('href', '/operations/reports/builder');
  });

  it('opens the newest assessment and lists every student, graded or not', async () => {
    const homework = assessment({ key: 'homework|ασκηση 1', name: 'Άσκηση 1', category: 'Homework', category_key: 'homework', label_key: 'homework', first_date: '2026-01-20', last_date: '2026-01-21' });
    api.assessments.mockResolvedValue(listOf([homework, assessment()]));

    renderPage('?courseId=7');

    await waitFor(() => expect(api.sheet).toHaveBeenCalledWith(7, 'assessment', 'final|τελικη'));
    expect(screen.getByTestId('location')).toHaveTextContent('assessment=final');
    const table = await screen.findByTestId('grade-sheets-table');
    const rows = within(table).getAllByRole('row').slice(1, -1).map((row) => row.textContent);
    expect(rows).toEqual([
      '1GS2ΆβερωφΕλένη945',
      '2GS3ΕλευθερίουΜαρία–',
      `3GS1ΖήσηςΝίκος1575${g('entries')} {"n":2}`,
      '4GS4ΙωάννουΆννα75 / 10075', // another maximum than the assessment's 20: say out of what
    ]);
    expect(screen.getByTestId('grade-sheets-row-3')).toHaveClass('bg-slate-50'); // not graded
    expect(screen.getByTestId('grade-sheets-summary')).toHaveTextContent(g('summaryAssessment'));
    expect(screen.getByTestId('grade-sheets-course-title')).toHaveTextContent('MATH - Course MATH · Fall');
    // Each option names the category, the dates (first - last, as the order follows the first)
    // and how many are graded.
    const options = within(screen.getByTestId('grade-sheets-assessment')).getAllByRole('option');
    expect(options[1]).toHaveTextContent(
      `Τελική · ${g('categories.final')} · 01/02/2026 - 03/02/2026 · ${g('assessmentGraded')}`
    );
  });

  it('writes the dates in the format the settings choose', async () => {
    settings.dateFormat = 'en-us';

    renderPage('?courseId=7');

    const options = await screen.findAllByRole('option', { name: /Τελική/ });
    expect(options[0]).toHaveTextContent('02/01/2026 - 02/03/2026');
  });

  it('keeps an assessment the address names, and follows the picker', async () => {
    const homework = assessment({ key: 'homework|ασκηση 1', name: 'Άσκηση 1' });
    api.assessments.mockResolvedValue(listOf([homework, assessment()]));

    renderPage('?courseId=7&assessment=homework%7C%CE%B1%CF%83%CE%BA%CE%B7%CF%83%CE%B7%201');

    await screen.findByTestId('grade-sheets-table');
    expect(api.sheet).toHaveBeenLastCalledWith(7, 'assessment', 'homework|ασκηση 1');
    expect(screen.getByTestId('grade-sheets-assessment')).toHaveValue('homework|ασκηση 1');
    expect(api.sheet).not.toHaveBeenCalledWith(7, 'assessment', 'final|τελικη');

    fireEvent.change(screen.getByTestId('grade-sheets-assessment'), { target: { value: 'final|τελικη' } });
    await waitFor(() => expect(api.sheet).toHaveBeenLastCalledWith(7, 'assessment', 'final|τελικη'));
  });

  it('opens the newest when the address names an assessment the course does not have', async () => {
    renderPage('?courseId=7&assessment=gone%7Cold');

    await screen.findByTestId('grade-sheets-table');
    expect(api.sheet).toHaveBeenLastCalledWith(7, 'assessment', 'final|τελικη');
    expect(api.sheet).not.toHaveBeenCalledWith(7, 'assessment', 'gone|old');
  });

  it('shows every assessment with the marks and notes of the printed sheet', async () => {
    api.sheet.mockResolvedValue({
      kind: 'matrix',
      course: course(7),
      columns: [
        assessment({ key: 'lab|ασκηση 1', name: 'Άσκηση 1', category: 'Lab Work', label_key: 'lab', shared_name: true }),
        assessment({ key: 'homework|ασκηση 1', name: 'Άσκηση 1', category: 'Homework', label_key: 'homework', shared_name: true }),
        assessment({ key: 'custom:θεωρια|θεωρια', name: 'Θεωρία', category: 'Θεωρητική Εξέταση', label_key: null }),
      ],
      column_averages: [60, 80, 70],
      rows: [
        { number: 1, student: student(1, 'Αντωνίου', 'Λία'), cells: [60, 80, 70], ...final({ final_grade: 72, result: 'failed_absences', absence_status: 'insufficient' }) },
        { number: 2, student: student(2, 'Βασιλείου', 'Τάσος'), cells: [null, null, null], ...final({ final_grade: 85, grade_basis: 'average' }) },
      ],
      summary: { enrolled: 2, final_average: 78.5, passed: 1, failed: 1, failed_absences: 1, no_grade: 0 },
    });

    renderPage('?courseId=7&kind=matrix');

    const table = await screen.findByTestId('grade-sheets-table');
    expect(api.sheet).toHaveBeenCalledWith(7, 'matrix', undefined);
    expect(api.assessments).not.toHaveBeenCalled(); // only one assessment needs the list
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers.slice(4)).toEqual([
      `Άσκηση 1 (${g('categories.lab')})`, // the same name under two categories says which
      `Άσκηση 1 (${g('categories.homework')})`,
      'Θεωρία',
      g('finalGrade'),
    ]);
    expect(screen.getByTestId('grade-sheets-final-1')).toHaveTextContent('72*');
    expect(screen.getByTestId('grade-sheets-final-2')).toHaveTextContent('85†');
    const notes = screen.getByTestId('grade-sheets-notes').textContent;
    expect(notes).toContain(g('summaryFinalAbsences'));
    expect(notes).toContain(g('finalRules'));
    expect(notes).toContain(g('finalAverageMarked'));
    expect(notes).toContain(g('overLimit'));
    expect(screen.queryByTestId('grade-sheets-assessment')).not.toBeInTheDocument();
  });

  it('marks no final grade † when every one comes from the mean of the grades', async () => {
    api.sheet.mockResolvedValue(
      matrixOf(7, 'Ευαγγέλου', [{ final_grade: 70, grade_basis: 'average' }, { final_grade: 64, grade_basis: 'average' }])
    );

    renderPage('?courseId=7&kind=matrix');

    expect(await screen.findByTestId('grade-sheets-final-1')).toHaveTextContent(/^70$/);
    const notes = screen.getByTestId('grade-sheets-notes').textContent;
    expect(notes).toContain(g('finalAverage'));
    expect(notes).not.toContain(g('finalAverageMarked'));
    expect(notes).not.toContain(g('finalRules'));
  });

  it('shows the categories with their weights, the deductions and the cells lost to absences', async () => {
    api.sheet.mockResolvedValue({
      kind: 'categories',
      course: course(7),
      basis: 'rules',
      columns: [
        { key: 'rule:0', category: 'Class Participation', category_key: 'participation', label_key: 'participation', weight: 10 },
        { key: 'rule:1', category: 'Πρακτική Εξέταση', category_key: 'exam', label_key: null, weight: 90 },
      ],
      column_averages: [45, 80],
      rows: [
        { number: 1, student: student(1, 'Δημητρίου', 'Στέλλα'), cells: [0, 80], forfeited: [true, false], ...final({ final_grade: 72 }) },
        { number: 2, student: student(2, 'Ιωάννου', 'Ραφαέλα'), cells: [90, 80], forfeited: [false, false], ...final({ final_grade: 71.4, participation_deduction: 9.6 }) },
      ],
      summary: { enrolled: 2, final_average: 71.7, passed: 2, failed: 0, failed_absences: 0, no_grade: 0 },
    });

    renderPage('?courseId=7&kind=categories');

    const table = await screen.findByTestId('grade-sheets-table');
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers.slice(4)).toEqual([
      `${g('categories.participation')} (10%)`,
      'Πρακτική Εξέταση (90%)', // a course's own rule name, as typed
      g('deductions'),
      g('finalGrade'),
    ]);
    const first = within(screen.getByTestId('grade-sheets-row-1')).getAllByRole('cell').map((c) => c.textContent);
    expect(first.slice(4)).toEqual(['0 ‡', '80', '', '72']);
    const second = within(screen.getByTestId('grade-sheets-row-2')).getAllByRole('cell').map((c) => c.textContent);
    expect(second.slice(4)).toEqual(['90', '80', '-9.6', '71.4']);
    const notes = screen.getByTestId('grade-sheets-notes').textContent;
    expect(notes).toContain(g('basisRules'));
    expect(notes).toContain(g('deductionsNote'));
    expect(notes).toContain(g('forfeitedNote'));
  });

  it('says when final grades come from the daily ratings alone', async () => {
    api.sheet.mockResolvedValue({
      ...matrixOf(7, 'Ορφανίδης', [{ final_grade: 80 }]),
      columns: [],
      column_averages: [],
      rows: [{ number: 1, student: student(1, 'Ορφανίδης', 'Πέτρος'), cells: [], ...final({ final_grade: 80 }) }],
    });

    renderPage('?courseId=7&kind=matrix');

    expect(await screen.findByTestId('grade-sheets-no-columns')).toHaveTextContent(g('ratingsOnly'));
  });

  it('downloads the sheet on screen in the language of the page', async () => {
    const blob = new Blob(['%PDF']);
    api.exportFile.mockResolvedValue({ blob, filename: 'grade_sheet_MATH_assessment_Teliki_20261123.pdf' });

    renderPage('?courseId=7');
    fireEvent.click(await screen.findByTestId('grade-sheets-download-pdf'));

    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(blob, 'grade_sheet_MATH_assessment_Teliki_20261123.pdf')
    );
    expect(api.exportFile).toHaveBeenCalledWith(7, 'pdf', { kind: 'assessment', assessment: 'final|τελικη', lang: 'el' });
  });

  it('downloads in English when the page is in English', async () => {
    settings.language = 'en';
    api.sheet.mockResolvedValue(matrixOf(7, 'Αντωνίου'));
    api.exportFile.mockResolvedValue({ blob: new Blob(['x']), filename: 'grade_sheet_MATH_matrix_20261123.xlsx' });

    renderPage('?courseId=7&kind=matrix');
    fireEvent.click(await screen.findByTestId('grade-sheets-download-excel'));

    await waitFor(() =>
      expect(api.exportFile).toHaveBeenCalledWith(7, 'excel', { kind: 'matrix', assessment: undefined, lang: 'en' })
    );
  });

  it('says when a file could not be made', async () => {
    api.exportFile.mockRejectedValue(new Error('500'));

    renderPage('?courseId=7');
    fireEvent.click(await screen.findByTestId('grade-sheets-download-excel'));

    expect(await screen.findByText(g('exportFailed'))).toBeInTheDocument();
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('says when a course has nothing graded, or nobody enrolled', async () => {
    api.assessments.mockResolvedValueOnce(listOf([], 3));
    const { unmount } = renderPage('?courseId=7');
    expect(await screen.findByTestId('grade-sheets-no-assessments')).toHaveTextContent(g('noAssessments'));
    expect(api.sheet).not.toHaveBeenCalled();
    unmount();

    api.assessments.mockResolvedValueOnce(listOf([], 0));
    renderPage('?courseId=7');
    expect(await screen.findByTestId('grade-sheets-no-assessments')).toHaveTextContent(g('noStudents'));
  });

  it('says so when the account may not open grade sheets', async () => {
    api.assessments.mockRejectedValue({ response: { status: 403 } });

    renderPage('?courseId=7');

    expect(await screen.findByText(g('forbidden'))).toBeInTheDocument();
  });

  it('tries again after a failure', async () => {
    api.assessments.mockRejectedValueOnce(new Error('timeout'));

    renderPage('?courseId=7');
    fireEvent.click(await screen.findByTestId('grade-sheets-retry'));

    expect(await screen.findByTestId('grade-sheets-table')).toBeInTheDocument();
    expect(api.assessments).toHaveBeenCalledTimes(2);
  });

  it('does not show the previous sheet while the next one loads', async () => {
    const next = deferred<ReturnType<typeof matrixOf>>();
    api.sheet.mockImplementation((id: number) => (id === 7 ? Promise.resolve(matrixOf(7, 'Αθηνών')) : next.promise));

    renderPage('?courseId=7&kind=matrix');
    expect(await screen.findByText('Αθηνών')).toBeInTheDocument();
    await pickCourse(8);

    // Course 7's students must not stand under course 8, nor be downloadable as course 8's.
    expect(await screen.findByTestId('grade-sheets-loading')).toBeInTheDocument();
    expect(screen.queryByText('Αθηνών')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grade-sheets-downloads')).not.toBeInTheDocument();

    next.resolve(matrixOf(8, 'Πατρών'));
    expect(await screen.findByText('Πατρών')).toBeInTheDocument();
    expect(screen.getByTestId('grade-sheets-course-title')).toHaveTextContent('PHYS - Course PHYS');
  });

  it('ignores a sheet that arrives for a course no longer chosen', async () => {
    const slow = deferred<ReturnType<typeof matrixOf>>();
    api.sheet.mockImplementation((id: number) => (id === 7 ? slow.promise : Promise.resolve(matrixOf(8, 'Πατρών'))));

    renderPage('?courseId=7&kind=matrix');
    await pickCourse(8);
    expect(await screen.findByText('Πατρών')).toBeInTheDocument();
    slow.resolve(matrixOf(7, 'Αθηνών'));

    expect(await screen.findByText('Πατρών')).toBeInTheDocument();
    await new Promise((done) => setTimeout(done, 20));
    expect(screen.queryByText('Αθηνών')).not.toBeInTheDocument();
    expect(screen.getByTestId('grade-sheets-course-title')).toHaveTextContent('PHYS');
  });

  it('ignores the assessments that arrive for a course no longer chosen', async () => {
    const slow = deferred<ReturnType<typeof listOf>>();
    api.assessments.mockImplementation((id: number) =>
      id === 7 ? slow.promise : Promise.resolve(listOf([assessment({ key: 'phys|lab', name: 'Lab' })], 3, 8))
    );

    renderPage('?courseId=7');
    await pickCourse(8);
    await waitFor(() => expect(api.sheet).toHaveBeenCalledWith(8, 'assessment', 'phys|lab'));
    slow.resolve(listOf([assessment()], 3, 7));
    await new Promise((done) => setTimeout(done, 20));

    await waitFor(() =>
      expect(within(screen.getByTestId('grade-sheets-assessment')).getAllByRole('option').map((o) => o.textContent)).toEqual([
        expect.stringContaining('Lab'),
      ])
    );
    expect(api.sheet).toHaveBeenLastCalledWith(8, 'assessment', 'phys|lab');
    expect(screen.getByTestId('location')).toHaveTextContent('courseId=8&assessment=phys%7Clab');
  });

  it("opens the new course's newest assessment, not one with the old course's key", async () => {
    // Both courses have "Τελική" under Final Exam; course 8's newest is its lab.
    api.assessments.mockImplementation((id: number) =>
      Promise.resolve(
        id === 7
          ? listOf([assessment()], 3, 7)
          : listOf([assessment({ first_date: '2026-01-10' }), assessment({ key: 'lab|εργαστηριο 2', name: 'Εργαστήριο 2', first_date: '2026-03-01' })], 3, 8)
      )
    );

    renderPage('?courseId=7');
    await waitFor(() => expect(api.sheet).toHaveBeenCalledWith(7, 'assessment', 'final|τελικη'));
    await screen.findByTestId('grade-sheets-table');
    await pickCourse(8);

    await waitFor(() => expect(api.sheet).toHaveBeenLastCalledWith(8, 'assessment', 'lab|εργαστηριο 2'));
    expect(api.sheet).not.toHaveBeenCalledWith(8, 'assessment', 'final|τελικη');
  });
});

describe('gradeSheetsLink', () => {
  it('opens a course and a kind of sheet', () => {
    expect(gradeSheetsLink()).toBe('/operations/reports/grade-sheets');
    expect(gradeSheetsLink(7)).toBe('/operations/reports/grade-sheets?courseId=7');
    expect(gradeSheetsLink(7, 'categories')).toBe('/operations/reports/grade-sheets?courseId=7&kind=categories');
  });
});
