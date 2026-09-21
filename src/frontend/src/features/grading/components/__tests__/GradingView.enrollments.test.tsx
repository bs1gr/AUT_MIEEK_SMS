import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';
import { DateTimeSettingsProvider } from '../../../../contexts/DateTimeSettingsContext';

vi.mock('../../../../api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  gradesAPI: { submitGrade: vi.fn(), create: vi.fn() },
  enrollmentsAPI: {
    getEnrolledStudents: vi.fn(),
    getByStudent: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('../../../../LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const students = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', student_id: 'S001', enrollment_date: '2024-01-01', is_active: true },
];

const course = (id: number, code: string) => ({
  id,
  course_name: `Course ${code}`,
  course_code: code,
  semester: 'Fall 2024',
  credits: 3,
  is_active: true,
  evaluation_rules: [],
});
const courses = [course(1, 'AAA1'), course(2, 'BBB2'), course(3, 'CCC3')];

describe('GradingView - course list for a selected student', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response),
    );
    vi.mocked(apiModule.default.get).mockResolvedValue({
      data: { items: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown as Record<string, unknown>,
    });
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
  });

  it('asks for the student\'s enrolments once and lists only active ones', async () => {
    vi.mocked(apiModule.enrollmentsAPI.getByStudent).mockResolvedValue([
      { id: 10, student_id: 1, course_id: 1, status: 'active' },
      { id: 11, student_id: 1, course_id: 2, status: 'dropped' },
    ]);

    render(
      <BrowserRouter>
        <DateTimeSettingsProvider>
          <GradingView students={students} courses={courses} />
        </DateTimeSettingsProvider>
      </BrowserRouter>,
    );

    fireEvent.change(screen.getByLabelText('selectStudent'), { target: { value: '1' } });

    await waitFor(() => {
      const options = Array.from((screen.getByLabelText('selectCourse') as HTMLSelectElement).options).map(o => o.text);
      expect(options).toEqual(['selectCourse', 'AAA1 - Course AAA1']);
    });

    expect(apiModule.enrollmentsAPI.getByStudent).toHaveBeenCalledTimes(1);
    expect(apiModule.enrollmentsAPI.getByStudent).toHaveBeenCalledWith(1);
    // The old implementation called this once per course just to build the list.
    expect(apiModule.enrollmentsAPI.getEnrolledStudents).not.toHaveBeenCalled();
  });
});
