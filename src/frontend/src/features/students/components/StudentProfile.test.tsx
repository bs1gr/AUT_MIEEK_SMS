import { screen, waitFor, render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import StudentProfile from './StudentProfile';
import apiClient, { gradesAPI, attendanceAPI, highlightsAPI, studentsAPI } from '@/api/api';

vi.mock('@/api/api');

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' } }),
}));

// Covered by StudentPredictionsSection.test (it needs a QueryClientProvider).
vi.mock('./StudentPredictionsSection', () => ({ default: () => null }));

vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({
    formatDate: (value: unknown) => (value ? String(value) : '-'),
    formatDateTime: (value: unknown) => (value ? String(value) : '-'),
    formatTime: (value: unknown) => (value ? String(value) : '-'),
  }),
}));

const mockedApiClient = apiClient as unknown as { get: ReturnType<typeof vi.fn> };
const mockedStudentsAPI = studentsAPI as unknown as { getById: ReturnType<typeof vi.fn> };
const mockedGradesAPI = gradesAPI as unknown as { getByStudent: ReturnType<typeof vi.fn> };
const mockedAttendanceAPI = attendanceAPI as unknown as { getByStudent: ReturnType<typeof vi.fn> };
const mockedHighlightsAPI = highlightsAPI as unknown as { getByStudent: ReturnType<typeof vi.fn> };

const STUDENT = {
  id: 42,
  student_id: 'STU-42',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  enrollment_date: '2026-01-01',
  is_active: true,
};

const ARCHIVED_RECORD = {
  id: 1,
  course_code: 'CS101',
  course_name: 'Intro to Programming',
  semester: 'Fall 2025',
  final_grade: 92.5,
  letter_grade: 'A',
  passed: true,
  archived_at: '2026-01-01T00:00:00Z',
};

const renderProfile = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <StudentProfile studentId={42} onBack={vi.fn()} />
    </I18nextProvider>
  );

describe('StudentProfile - Academic History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStudentsAPI.getById.mockResolvedValue(STUDENT);
    mockedGradesAPI.getByStudent.mockResolvedValue([]);
    mockedAttendanceAPI.getByStudent.mockResolvedValue([]);
    mockedHighlightsAPI.getByStudent.mockResolvedValue([]);
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url.includes('/performance-history')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/enrollments/student/')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('does not render the Academic History section when there is no archived performance history', async () => {
    renderProfile();

    await waitFor(() => expect(screen.getByTestId('student-profile')).toBeInTheDocument());

    expect(screen.queryByText('Academic History')).not.toBeInTheDocument();
  });

  it('renders archived courses in the Academic History section when present', async () => {
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url.includes('/performance-history')) {
        return Promise.resolve({ data: [ARCHIVED_RECORD] });
      }
      if (url.startsWith('/enrollments/student/')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderProfile();

    await waitFor(() => expect(screen.getByText('Academic History')).toBeInTheDocument());

    expect(screen.getByText('CS101 — Intro to Programming')).toBeInTheDocument();
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();
    expect(screen.getByText('A (92.5%)')).toBeInTheDocument();
  });

  it('hides the Academic History section when the performance-history request fails', async () => {
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url.includes('/performance-history')) {
        return Promise.reject(new Error('not found'));
      }
      if (url.startsWith('/enrollments/student/')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderProfile();

    await waitFor(() => expect(screen.getByTestId('student-profile')).toBeInTheDocument());

    expect(screen.queryByText('Academic History')).not.toBeInTheDocument();
  });
});

describe('StudentProfile - attendance rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStudentsAPI.getById.mockResolvedValue(STUDENT);
    mockedGradesAPI.getByStudent.mockResolvedValue([]);
    mockedHighlightsAPI.getByStudent.mockResolvedValue([]);
    mockedApiClient.get.mockResolvedValue({ data: [] });
  });

  it('counts Present and Late as attended, Excused as an absence (todo 77)', async () => {
    // It counted Present alone: 25%.
    mockedAttendanceAPI.getByStudent.mockResolvedValue(
      ['Present', 'Late', 'Late', 'Excused'].map((status, i) => ({
        id: i + 1,
        student_id: 42,
        course_id: 9,
        date: `2026-11-0${i + 2}`,
        status,
      }))
    );

    renderProfile();

    expect(await screen.findByTestId('profile-attendance-rate')).toHaveTextContent('75%');
  });

  it('counts each status whatever its case, as the rate tile does', async () => {
    // A semester file can bring "late" or "Absent "; the rate took them, the cards did not.
    mockedAttendanceAPI.getByStudent.mockResolvedValue(
      ['present', 'late', 'Late', 'Absent '].map((status, i) => ({
        id: i + 1,
        student_id: 42,
        course_id: 9,
        date: `2026-11-0${i + 2}`,
        status,
      }))
    );

    renderProfile();

    expect(await screen.findByTestId('profile-attendance-rate')).toHaveTextContent('75%');
    expect(screen.getByTestId('profile-attendance-count-present')).toHaveTextContent(/^\D*1\s*25\.0%$/);
    expect(screen.getByTestId('profile-attendance-count-late')).toHaveTextContent(/^\D*2\s*50\.0%$/);
    expect(screen.getByTestId('profile-attendance-count-absent')).toHaveTextContent(/^\D*1\s*25\.0%$/);
    expect(screen.getByTestId('profile-attendance-count-excused')).toHaveTextContent(/^\D*0\s*0\.0%$/);
  });
});

