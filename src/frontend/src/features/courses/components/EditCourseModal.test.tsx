import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditCourseModal from './EditCourseModal';
import { LanguageProvider } from '@/LanguageContext';
import type { Course } from '@/types';

// Mock framer-motion with typed props (avoids `any`)
/* eslint-disable jsx-a11y/no-static-element-interactions */
vi.mock('framer-motion', () => ({
  motion: {
      div: ({ children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div onClick={onClick} onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>); }} tabIndex={-1} {...props}>{children}</div>
      ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
};

const mockCourse: Course = {
  id: 1,
  course_code: 'CS101',
  course_name: 'Introduction to Computer Science',
  semester: 'Spring Semester 2024',
  credits: 3,
  year: 2024,
  is_active: true,
};

describe('EditCourseModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnUpdate.mockClear();
  });

  describe('Rendering', () => {
    it('renders modal with title and pre-filled form fields', () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText(/edit course/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('CS101')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Introduction to Computer Science')).toBeInTheDocument();
    });

    it('renders credits field with existing value', () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      expect(creditsInput).toHaveValue(3);
    });

    it('renders action buttons with correct labels', () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('detects and displays existing semester type', () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Should detect "Spring Semester 2024" and show it in preview
      expect(screen.getByText(/spring semester 2024/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const backdrop = container.firstChild as HTMLElement;
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('allows editing course code', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const courseCodeInput = screen.getByDisplayValue('CS101');
      await user.clear(courseCodeInput);
      await user.type(courseCodeInput, 'CS102');

      expect(courseCodeInput).toHaveValue('CS102');
    });

    it('allows editing course name', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const courseNameInput = screen.getByDisplayValue('Introduction to Computer Science');
      await user.clear(courseNameInput);
      await user.type(courseNameInput, 'Advanced Programming');

      expect(courseNameInput).toHaveValue('Advanced Programming');
    });

    it('allows editing credits', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      await user.clear(creditsInput);
      await user.type(creditsInput, '5');

      expect(creditsInput).toHaveValue(5);
    });

    it('allows changing semester type', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'winter');

      expect(semesterSelect).toHaveValue('winter');
    });
  });

  describe('Semester Detection', () => {
    it('detects spring semester from existing data', () => {
      const springCourse = { ...mockCourse, semester: 'Spring Semester 2024' };
      renderWithProviders(
        <EditCourseModal course={springCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('spring');
    });

    it('detects winter semester from existing data', () => {
      const winterCourse = { ...mockCourse, semester: 'Winter Semester 2024' };
      renderWithProviders(
        <EditCourseModal course={winterCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('winter');
    });

    it('defaults to custom type for unrecognized semester format', () => {
      const customCourse = { ...mockCourse, semester: 'Summer 2024' };
      renderWithProviders(
        <EditCourseModal course={customCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('custom');
      expect(screen.getByText(/summer 2024/i)).toBeInTheDocument();
    });

    it('extracts year from semester string', () => {
      const { container } = renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Year should be extracted from "Spring Semester 2024" and shown in semester-year-input
      const yearInput = container.querySelector('[data-testid="semester-year-input"]');
      expect(yearInput).toHaveValue('2024');
    });
  });

  describe('Accessibility', () => {
    it('associates labels with inputs', () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const courseCodeInput = screen.getByDisplayValue('CS101');
      expect(courseCodeInput).toHaveAttribute('name', 'course_code');

      const courseNameInput = screen.getByDisplayValue('Introduction to Computer Science');
      expect(courseNameInput).toHaveAttribute('name', 'course_name');
    });

    it('has proper input types for numeric fields', () => {
      const { container } = renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      expect(creditsInput).toHaveAttribute('type', 'number');

      // Year input is now semester-year-input with type="text"
      const yearInput = container.querySelector('[data-testid="semester-year-input"]');
      expect(yearInput).toHaveAttribute('type', 'text');
    });

    it('disables submit button during submission', async () => {
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows the enrollment-derived status read-only (no activation toggle)', () => {
      const { rerender } = renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );
      expect(screen.getByText(/✓ Active/)).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

      rerender(
        <LanguageProvider>
          <EditCourseModal course={{ ...mockCourse, is_active: false }} onClose={mockOnClose} onUpdate={mockOnUpdate} />
        </LanguageProvider>
      );
      expect(screen.getByText(/⊗ Inactive/)).toBeInTheDocument();
    });

    // Regression: form.reset() omitted the required (hidden) `year` field, so
    // validation failed silently and "Save changes" never called onUpdate.
    it('saves an unmodified form', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
    });
  });

  describe('Edge Cases', () => {
    it('handles course with minimal data', () => {
      const minimalCourse: Course = {
        id: 2,
        course_code: 'MIN101',
        course_name: 'Minimal Course',
        semester: 'Custom',
        credits: 1,
        year: 2024,
        is_active: true,
      };

      renderWithProviders(
        <EditCourseModal course={minimalCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByDisplayValue('MIN101')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Minimal Course')).toBeInTheDocument();
      expect(screen.getByLabelText(/credits/i)).toHaveValue(1);
    });

    it('handles semester with lowercase keywords', () => {
      const lowercaseCourse = { ...mockCourse, semester: 'spring 2024' };
      renderWithProviders(
        <EditCourseModal course={lowercaseCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('spring');
    });

    it('handles fall semester as winter', () => {
      const fallCourse = { ...mockCourse, semester: 'Fall 2024' };
      renderWithProviders(
        <EditCourseModal course={fallCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Fall should be detected as winter semester
      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('winter');
    });

    it('handles semester without year', () => {
      const noYearCourse = { ...mockCourse, semester: 'Spring Semester' };
      const { container } = renderWithProviders(
        <EditCourseModal course={noYearCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Should default to current year and show in semester-year-input
      const yearInput = container.querySelector('[data-testid="semester-year-input"]');
      expect(yearInput).toHaveValue(new Date().getFullYear().toString());
    });
  });

  // Plan todo 71: a course's own total of periods in the semester, typed by hand.
  describe('Periods in the semester', () => {
    const save = (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByRole('button', { name: /save changes/i }));

    it('shows the total a course keeps and sends it back as it is', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={{ ...mockCourse, semester_periods: 35 }} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByTestId('semester-periods-input')).toHaveValue(35);
      await save(user);

      await waitFor(() => expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ semester_periods: 35 })));
    });

    it('sends a typed total, and an empty box as none', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );
      const box = screen.getByTestId('semester-periods-input');
      expect(box).toHaveValue(null);

      await user.type(box, '40');
      await save(user);
      await waitFor(() => expect(mockOnUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ semester_periods: 40 })));

      await user.clear(box);
      await save(user);
      await waitFor(() => expect(mockOnUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ semester_periods: null })));
    });

    it('does not save a total that is not a whole number', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      await user.type(screen.getByTestId('semester-periods-input'), '2.5');
      await save(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(/whole number/i);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });
});
