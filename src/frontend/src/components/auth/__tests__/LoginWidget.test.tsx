import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginWidget from '../LoginWidget';

const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('LoginWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inline variant', () => {
    it('renders the form directly without a dialog trigger', () => {
      render(<LoginWidget variant="inline" />);

      expect(screen.getByTestId('auth-login-email')).toBeInTheDocument();
      expect(screen.getByTestId('auth-login-password')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'common.login' })).toBeInTheDocument();
    });

    it('shows a validation error and does not call login when email is empty', async () => {
      const user = userEvent.setup();
      render(<LoginWidget variant="inline" />);

      await user.type(screen.getByTestId('auth-login-password'), 'secret123');
      await user.click(screen.getByRole('button', { name: 'common.login' }));

      expect(mockLogin).not.toHaveBeenCalled();
      expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
    });

    it('shows a validation error and does not call login when password is empty', async () => {
      const user = userEvent.setup();
      render(<LoginWidget variant="inline" />);

      await user.type(screen.getByTestId('auth-login-email'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: 'common.login' }));

      expect(mockLogin).not.toHaveBeenCalled();
      expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
    });

    it('calls login with trimmed credentials and fires onLoginSuccess', async () => {
      mockLogin.mockResolvedValue(undefined);
      const onLoginSuccess = vi.fn();
      const user = userEvent.setup();
      render(<LoginWidget variant="inline" onLoginSuccess={onLoginSuccess} />);

      await user.type(screen.getByTestId('auth-login-email'), '  user@example.com  ');
      await user.type(screen.getByTestId('auth-login-password'), 'secret123');
      await user.click(screen.getByRole('button', { name: 'common.login' }));

      await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123'));
      await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
    });

    it('shows an error message when login rejects', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      const user = userEvent.setup();
      render(<LoginWidget variant="inline" />);

      await user.type(screen.getByTestId('auth-login-email'), 'user@example.com');
      await user.type(screen.getByTestId('auth-login-password'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'common.login' }));

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    });

    it('surfaces the first field-level message on a 422 validation error', async () => {
      const validationError = Object.assign(new Error('Unprocessable Entity'), {
        response: {
          status: 422,
          data: {
            error: {
              details: {
                errors: [{ loc: ['body', 'email'], msg: 'not a valid email' }],
              },
            },
          },
        },
      });
      mockLogin.mockRejectedValue(validationError);
      const user = userEvent.setup();
      render(<LoginWidget variant="inline" />);

      await user.type(screen.getByTestId('auth-login-email'), 'user@example.com');
      await user.type(screen.getByTestId('auth-login-password'), 'secret123');
      await user.click(screen.getByRole('button', { name: 'common.login' }));

      expect(await screen.findByText(/body\.email.*not a valid email/)).toBeInTheDocument();
    });
  });

  describe('dialog variant', () => {
    it('opens the dialog and reveals the form on trigger click', async () => {
      const user = userEvent.setup();
      render(<LoginWidget variant="dialog" />);

      expect(screen.queryByTestId('auth-login-email')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'common.login' }));

      expect(await screen.findByTestId('auth-login-email')).toBeInTheDocument();
    });
  });
});