// Plan todo 83 (the owner, 2026-11-24): each course counts by its final grade once its Final Exam is
// graded, by the average of its grades before. The tiles took the plain mean of every grade.
describe('StudentProfile - the GPA and Average tiles', () => {
  const grade = (id: number, course_id: number, value: number) => ({
    id, student_id: 42, course_id, assignment_name: `G${id}`, category: 'Homework', grade: value, max_grade: 100, weight: 1,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedStudentsAPI.getById.mockResolvedValue(STUDENT);
    mockedAttendanceAPI.getByStudent.mockResolvedValue([]);
    mockedHighlightsAPI.getByStudent.mockResolvedValue([]);
    // Course 1: grades of 90, 70, 80 (average 80), its final grade 61.5 and ready; course 2: 50.
    mockedGradesAPI.getByStudent.mockResolvedValue([grade(1, 1, 90), grade(2, 1, 70), grade(3, 1, 80), grade(4, 2, 50)]);
  });

  it('count a course by its final grade once its Final Exam is graded', async () => {
    mockedApiClient.get.mockImplementation(async (url: string) =>
      url.endsWith('/all-courses-summary')
        ? { data: { courses: [{ course_id: 1, course_code: 'A', final_grade: 61.5, final_grade_ready: true }] } }
        : { data: [] }
    );

    renderProfile();

    // (61.5 + 50) / 2 = 55.75, shown 55.8; the GPA is that over 100 times 4.
    await waitFor(() => expect(screen.getByTestId('profile-average')).toHaveTextContent('55.8%'));
    expect(screen.getByTestId('profile-gpa')).toHaveTextContent('2.23');
  });

  it('count every course by its average while no final grade is ready', async () => {
    mockedApiClient.get.mockResolvedValue({ data: [] });

    renderProfile();

    // (80 + 50) / 2 = 65: each course once, not the mean of the four grades (72.5).
    await waitFor(() => expect(screen.getByTestId('profile-average')).toHaveTextContent('65%'));
  });
});

describe('StudentProfile - dates of enrolment and of grades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStudentsAPI.getById.mockResolvedValue(STUDENT);
    mockedAttendanceAPI.getByStudent.mockResolvedValue([]);
    mockedHighlightsAPI.getByStudent.mockResolvedValue([]);
    mockedGradesAPI.getByStudent.mockResolvedValue([
      // Typed on the Grades page: it has a "date submitted".
      { id: 11, student_id: 42, course_id: 9, assignment_name: 'Midterm', grade: 15, max_grade: 20, date_submitted: '2026-11-10' },
      // From a session import or the API: only a "date assigned".
      { id: 12, student_id: 42, course_id: 9, assignment_name: 'Homework 1', grade: 18, max_grade: 20, date_assigned: '2026-11-03' },
      { id: 13, student_id: 42, course_id: 9, assignment_name: 'Homework 2', grade: 12, max_grade: 20 },
    ]);
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url.includes('/performance-history')) return Promise.resolve({ data: [] });
      if (url.startsWith('/enrollments/student/')) {
        return Promise.resolve({ data: [{ id: 1, student_id: 42, course_id: 9, enrolled_at: '2026-09-10' }] });
      }
      if (url === '/courses/9') {
        return Promise.resolve({ data: { id: 9, course_code: 'AUT0105', course_name: 'Engines', is_active: true } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('shows the date a grade has, whichever of the two it is', async () => {
    renderProfile();

    expect(await screen.findByTestId('recent-grade-date-11')).toHaveTextContent('2026-11-10');
    // This one read "N/A": the table looked at "date submitted" alone.
    expect(screen.getByTestId('recent-grade-date-12')).toHaveTextContent('2026-11-03');
    expect(screen.getByTestId('recent-grade-date-13')).toHaveTextContent('—');
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('shows a grade of zero as 0%, not as 10000% with an A', async () => {
    // Seen in a browser on 18 November 2026: "Homework 2  0 / 20  10000.0%  A".
    mockedGradesAPI.getByStudent.mockResolvedValue([
      { id: 21, student_id: 42, course_id: 9, assignment_name: 'Homework 2', grade: 0, max_grade: 20, date_submitted: '2026-11-18' },
      { id: 22, student_id: 42, course_id: 9, assignment_name: 'Homework 1', grade: 20, max_grade: 20, date_submitted: '2026-11-17' },
      { id: 23, student_id: 42, course_id: 9, assignment_name: 'Quiz', grade: 15, max_grade: 20, date_submitted: '2026-11-16' },
    ]);

    renderProfile();

    expect(await screen.findByTestId('recent-grade-percent-21')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('recent-grade-letter-21')).toHaveTextContent('F');
    expect(screen.getByTestId('recent-grade-percent-22')).toHaveTextContent('100.0%');
    expect(screen.getByTestId('recent-grade-percent-23')).toHaveTextContent('75.0%');
    expect(screen.queryByText(/10000/)).not.toBeInTheDocument();
  });

  it('labels the dates of enrolment "Enrolled:", not "Courses"', async () => {
    renderProfile();

    // Under the enrolled course, where "Courses: 2026-09-10" stood.
    expect(await screen.findByText('Enrolled: 2026-09-10')).toBeInTheDocument();
    // In the header, where "Courses 2026-01-01" stood.
    expect(screen.getByText('Enrolled: 2026-01-01')).toBeInTheDocument();
    expect(screen.queryByText(/^Courses:? \d/)).not.toBeInTheDocument();
  });
});