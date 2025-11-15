
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CourseManagement from './CoursesView';
import { LanguageProvider } from '../../LanguageContext';

// Mock fetch globally
beforeEach(() => {
  global.fetch = vi.fn((url, options) => {
    // Simulate API endpoints
    if (url.includes('/enrollments/course/1/students')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' }]),
      });
    }
    if (url.includes('/enrollments/course/1')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ created: 1, reactivated: 0 }),
      });
    }
    if (url.includes('/students/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [
          { id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' },
          { id: 2, first_name: 'Bob', last_name: 'Jones', student_id: 'S002' },
        ] }),
      });
    }
    if (url.includes('/courses/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [
          { id: 1, course_code: 'C101', course_name: 'Math', evaluation_rules: [], teaching_schedule: [] },
        ] }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
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
