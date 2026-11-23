import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  AnalyticsCategoryMatrix,
  AnalyticsCategoryProfile,
  categoriesForCourse,
  categoryName,
  formatDifference,
} from '../AnalyticsCategories';
import type { ClassCategories, StudentCategory } from '@/api/hooks/useAnalytics';

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);

const course = (id: number, code: string, average: number | null, classAverage: number | null, signal: StudentCategory['signal'] = null) => ({
  id,
  course_code: code,
  course_name: `Course ${code}`,
  average,
  class_average: classAverage,
  signal,
});

// As the server sends them: one decimal, the difference of the figures as shown.
const categories: StudentCategory[] = [
  {
    key: 'final',
    label_key: 'final',
    name: 'Final Exam',
    average: 90,
    class_average: 80,
    difference: 10,
    signal: 'strength',
    courses: [course(3, 'C101', 90, 80, 'strength')],
  },
  {
    key: 'exam',
    label_key: 'exam',
    name: 'Θεωρητική Εξέταση',
    average: 37.5,
    class_average: 61.3,
    difference: -23.8,
    signal: 'difficulty',
    courses: [course(1, 'A101', 45, 70, 'difficulty'), course(2, 'B101', 30, 52.5, 'difficulty')],
  },
  {
    key: 'custom:οπτικοποιηση',
    label_key: null,
    name: 'Οπτικοποίηση',
    average: 70,
    class_average: 68,
    difference: 2,
    signal: null,
    courses: [course(2, 'B101', 70, 68)],
  },
];

const rowName = (row: HTMLElement) => within(row).getByRole('rowheader').textContent;

