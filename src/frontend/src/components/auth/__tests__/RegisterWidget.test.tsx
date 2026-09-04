import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterWidget from '../RegisterWidget';
import apiClient from '@/api/api';

vi.mock('@/api/api');

const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockedApiClient = apiClient as unknown as { post: ReturnType<typeof vi.fn> };

describe('RegisterWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByTestId('register-email'), 'new@example.com');
    await user.type(screen.getByTestId('register-password'), 'secret123');
    await user.type(screen.getByTestId('register-fullname'), 'New User');
    await user.click(screen.getByTestId('register-submit'));
  };

  it('registers with a hardcoded teacher role to prevent privilege escalation', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} });
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" />);

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'secret123',
        full_name: 'New User',
        role: 'teacher',
      })
    );
  });

  it('logs in automatically and calls onRegisterSuccess after a successful registration', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} });
    mockLogin.mockResolvedValue(undefined);
    const onRegisterSuccess = vi.fn();
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" onRegisterSuccess={onRegisterSuccess} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('new@example.com', 'secret123'));
    await waitFor(() => expect(onRegisterSuccess).toHaveBeenCalled());
    expect(await screen.findByText('auth.registerSuccess')).toBeInTheDocument();
  });

  it('shows a partial-success message when registration succeeds but auto-login fails', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} });
    mockLogin.mockRejectedValue(new Error('login blocked'));
    const onRegisterSuccess = vi.fn();
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" onRegisterSuccess={onRegisterSuccess} />);

    await fillAndSubmit(user);

    expect(await screen.findByText('login blocked')).toBeInTheDocument();
    expect(onRegisterSuccess).not.toHaveBeenCalled();
  });

  it('shows an error message when registration itself fails', async () => {
    mockedApiClient.post.mockRejectedValue(new Error('email already exists'));
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" />);

    await fillAndSubmit(user);

    expect(await screen.findByText('email already exists')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  describe('inline variant collapse toggle', () => {
    it('starts collapsed when collapsedByDefault is set and expands on toggle', async () => {
      const user = userEvent.setup();
      render(<RegisterWidget variant="inline" collapsedByDefault />);

      expect(screen.queryByTestId('register-email')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('register-toggle'));

      expect(screen.getByTestId('register-email')).toBeInTheDocument();
    });
  });

  describe('dialog variant', () => {
    it('opens the dialog and reveals the form on trigger click', async () => {
      const user = userEvent.setup();
      render(<RegisterWidget variant="dialog" />);

      expect(screen.queryByTestId('register-email')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('register-open'));

      expect(await screen.findByTestId('register-email')).toBeInTheDocument();
    });
  });
});
