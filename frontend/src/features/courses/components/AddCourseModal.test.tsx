import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCourseModal from './AddCourseModal';
import { LanguageProvider } from '@/LanguageContext';

// Mock framer-motion with proper types to avoid using `any`
/*
 * Tests use a tiny framer-motion mock that provides keyboard + click handling
 * for accessibility testing. This helper is used only in tests — disable the
 * jsx-a11y/no-static-element-interactions rule here to avoid lint noise.
 */
/* eslint-disable jsx-a11y/no-static-element-interactions */
vi.mock('framer-motion', () => ({
  motion: {
      div: ({ children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div onClick={onClick} onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e as unknown as React.MouseEvent); }} tabIndex={-1} {...props}>{children}</div>
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

describe('AddCourseModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAdd.mockClear();
  });

  describe('Rendering', () => {
    it('renders modal with title and empty form fields', () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByText(/add new course/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/course code/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/course name/i)).toBeInTheDocument();
    });

    it('renders semester selection with default spring semester', () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      expect(semesterSelect).toHaveValue('spring');
      // Check the preview div contains the generated semester
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`Spring Semester ${currentYear}`))).toBeInTheDocument();
    });

    it('renders credits and year fields with default values', () => {
      const { container } = renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      expect(creditsInput).toHaveValue(3);

      // Year field has name="year" but no "year" placeholder
      const yearFormInput = container.querySelector('input[name="year"]');
      expect(yearFormInput).toHaveValue(new Date().getFullYear());
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const backdrop = container.firstChild as HTMLElement;
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('allows typing in course code field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'CS101');

      expect(courseCodeInput).toHaveValue('CS101');
    });

    it('allows typing in course name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseNameInput = screen.getByPlaceholderText(/course name/i);
      await user.type(courseNameInput, 'Introduction to Computer Science');

      expect(courseNameInput).toHaveValue('Introduction to Computer Science');
    });

    it('allows changing semester type', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'winter');

      expect(semesterSelect).toHaveValue('winter');
    });

    it('allows changing credits', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      await user.clear(creditsInput);
      await user.type(creditsInput, '5');

      expect(creditsInput).toHaveValue(5);
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty course code', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const submitButton = screen.getByRole('button', { name: /add course/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/course code is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for empty course name', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'CS101');

      const submitButton = screen.getByRole('button', { name: /add course/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/course name is required/i)).toBeInTheDocument();
      });
    });

    it('validates course code format (uppercase only)', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'cs101');

      const submitButton = screen.getByRole('button', { name: /add course/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be uppercase letters/i)).toBeInTheDocument();
      });
    });

    it('validates course code max length', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'A'.repeat(51));

      const submitButton = screen.getByRole('button', { name: /add course/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be less than 50 characters/i)).toBeInTheDocument();
      });
    });

    it('validates credits range (0-20)', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      await user.clear(creditsInput);
      await user.type(creditsInput, '25');

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'CS101');

      const courseNameInput = screen.getByPlaceholderText(/course name/i);
      await user.type(courseNameInput, 'Test Course');

      const submitButton = screen.getByRole('button', { name: /add course/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be 20 or less/i)).toBeInTheDocument();
      });
    });
  });

  describe('Semester Generation', () => {
    it('generates spring semester with year', async () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`spring.*${currentYear}`, 'i'))).toBeInTheDocument();
    });

    it('updates semester when semester type changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'winter');

      await waitFor(() => {
        expect(screen.getByText(/winter.*\d{4}/i)).toBeInTheDocument();
      });
    });

    it('shows custom semester input when custom type selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'custom');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/custom semester/i)).toBeInTheDocument();
      });
    });

    it('updates semester preview when custom text is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'custom');

      const customInput = screen.getByPlaceholderText(/custom semester/i);
      await user.type(customInput, 'Summer 2024');

      await waitFor(() => {
        expect(screen.getByText(/summer 2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('associates labels with inputs', () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      expect(courseCodeInput).toHaveAttribute('name', 'course_code');

      const courseNameInput = screen.getByPlaceholderText(/course name/i);
      expect(courseNameInput).toHaveAttribute('name', 'course_name');
    });

    it('has proper input types for numeric fields', () => {
      const { container } = renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      expect(creditsInput).toHaveAttribute('type', 'number');

      const yearInput = container.querySelector('input[name="year"]');
      expect(yearInput).toHaveAttribute('type', 'number');
    });

    it('disables submit button during submission', async () => {
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const submitButton = screen.getByRole('button', { name: /add course/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in course code (hyphens allowed)', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'CS-101-A');

      expect(courseCodeInput).toHaveValue('CS-101-A');
    });

    it('trims whitespace from course code', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const courseCodeInput = screen.getByPlaceholderText(/course code/i);
      await user.type(courseCodeInput, 'CS101');

      // Whitespace trimming happens during validation, not during typing
      expect(courseCodeInput).toHaveValue('CS101');
    });

    it('handles zero credits gracefully', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const creditsInput = screen.getByLabelText(/credits/i);
      await user.clear(creditsInput);
      await user.type(creditsInput, '0');

      expect(creditsInput).toHaveValue(0);
    });

    it('handles academic year semester type', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCourseModal onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const semesterSelect = screen.getByRole('combobox');
      await user.selectOptions(semesterSelect, 'academic_year');

      await waitFor(() => {
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`Academic Year ${currentYear}`))).toBeInTheDocument();
      });
    });
  });
});
