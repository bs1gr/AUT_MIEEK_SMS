import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesSection from './NotesSection';
import { LanguageProvider } from '@/LanguageContext';

// Helper function to render with LanguageProvider
const renderWithLanguage = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('NotesSection', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      expect(screen.getByText(/notes/i)).toBeInTheDocument();
    });

    it('renders textarea element', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('displays placeholder text', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByPlaceholderText(/additional notes/i);
      expect(textarea).toBeInTheDocument();
    });

    it('displays current value in textarea', () => {
      const testValue = 'Student shows excellent progress in mathematics.';
      renderWithLanguage(<NotesSection value={testValue} onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(testValue);
    });
  });

  describe('User Interaction', () => {
    it('calls onChange when user types', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test note');

      expect(mockOnChange).toHaveBeenCalled();
      // Should be called for each character typed
      expect(mockOnChange).toHaveBeenCalledTimes(9); // 'Test note' = 9 characters
    });

    it('calls onChange with correct value', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'A');

      expect(mockOnChange).toHaveBeenCalledWith('A');
    });

    it('calls onChange when user clears text', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="Some text" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('handles paste events', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('Pasted content');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles multi-line text input', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1{Enter}Line 2');

      expect(mockOnChange).toHaveBeenCalled();
      // Check that Enter was processed
      const calls = mockOnChange.mock.calls;
      const hasNewline = calls.some(call => call[0].includes('\n'));
      expect(hasNewline).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string value', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });

    it('handles very long text', () => {
      const longText = 'A'.repeat(1000);
      renderWithLanguage(<NotesSection value={longText} onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longText);
    });

    it('handles special characters', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      const specialText = '!@#$%^&*()_+-=';
      await user.type(textarea, specialText);

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles unicode characters (Greek, emoji)', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Καλός μαθητής 🎓');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles line breaks correctly', () => {
      const textWithLineBreaks = 'Line 1\nLine 2\nLine 3';
      renderWithLanguage(<NotesSection value={textWithLineBreaks} onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(textWithLineBreaks);
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes to textarea', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');

      expect(textarea).toHaveClass('w-full');
      expect(textarea).toHaveClass('border');
      expect(textarea).toHaveClass('rounded');
      expect(textarea).toHaveClass('focus:ring-2');
      expect(textarea).toHaveClass('focus:ring-indigo-500');
    });

    it('has minimum height styling', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[100px]');
    });
  });

  describe('Accessibility', () => {
    it('textarea is keyboard accessible', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');

      textarea.focus();
      expect(textarea).toHaveFocus();
    });

    it('has proper role attribute', () => {
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('textarea can receive focus', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);

      expect(textarea).toHaveFocus();
    });
  });

  describe('Value Updates', () => {
    it('updates displayed value when prop changes', () => {
      const { rerender } = renderWithLanguage(
        <NotesSection value="Initial value" onChange={mockOnChange} />
      );

      let textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Initial value');

      rerender(
        <LanguageProvider>
          <NotesSection value="Updated value" onChange={mockOnChange} />
        </LanguageProvider>
      );

      textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Updated value');
    });

    it('handles rapid value changes', () => {
      const { rerender } = renderWithLanguage(
        <NotesSection value="" onChange={mockOnChange} />
      );

      for (let i = 1; i <= 5; i++) {
        rerender(
          <LanguageProvider>
            <NotesSection value={`Value ${i}`} onChange={mockOnChange} />
          </LanguageProvider>
        );

        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveValue(`Value ${i}`);
      }
    });
  });

  describe('Callback Behavior', () => {
    it('does not call onChange on initial render', () => {
      renderWithLanguage(<NotesSection value="Initial" onChange={mockOnChange} />);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when value prop changes', () => {
      const { rerender } = renderWithLanguage(
        <NotesSection value="Value 1" onChange={mockOnChange} />
      );

      mockOnChange.mockClear();

      rerender(
        <LanguageProvider>
          <NotesSection value="Value 2" onChange={mockOnChange} />
        </LanguageProvider>
      );

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('passes event target value to onChange', async () => {
      const user = userEvent.setup();
      renderWithLanguage(<NotesSection value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'X');

      // Last call should have 'X' as the value
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe('X');
    });
  });
});
