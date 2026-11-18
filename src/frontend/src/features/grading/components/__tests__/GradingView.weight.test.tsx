/**
 * The Weight box of Grades > Grade Entry.
 *
 * Until November 2026 the number was stored and never read; the final grade took the plain
 * average of a category. It counts now (the owner, 18 November 2026: "make it count"), so the
 * form says what it does, sends what was typed, and is closed where it has no meaning: an exam
 * takes its latest grade alone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';
import { DateTimeSettingsProvider } from '../../../../contexts/DateTimeSettingsContext';

vi.mock('../../../../api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  gradesAPI: { submitGrade: vi.fn(), create: vi.fn() },
  enrollmentsAPI: { getEnrolledStudents: vi.fn(), getByStudent: vi.fn() },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../../../../LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key, language: 'en' }) }));

const students = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', student_id: 'S001', enrollment_date: '2024-01-01', is_active: true },
];
const courses = [
  { id: 1, course_name: 'Math 101', course_code: 'MATH101', semester: 'Fall 2024', credits: 3, is_active: true, evaluation_rules: [] },
];
const answer = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as unknown as Record<string, unknown> });
const stored = [
  { id: 10, student_id: 1, course_id: 1, assignment_name: 'Heavy homework', category: 'Homework', grade: 18, max_grade: 20, weight: 2.5, date_submitted: '2026-10-02' },
  { id: 11, student_id: 1, course_id: 1, assignment_name: 'Old homework', category: 'Homework', grade: 12, max_grade: 20, weight: 0, date_submitted: '2026-10-01' },
];

const renderView = () =>
  render(
    <BrowserRouter>
      <DateTimeSettingsProvider>
        <GradingView students={students} courses={courses} />
      </DateTimeSettingsProvider>
    </BrowserRouter>
  );
const weightBox = () => screen.getByPlaceholderText('weightPlaceholder') as HTMLInputElement;
const choose = (category: string) => fireEvent.change(screen.getByLabelText('categoryLabel'), { target: { value: category } });

describe('Grade Entry: the Weight box', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response));
    vi.mocked(apiModule.default.get).mockImplementation(async (url: string) =>
      answer(url.includes('/grades/') ? stored : {})
    );
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
    vi.mocked(apiModule.gradesAPI.create).mockResolvedValue({ ...stored[0], id: 12 });
  });

  it('says what the weight does, and is open, for a category that averages its grades', () => {
    renderView();
    choose('Homework');

    expect(weightBox()).not.toBeDisabled();
    expect(screen.getByTestId('weight-hint')).toHaveTextContent('weightHint');
    expect(screen.getByTestId('weight-hint')).not.toHaveTextContent('weightHintExam');
    expect(weightBox()).toHaveAttribute('aria-describedby', 'weight-hint');
  });

  it.each(['Midterm Exam', 'Final Exam'])('is closed for %s, and says why', (category) => {
    renderView();
    choose(category);

    expect(weightBox()).toBeDisabled();
    expect(screen.getByTestId('weight-hint')).toHaveTextContent('weightHintExam');
  });

  it('is closed before a category is chosen, when the form stands on the midterm', () => {
    renderView();

    expect(weightBox()).toBeDisabled();
  });

  it('sends the weight that was typed, with a comma or a point', async () => {
    renderView();
    fireEvent.change(screen.getByLabelText('selectStudent'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('selectCourse'), { target: { value: '1' } });
    choose('Homework');
    fireEvent.change(screen.getByPlaceholderText('assignmentNamePlaceholder'), { target: { value: 'Homework 3' } });
    fireEvent.change(weightBox(), { target: { value: '2,5' } });
    fireEvent.change(screen.getByPlaceholderText('gradePlaceholder'), { target: { value: '17' } });
    fireEvent.change(screen.getByPlaceholderText('maxGradePlaceholder'), { target: { value: '20' } });

    fireEvent.click(screen.getByText('saveGrade'));

    await waitFor(() => expect(apiModule.gradesAPI.create).toHaveBeenCalledTimes(1));
    expect(apiModule.gradesAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignment_name: 'Homework 3', category: 'Homework', weight: 2.5 })
    );
  });

  it('sends 1 when the box was left empty', async () => {
    renderView();
    fireEvent.change(screen.getByLabelText('selectStudent'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('selectCourse'), { target: { value: '1' } });
    choose('Homework');
    fireEvent.change(screen.getByPlaceholderText('assignmentNamePlaceholder'), { target: { value: 'Homework 4' } });
    fireEvent.change(screen.getByPlaceholderText('gradePlaceholder'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('maxGradePlaceholder'), { target: { value: '20' } });

    fireEvent.click(screen.getByText('saveGrade'));

    await waitFor(() => expect(apiModule.gradesAPI.create).toHaveBeenCalledWith(expect.objectContaining({ weight: 1 })));
  });

  it('shows in the history how often each grade counts: a stored 0 counts once', async () => {
    renderView();
    fireEvent.change(screen.getByLabelText('selectStudent'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('selectCourse'), { target: { value: '1' } });

    const heavy = (await screen.findByText('Heavy homework')).closest('tr')!;
    const old = screen.getByText('Old homework').closest('tr')!;

    expect(heavy).toHaveTextContent('×2.5');
    expect(old).toHaveTextContent('×1');
  });
});
