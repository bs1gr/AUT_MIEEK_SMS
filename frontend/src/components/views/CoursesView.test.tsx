
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import CourseManagement from './CoursesView';
import { LanguageProvider } from '../../LanguageContext';

// Mock fetch globally
describe('CourseManagement (global mocks)', () => {
  beforeEach(() => {
  global.fetch = vi.fn((url, _options) => {
    // Simulate API endpoints
    if (url.includes('/enrollments/course/1/students')) {
      return Promise.resolve(new Response(JSON.stringify([{ id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (url.includes('/enrollments/course/1')) {
      return Promise.resolve(new Response(JSON.stringify({ created: 1, reactivated: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (url.includes('/students/')) {
      return Promise.resolve(new Response(JSON.stringify({ items: [
        { id: 1, first_name: 'Alice', last_name: 'Smith', student_id: 'S001' },
        { id: 2, first_name: 'Bob', last_name: 'Jones', student_id: 'S002' },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (url.includes('/courses/')) {
      return Promise.resolve(new Response(JSON.stringify({ items: [
        { id: 1, course_code: 'C101', course_name: 'Math', evaluation_rules: [], teaching_schedule: [] },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } }));
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
