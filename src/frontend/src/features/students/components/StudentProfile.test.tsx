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
