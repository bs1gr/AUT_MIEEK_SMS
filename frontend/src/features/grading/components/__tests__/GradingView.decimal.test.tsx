import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';

// Mock the API
vi.mock('../../../../api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  gradesAPI: {
    submitGrade: vi.fn(),
    create: vi.fn(),
  },
  enrollmentsAPI: {
    getEnrolledStudents: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock LanguageContext
vi.mock('../../../../LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const mockStudents = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    student_id: 'S001',
    enrollment_date: '2024-01-01',
    is_active: true,
  },
];

const mockCourses = [
  {
    id: 1,
    course_name: 'Math 101',
    course_code: 'MATH101',
    semester: 'Fall 2024',
    credits: 3,
    is_active: true,
    evaluation_rules: [],
  },
];

describe('GradingView - Decimal Input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub fetch used by loadFinal
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as any));
    // Mock API responses
    vi.mocked(apiModule.default.get).mockResolvedValue({
      data: { items: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(mockStudents);
    vi.mocked(apiModule.gradesAPI.create).mockResolvedValue({
      id: 1,
      student_id: mockStudents[0].id,
      course_id: mockCourses[0].id,
      assignment_name: 'Test Grade',
      category: 'exam',
      grade: 15.5,
      max_grade: 20,
      weight: 30,
      date_assigned: new Date().toISOString().split('T')[0],
    });
  });

  it('allows decimal point input in grade field', async () => {
    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    const gradeInput = screen.getByPlaceholderText('gradePlaceholder') as HTMLInputElement;

    // Type a decimal number
    fireEvent.change(gradeInput, { target: { value: '4.' } });
    expect(gradeInput.value).toBe('4.');

    fireEvent.change(gradeInput, { target: { value: '4.5' } });
    expect(gradeInput.value).toBe('4.5');

    fireEvent.change(gradeInput, { target: { value: '18.75' } });
    expect(gradeInput.value).toBe('18.75');
  });

  it('allows decimal point input in maxGrade field', async () => {
    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    const maxGradeInput = screen.getByPlaceholderText('maxGradePlaceholder') as HTMLInputElement;

    fireEvent.change(maxGradeInput, { target: { value: '20.' } });
    expect(maxGradeInput.value).toBe('20.');

    fireEvent.change(maxGradeInput, { target: { value: '20.5' } });
    expect(maxGradeInput.value).toBe('20.5');
  });

  it('allows decimal point input in weight field', async () => {
    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    // Change category to Assignment (weight is disabled for Midterm)
    const categorySelect = screen.getByLabelText('categoryLabel') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'Assignment' } });

    const weightInput = screen.getByPlaceholderText('weightPlaceholder') as HTMLInputElement;

    fireEvent.change(weightInput, { target: { value: '0.' } });
    expect(weightInput.value).toBe('0.');

    fireEvent.change(weightInput, { target: { value: '0.5' } });
    expect(weightInput.value).toBe('0.5');
  });

  it('accepts comma as decimal separator (European format)', async () => {
    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    const gradeInput = screen.getByPlaceholderText('gradePlaceholder') as HTMLInputElement;

    // User types with comma
    fireEvent.change(gradeInput, { target: { value: '4,5' } });
    expect(gradeInput.value).toBe('4,5'); // Stored as-is during typing

    // On submit, comma will be converted to period in validation
  });

  it('stores decimal values as strings during typing', () => {
    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    const gradeInput = screen.getByPlaceholderText('gradePlaceholder') as HTMLInputElement;
    const maxGradeInput = screen.getByPlaceholderText('maxGradePlaceholder') as HTMLInputElement;

    // Type decimal values - they should be preserved as-is
    fireEvent.change(gradeInput, { target: { value: '18.75' } });
    fireEvent.change(maxGradeInput, { target: { value: '20.5' } });

    // Verify they're stored as strings and preserved exactly
    expect(gradeInput.value).toBe('18.75');
    expect(maxGradeInput.value).toBe('20.5');

    // Type partial decimal (just the dot)
    fireEvent.change(gradeInput, { target: { value: '4.' } });
    expect(gradeInput.value).toBe('4.');
  });

  it('adds a grade and shows it in grade history after refresh', async () => {
    // Sequence: initial GETs (student selection, course selection) return empty; refresh after submit returns one grade
    const getMock = vi.mocked(apiModule.default.get);
    getMock.mockResolvedValueOnce({ data: { items: [] }, status: 200, statusText: 'OK', headers: {}, config: {} as any }); // after student select
    getMock.mockResolvedValueOnce({ data: { items: [] }, status: 200, statusText: 'OK', headers: {}, config: {} as any }); // after course select
    getMock.mockResolvedValueOnce({
      data: [
        {
          id: 10,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Quiz 1',
          category: 'Quiz',
          grade: 95,
          max_grade: 100,
          weight: 1,
          date_submitted: '2025-09-02',
        },
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <BrowserRouter>
        <GradingView students={mockStudents} courses={mockCourses} />
      </BrowserRouter>
    );

    // Select student and course to enable form and grade list
    fireEvent.change(screen.getByLabelText('selectStudent'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('selectCourse'), { target: { value: '1' } });

    fireEvent.change(screen.getByPlaceholderText('assignmentNamePlaceholder'), { target: { value: 'Quiz 1' } });
    fireEvent.change(screen.getByPlaceholderText('gradePlaceholder'), { target: { value: '95' } });
    fireEvent.change(screen.getByPlaceholderText('maxGradePlaceholder'), { target: { value: '100' } });

    fireEvent.click(screen.getByText('saveGrade'));

    expect(apiModule.gradesAPI.create).toHaveBeenCalledTimes(1);
    expect(apiModule.gradesAPI.create).toHaveBeenCalledWith(expect.objectContaining({ assignment_name: 'Quiz 1', grade: 95 }));

    // Grade history should eventually show the new assignment name
    await waitFor(async () => {
      const item = await screen.findByText('Quiz 1');
      expect(item).toBeInTheDocument();
    });
  });
});
