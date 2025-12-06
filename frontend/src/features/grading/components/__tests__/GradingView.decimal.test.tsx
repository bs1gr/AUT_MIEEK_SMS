import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    // Mock API responses
    vi.mocked(apiModule.default.get).mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
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
});
