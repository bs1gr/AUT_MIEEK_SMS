import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { vi } from 'vitest';
import i18n from '../../i18n';
import { LanguageProvider } from '../../LanguageContext';
import apiClient from '@/api/api';
import SemesterArchivePage from './SemesterArchivePage';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: '/api/v1' },
  },
}));

const renderPage = (ui: ReactElement) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('SemesterArchivePage', () => {
  beforeEach(() => {
    mockedApiClient.get.mockReset();
    mockedApiClient.post.mockReset();
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url === '/semester-archive/semesters') {
        return Promise.resolve({
          data: [{ semester: 'Fall 2026', course_count: 2, already_archived: false }],
        });
      }
      if (url === '/semester-archive/exports') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('loads semesters and previews eligible/excluded pairs', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        semester: 'Fall 2026',
        pass_threshold: 60,
        eligible: [
          {
            student_id: 1,
            student_name: 'Jane Doe',
            course_id: 1,
            course_code: 'MATH101',
            course_name: 'Mathematics',
            final_grade: 88,
            letter_grade: 'B+',
            total_weight_used: 100,
          },
        ],
        excluded: [
          {
            student_id: 2,
            student_name: 'John Roe',
            course_id: 1,
            course_code: 'MATH101',
            course_name: 'Mathematics',
            reason: 'not_passed',
            final_grade: 40,
            total_weight_used: 100,
          },
        ],
        eligible_count: 1,
        excluded_count: 1,
      },
    });

    renderPage(<SemesterArchivePage />);

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'Fall 2026' } });

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('John Roe')).toBeInTheDocument();
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/semester-archive/preview', {
      semester: 'Fall 2026',
      pass_threshold: 60,
    });
  });

  it('disables execute until the confirmation text matches the semester', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        semester: 'Fall 2026',
        pass_threshold: 60,
        eligible: [
          {
            student_id: 1,
            student_name: 'Jane Doe',
            course_id: 1,
            course_code: 'MATH101',
            course_name: 'Mathematics',
            final_grade: 88,
            letter_grade: 'B+',
            total_weight_used: 100,
          },
        ],
        excluded: [],
        eligible_count: 1,
        excluded_count: 0,
      },
    });

    renderPage(<SemesterArchivePage />);

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'Fall 2026' } });
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    const executeButton = await screen.findByRole('button', { name: /archive/i });
    expect(executeButton).toBeDisabled();

    const confirmInput = screen.getByPlaceholderText(/semester name/i);
    fireEvent.change(confirmInput, { target: { value: 'wrong name' } });
    expect(executeButton).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'Fall 2026' } });
    expect(executeButton).not.toBeDisabled();
  });

  // Plan todo 87: a failed course is recorded as failed and its records cleared.
  const failedPair = (student_id: number, student_name: string, reason: string, final_grade: number) => ({
    student_id,
    student_name,
    course_id: 1,
    course_code: 'MATH101',
    course_name: 'Mathematics',
    final_grade,
    letter_grade: 'C',
    total_weight_used: 100,
    reason,
  });

  it('lists the failed students with the reason, and runs with failed students alone', async () => {
    mockedApiClient.post.mockImplementation((url: string) => {
      if (url === '/semester-archive/preview') {
        return Promise.resolve({
          data: {
            semester: 'Fall 2026',
            pass_threshold: 60,
            eligible: [],
            failed: [
              failedPair(2, 'John Roe', 'failed_absence_limit', 84),
              failedPair(3, 'Mary Poe', 'not_passed', 41),
            ],
            excluded: [],
            eligible_count: 0,
            failed_count: 2,
            excluded_count: 0,
          },
        });
      }
      return Promise.resolve({
        data: {
          export_id: 7,
          export_filename: 'semester_archive_Fall_2026',
          students_affected: 2,
          courses_affected: 1,
          enrollments_archived: 0,
          enrollments_failed: 2,
          enrollments_skipped: 0,
        },
      });
    });

    renderPage(<SemesterArchivePage />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'Fall 2026' } });
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    const section = await screen.findByTestId('archive-failed');
    expect(section).toHaveTextContent('Will be recorded as failed (2)');
    expect(section).toHaveTextContent('takes the course again from the beginning');
    expect(section).toHaveTextContent('Failed: over the absence limit');
    expect(section).toHaveTextContent('Failed: below the pass threshold');
    expect(section).toHaveTextContent('C (84.0%)');

    // Nothing passed, but the run has work: the confirmation is offered.
    const executeButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.change(screen.getByPlaceholderText(/semester name/i), { target: { value: 'Fall 2026' } });
    expect(executeButton).not.toBeDisabled();
    fireEvent.click(executeButton);

    expect(await screen.findByText('Archive complete')).toBeInTheDocument();
    expect(screen.getByText('Recorded as failed')).toBeInTheDocument();
    expect(mockedApiClient.post).toHaveBeenCalledWith('/semester-archive/execute', {
      semester: 'Fall 2026',
      pass_threshold: 60,
      confirm_text: 'Fall 2026',
    });
  });

  it('offers no run when nothing passed or failed', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        semester: 'Fall 2026',
        pass_threshold: 60,
        eligible: [],
        failed: [],
        excluded: [{ ...failedPair(4, 'Ann Doe', 'incomplete_grading', 50), total_weight_used: 50 }],
        eligible_count: 0,
        failed_count: 0,
        excluded_count: 1,
      },
    });

    renderPage(<SemesterArchivePage />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'Fall 2026' } });
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(await screen.findByText('Ann Doe')).toBeInTheDocument();
    expect(screen.queryByTestId('archive-failed')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/semester name/i)).not.toBeInTheDocument();
  });
});
