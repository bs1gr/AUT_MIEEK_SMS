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
});
