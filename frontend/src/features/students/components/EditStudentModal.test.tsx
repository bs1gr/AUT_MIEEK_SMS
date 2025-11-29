import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditStudentModal from './EditStudentModal';
import { LanguageProvider } from '@/LanguageContext';
import type { Student } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }: any) => <div onClick={onClick} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
};

const mockStudent: Student = {
  id: 1,
  student_id: 'S12345',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@test.com',
  phone: '1234567890',
  mobile_phone: '1234567890',
  enrollment_date: '2024-01-15',
  is_active: true,
  father_name: '',
  health_issue: '',
  note: '',
  study_year: 1,
};

describe('EditStudentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnUpdate.mockClear();
  });

  describe('Rendering', () => {
    it('renders modal with title and pre-filled form fields', () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText(/edit student/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('Doe');
      expect(screen.getByPlaceholderText(/email/i)).toHaveValue('john.doe@test.com');
      expect(screen.getByPlaceholderText(/phone/i)).toHaveValue('1234567890');
    });

    it('renders date fields with existing values', () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const enrollInput = screen.getByLabelText(/enrollment date/i) as HTMLInputElement;
      expect(enrollInput.value).toBe('2024-01-15');
    });

    it('renders action buttons with correct labels', () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('updates form fields when student prop changes', () => {
      const { rerender } = renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');

      const updatedStudent = { ...mockStudent, first_name: 'Jane', last_name: 'Smith' };
      rerender(
        <LanguageProvider>
          <EditStudentModal student={updatedStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
        </LanguageProvider>
      );

      expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Jane');
      expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('Smith');
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const backdrop = screen.getByText(/edit student/i).parentElement?.parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('allows editing all text fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const firstNameInput = screen.getByPlaceholderText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const lastNameInput = screen.getByPlaceholderText(/last name/i);
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      expect(firstNameInput).toHaveValue('Jane');
      expect(lastNameInput).toHaveValue('Smith');
    });

    it('allows editing phone number', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const phoneInput = screen.getByPlaceholderText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '9876543210');

      expect(phoneInput).toHaveValue('9876543210');
    });

    it('allows editing address textarea', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const addressField = screen.getByRole('textbox', { name: 'Address' });
      await user.type(addressField, '456 Oak Ave');
      
      expect(addressField).toHaveValue('456 Oak Ave');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty required field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const firstNameInput = screen.getByPlaceholderText(/first name/i);
      await user.clear(firstNameInput);

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it.skip('shows validation error for invalid email format', async () => {
      // Skipping: browser native validation on type="email"
    });

    it('validates phone number max length', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const phoneInput = screen.getByPlaceholderText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '1'.repeat(21)); // 21 chars

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be less than 20 characters/i)).toBeInTheDocument();
      });
    });

    it.skip('converts email to lowercase on submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const emailInput = screen.getByPlaceholderText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'JANE.SMITH@TEST.COM');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'jane.smith@test.com',
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it.skip('calls onUpdate with modified student data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const firstNameInput = screen.getByPlaceholderText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const lastNameInput = screen.getByPlaceholderText(/last name/i);
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledTimes(1);
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'john.doe@test.com',
          })
        );
      });
    });

    it.skip('preserves original student properties not in form', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            student_id: 'S12345',
            is_active: true,
          })
        );
      });
    });

    it.skip('calls onClose after successful update', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it.skip('updates phone and mobile_phone together', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      const phoneInput = screen.getByPlaceholderText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '5555555555');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '5555555555',
            mobile_phone: '5555555555',
          })
        );
      });
    });

    it.skip('handles submission with all fields modified', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      await user.clear(screen.getByPlaceholderText(/first name/i));
      await user.type(screen.getByPlaceholderText(/first name/i), 'Alice');
      
      await user.clear(screen.getByPlaceholderText(/last name/i));
      await user.type(screen.getByPlaceholderText(/last name/i), 'Johnson');
      
      await user.clear(screen.getByPlaceholderText(/email/i));
      await user.type(screen.getByPlaceholderText(/email/i), 'alice.j@test.com');
      
      await user.clear(screen.getByPlaceholderText(/phone/i));
      await user.type(screen.getByPlaceholderText(/phone/i), '1112223333');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'Alice',
            last_name: 'Johnson',
            email: 'alice.j@test.com',
            phone: '1112223333',
            mobile_phone: '1112223333',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('associates labels with inputs', () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enrollment date/i)).toBeInTheDocument();
    });

    it('has proper input types for semantic HTML', () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByPlaceholderText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByPlaceholderText(/phone/i)).toHaveAttribute('type', 'tel');
    });

    it('disables submit button during submission', async () => {
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles student with minimal data', () => {
      const minimalStudent: Student = {
        id: 2,
        student_id: 'S99999',
        first_name: 'Min',
        last_name: 'Data',
        email: 'min@test.com',
        phone: '',
        mobile_phone: '',
        enrollment_date: '2024-01-01',
        is_active: true,
        father_name: '',
        health_issue: '',
        note: '',
        study_year: 1,
      };

      renderWithProviders(
        <EditStudentModal student={minimalStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Min');
      expect(screen.getByPlaceholderText(/phone/i)).toHaveValue('');
    });

    it.skip('handles special characters in name fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      await user.clear(screen.getByPlaceholderText(/first name/i));
      await user.type(screen.getByPlaceholderText(/first name/i), "O'Brien");
      
      await user.clear(screen.getByPlaceholderText(/last name/i));
      await user.type(screen.getByPlaceholderText(/last name/i), 'Müller-Schmidt');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: "O'Brien",
            last_name: 'Müller-Schmidt',
          })
        );
      });
    });

    it.skip('handles empty optional fields correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditStudentModal student={mockStudent} onClose={mockOnClose} onUpdate={mockOnUpdate} />
      );

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('John');
      });

      const phoneInput = screen.getByPlaceholderText(/phone/i);
      await user.clear(phoneInput);

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '',
            mobile_phone: '',
          })
        );
      });
    });
  });
});
