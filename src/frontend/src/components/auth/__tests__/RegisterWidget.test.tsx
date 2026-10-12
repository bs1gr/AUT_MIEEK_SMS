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

const mockedApiClient = apiClient as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

describe('RegisterWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.get.mockResolvedValue({ data: { mode: 'approval' } });
  });

  const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(await screen.findByTestId('register-email'), 'new@example.com');
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

  it('does not log in and says approval is pending when the account comes back inactive', async () => {
    mockedApiClient.post.mockResolvedValue({ data: { id: 7, email: 'new@example.com', is_active: false } });
    const onRegisterSuccess = vi.fn();
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" onRegisterSuccess={onRegisterSuccess} />);

    await fillAndSubmit(user);

    expect(await screen.findByText('auth.registerPendingApproval')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(onRegisterSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('register-email')).toHaveValue('');
    expect(screen.getByTestId('register-password')).toHaveValue('');
  });

  it('shows the translated message when public registration is disabled', async () => {
    mockedApiClient.post.mockRejectedValue({
      response: {
        status: 403,
        data: { error: { message: 'Public registration is disabled.', details: { error_code: 'AUTH_REGISTRATION_DISABLED' } } },
      },
    });
    const user = userEvent.setup();
    render(<RegisterWidget variant="inline" />);

    await fillAndSubmit(user);

    expect(await screen.findByText('auth.registerDisabled')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  describe('when the server accepts no registrations (SMS Lite on local SQLite)', () => {
    it('shows no form, only who creates accounts', async () => {
      mockedApiClient.get.mockResolvedValue({ data: { mode: 'disabled' } });
      render(<RegisterWidget variant="inline" collapsedByDefault />);

      expect(await screen.findByTestId('register-admin-only')).toHaveTextContent('auth.registerByAdminOnly');
      expect(mockedApiClient.get).toHaveBeenCalledWith('/auth/registration-mode');
      expect(screen.queryByTestId('register-toggle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('register-email')).not.toBeInTheDocument();
    });

    it('renders nothing in the dialog variant', async () => {
      mockedApiClient.get.mockResolvedValue({ data: { mode: 'disabled' } });
      const { container } = render(<RegisterWidget variant="dialog" />);

      await waitFor(() => expect(mockedApiClient.get).toHaveBeenCalled());
      await waitFor(() => expect(container).toBeEmptyDOMElement());
    });

    it('keeps the form when the server is older and has no mode endpoint', async () => {
      mockedApiClient.get.mockRejectedValue({ response: { status: 404 } });
      render(<RegisterWidget variant="inline" />);

      expect(await screen.findByTestId('register-email')).toBeInTheDocument();
    });
  });

  describe('inline variant collapse toggle', () => {
    it('starts collapsed when collapsedByDefault is set and expands on toggle', async () => {
      const user = userEvent.setup();
      render(<RegisterWidget variant="inline" collapsedByDefault />);

      const toggle = await screen.findByTestId('register-toggle');
      expect(screen.queryByTestId('register-email')).not.toBeInTheDocument();

      await user.click(toggle);

      expect(screen.getByTestId('register-email')).toBeInTheDocument();
    });
  });

  describe('dialog variant', () => {
    it('opens the dialog and reveals the form on trigger click', async () => {
      const user = userEvent.setup();
      render(<RegisterWidget variant="dialog" />);

      await user.click(await screen.findByTestId('register-open'));

      expect(await screen.findByTestId('register-email')).toBeInTheDocument();
    });
  });
});
