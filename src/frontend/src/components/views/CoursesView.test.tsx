
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import CourseManagement from './CoursesView';
import { LanguageProvider } from '../../LanguageContext';

// CoursesView uses apiClient (migrated from bare fetch in the Android commit).
vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/api/api';
const mockApi = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('CourseManagement (global mocks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/enrollments/course/1/students')) {
        return Promise.resolve({ data: [{ id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' }] });
      }
      if (url.includes('/students/')) {
        return Promise.resolve({ data: { items: [
          { id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' },
          { id: 2, first_name: 'Bob', last_name: 'Jones', student_id: 'S002' },
        ] } });
      }
      if (url.includes('/courses/')) {
        return Promise.resolve({ data: { items: [
          { id: 1, course_code: 'C101', course_name: 'Math', evaluation_rules: [], teaching_schedule: [] },
        ] } });
      }
      return Promise.resolve({ data: {} });
    });

    mockApi.post.mockImplementation((url: string) => {
      if (url.includes('/enrollments/course/1')) {
        return Promise.resolve({ data: { created: 1, reactivated: 0 } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CourseManagement enrollment', () => {
    it('enrolls students and updates enrolled list', async () => {
      render(
        <LanguageProvider>
          <CourseManagement />
        </LanguageProvider>
      );
      await screen.findByText(/Math/);
      fireEvent.change(screen.getByLabelText(/select course/i), { target: { value: '1' } });
      fireEvent.click(screen.getByText(/enrollment/i));
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText(/enroll selected/i));
      await screen.findByText(/Alice Smith/);
    });

    it('handles rapid course switching without vanishing students', async () => {
      render(
        <LanguageProvider>
          <CourseManagement />
        </LanguageProvider>
      );
      await screen.findByText(/Math/);
      fireEvent.change(screen.getByLabelText(/select course/i), { target: { value: '1' } });
      fireEvent.click(screen.getByText(/enrollment/i));
      fireEvent.change(screen.getByLabelText(/select course/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/select course/i), { target: { value: '1' } });
      await screen.findByText(/Alice Smith/);
    });
  });
});