describe('AnalyticsCategoryProfile', () => {
  it('lists each category against the class, with its courses and what stands out', () => {
    render(<AnalyticsCategoryProfile t={t} categories={categories} singleCourse={false} />);

    const rows = within(screen.getByTestId('analytics-category-table')).getAllByRole('row').slice(1);
    expect(rows.map(rowName)).toEqual([
      `reports.gradeSheets.categories.final${'analytics.categories.strength'}`,
      `reports.gradeSheets.categories.exam${'analytics.categories.difficulty'}`,
      'Οπτικοποίηση', // a course's own category keeps its name
    ]);
    const exam = within(screen.getByTestId('analytics-category-exam')).getAllByRole('cell');
    expect(exam.slice(0, 3).map((c) => c.textContent)).toEqual(['37.5%', '61.3%', '-23.8']);
    // Each course's mark has its sign and, for screen readers, its word: not colour alone.
    expect(exam[4].textContent).toBe(
      'A101 45.0%▼analytics.categories.difficultyB101 30.0%▼analytics.categories.difficulty'
    );
    expect(within(exam[4]).getAllByText('▼')[0]).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('analytics-category-final')).toHaveTextContent('+10.0');

    // The difference's colour replaces the cell's grey instead of racing it in the stylesheet.
    expect(exam[2]).toHaveClass('text-red-700');
    expect(exam[2]).not.toHaveClass('text-slate-700');
    // On a phone the category stays in view while the row scrolls; a chip never breaks in two.
    expect(within(screen.getByTestId('analytics-category-exam')).getByRole('rowheader')).toHaveClass('sticky');
    expect(screen.getByRole('columnheader', { name: 'analytics.categories.category' })).toHaveClass('sticky');
    expect(within(exam[4]).getByText(/A101/)).toHaveClass('whitespace-nowrap');
    // The bar uses colours no appearance repaints (ΜΙΕΕΚ Dark blackens bg-slate-50/100 and any
    // class containing "bg-slate-50", and turns bg-indigo-500 into a hollow button).
    const track = exam[3].firstElementChild as HTMLElement;
    expect(track).toHaveClass('bg-slate-200');
    expect(track.children[0]).toHaveClass('bg-indigo-400');
    expect(track.children[1]).toHaveClass('bg-zinc-500');

    const summary = screen.getByTestId('analytics-category-summary').textContent;
    expect(summary).toContain('analytics.categories.difficulties {"list":"reports.gradeSheets.categories.exam"}');
    expect(summary).toContain('analytics.categories.strengths {"list":"reports.gradeSheets.categories.final"}');
    expect(screen.getByText('analytics.categories.help')).toBeInTheDocument();
    expect(screen.getByText('analytics.categories.legend')).toBeInTheDocument();
  });

  it('leaves the courses out for one course, and says when nothing stands out or nothing is graded', () => {
    const quiet = [{ ...categories[2] }];
    const { rerender } = render(<AnalyticsCategoryProfile t={t} categories={quiet} singleCourse />);
    expect(screen.queryByText('analytics.categories.courses')).not.toBeInTheDocument();
    expect(screen.getByText('analytics.categories.helpCourse')).toBeInTheDocument();
    expect(screen.getByText('analytics.categories.noSignals')).toBeInTheDocument();

    rerender(<AnalyticsCategoryProfile t={t} categories={[]} singleCourse={false} />);
    expect(screen.getByText('analytics.categories.noData')).toBeInTheDocument();
    expect(screen.queryByText('analytics.categories.legend')).not.toBeInTheDocument();
  });

  it('says that Class Participation lost to absences does not count, not that nothing is graded', () => {
    render(<AnalyticsCategoryProfile t={t} categories={[]} singleCourse={false} participationLost />);

    expect(screen.getByText('analytics.categories.noDataLost')).toBeInTheDocument();
    expect(screen.queryByText('analytics.categories.noData')).not.toBeInTheDocument();
    expect(screen.getByText('analytics.categories.legend')).toBeInTheDocument();
  });

  it('shows nothing for a server that sends no categories', () => {
    const { container } = render(<AnalyticsCategoryProfile t={t} categories={undefined} singleCourse={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says when the grades are outside the course rules, empty or not', () => {
    const { rerender } = render(
      <AnalyticsCategoryProfile t={t} categories={[]} singleCourse={false} outsideRules={['Course NET']} />
    );
    expect(screen.getByText('analytics.categories.noDataOutsideRules')).toBeInTheDocument();
    expect(screen.queryByText('analytics.categories.noData')).not.toBeInTheDocument();

    rerender(<AnalyticsCategoryProfile t={t} categories={categories} singleCourse={false} outsideRules={['Course NET']} />);
    expect(screen.getByText('analytics.categories.outsideRules {"courses":"Course NET"}')).toBeInTheDocument();
  });
});

describe('categoriesForCourse', () => {
  it("keeps everything across the courses, or one course's own figures and signal", () => {
    expect(categoriesForCourse(categories, null)).toBe(categories);

    const b101 = categoriesForCourse(categories, 2);
    expect(b101.map((c) => [c.key, c.average, c.class_average, c.difference, c.signal])).toEqual([
      ['exam', 30, 52.5, -22.5, 'difficulty'],
      ['custom:οπτικοποιηση', 70, 68, 2, null],
    ]);
    expect(b101[0].courses).toHaveLength(1);
  });
});

describe('categoryName', () => {
  it('translates a standard category, names a grade without one, and keeps any other name', () => {
    expect(categoryName(t, { label_key: 'lab', name: 'Εργαστήριο' })).toBe('reports.gradeSheets.categories.lab');
    expect(categoryName(t, { label_key: 'uncategorized', name: '' })).toBe('reports.gradeSheets.categories.uncategorized');
    expect(categoryName(t, { label_key: null, name: 'Οπτικοποίηση' })).toBe('Οπτικοποίηση');
  });
});

describe('formatDifference', () => {
  it('signs the difference, rounds a half away from zero, and never prints -0.0', () => {
    expect([10, -2.54, 0.04, -0.04, 0, -23.75, 23.75, null].map((v) => formatDifference(v))).toEqual([
      '+10.0',
      '-2.5',
      '0.0',
      '0.0',
      '0.0',
      '-23.8',
      '+23.8',
      '—',
    ]);
  });
});

const block: ClassCategories = {
  columns: [
    { key: 'final', label_key: 'final', name: 'Final Exam' },
    { key: 'exam', label_key: 'exam', name: 'Εξέταση' },
    { key: 'lab', label_key: 'lab', name: 'Lab Work' },
  ],
  averages: [80, 68.3, 75],
  students: [
    {
      id: 1,
      name: 'Ανδρέας Αλεξίου',
      cells: [90, 72.5, 75],
      class_averages: [80, 61.3, 75],
      signals: ['strength', 'strength', null],
      difficulties: 0,
      strengths: 2,
    },
    {
      id: 2,
      name: 'Βάσω Βασιλείου',
      cells: [null, 37.5, 50],
      class_averages: [null, 61.3, 60],
      signals: [null, 'difficulty', 'difficulty'],
      difficulties: 2,
      strengths: 0,
    },
    {
      id: 3,
      name: 'Γιώργος Γεωργίου',
      cells: [70, 95, 100],
      class_averages: [80, 70, 90],
      signals: ['difficulty', 'strength', 'strength'],
      difficulties: 1,
      strengths: 2,
    },
  ],
  courses: [
    { id: 1, course_code: 'A101', course_name: 'Course A', cells: [null, 70, null] },
    { id: 3, course_code: 'C101', course_name: 'Course C', cells: [80, null, 90] },
  ],
};

describe('AnalyticsCategoryMatrix', () => {
  it('puts the students with the most difficulties first and marks each cell, in words too', () => {
    const onOpenStudent = vi.fn();
    render(<AnalyticsCategoryMatrix t={t} block={block} onOpenStudent={onOpenStudent} />);

    const matrix = screen.getByTestId('analytics-category-matrix');
    expect(within(matrix).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Βάσω Βασιλείου',
      'Γιώργος Γεωργίου',
      'Ανδρέας Αλεξίου',
    ]);
    const vasoRow = screen.getByTestId('analytics-category-student-2');
    expect(rowName(vasoRow)).toBe('Βάσω Βασιλείου'); // the name heads its row for screen readers
    const vaso = within(vasoRow).getAllByRole('cell');
    // Each figure, its mark as a sign with its word, and how far it is from what it was judged
    // against, on screen and not only on hover: 37.5 is 23.8 under the same courses' 61.3.
    expect(vaso.map((c) => c.textContent)).toEqual([
      '—',
      '37.5%▼analytics.categories.difficulty-23.8',
      '50.0%▼analytics.categories.difficulty-10.0',
      '2',
    ]);
    expect(vaso.map((c) => c.getAttribute('data-signal'))).toEqual([null, 'difficulty', 'difficulty', null]);
    expect(vaso.map((c) => c.getAttribute('title'))).toEqual([
      null,
      'analytics.categories.difficulty · analytics.categories.sameCourses {"value":"61.3%"}',
      'analytics.categories.difficulty · analytics.categories.sameCourses {"value":"60.0%"}',
      null,
    ]);
    // The marked cell's tone and the count's red replace the grey, as written.
    expect(vaso[1]).toHaveClass('text-red-800');
    expect(vaso[1]).not.toHaveClass('text-slate-700');
    expect(vaso[3]).toHaveClass('text-red-700');
    const andreas = within(screen.getByTestId('analytics-category-student-1')).getAllByRole('cell');
    expect(andreas[2]).toHaveAttribute('title', 'analytics.categories.sameCourses {"value":"75.0%"}');
    expect(andreas[2].textContent).toBe('75.0%0.0'); // no mark: no sign, and level with its average
    expect(andreas[0]).toHaveClass('text-emerald-700');

    // The bottom row is the students' own average, not what the marks are judged against.
    const footer = matrix.querySelector('tfoot tr') as HTMLElement;
    expect(rowName(footer)).toBe('analytics.categories.studentsAverage');
    expect(within(footer).getByText('68.3%')).toBeInTheDocument();
    expect(within(matrix).getByText('analytics.categories.matrixTitle')).toBeInTheDocument();
    expect(within(matrix).getByText('analytics.categories.matrixLegend')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Γιώργος Γεωργίου' }));
    expect(onOpenStudent).toHaveBeenCalledWith(3);

    const courses = within(screen.getByTestId('analytics-category-courses')).getAllByRole('row').slice(1);
    expect(courses.map((row) => row.textContent)).toEqual(['Course AA101—70.0%—', 'Course CC10180.0%—90.0%']);
    expect(courses.map(rowName)).toEqual(['Course AA101', 'Course CC101']);
  });

  it('names one course as the scope when a course is chosen, in the legend and tooltips too', () => {
    render(<AnalyticsCategoryMatrix t={t} block={block} singleCourse onOpenStudent={() => undefined} />);

    const matrix = screen.getByTestId('analytics-category-matrix');
    expect(within(matrix).getByText('analytics.categories.matrixTitleCourse')).toBeInTheDocument();
    expect(within(matrix).getByText('analytics.categories.matrixHelpCourse')).toBeInTheDocument();
    expect(within(matrix).getByText('analytics.categories.matrixLegendCourse')).toBeInTheDocument();
    expect(within(matrix).queryByText('analytics.categories.matrixTitle')).not.toBeInTheDocument();
    const lab = within(screen.getByTestId('analytics-category-student-1')).getAllByRole('cell')[2];
    expect(lab).toHaveAttribute('title', 'analytics.categories.courseAverage {"value":"75.0%"}');
  });

  it('says how many students of the selection it leaves out, if any', () => {
    const { rerender } = render(<AnalyticsCategoryMatrix t={t} block={block} unlisted={2} onOpenStudent={() => undefined} />);
    expect(screen.getByText('analytics.categories.unlisted {"count":2}')).toBeInTheDocument();

    rerender(<AnalyticsCategoryMatrix t={t} block={block} unlisted={0} onOpenStudent={() => undefined} />);
    expect(screen.queryByText(/analytics\.categories\.unlisted/)).not.toBeInTheDocument();
  });

  it('keeps the course column of "Courses by category" in view on a phone', () => {
    render(<AnalyticsCategoryMatrix t={t} block={block} onOpenStudent={() => undefined} />);
    const courses = within(screen.getByTestId('analytics-category-courses')).getAllByRole('row').slice(1);
    expect(within(courses[0]).getByRole('rowheader')).toHaveClass('sticky');
  });

  it('shows nothing without a category, or from a server without them', () => {
    const { container, rerender } = render(
      <AnalyticsCategoryMatrix t={t} block={{ ...block, columns: [] }} onOpenStudent={() => undefined} />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<AnalyticsCategoryMatrix t={t} block={undefined} onOpenStudent={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
