import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPanel from '../AdminUsersPanel';
import { adminUsersAPI, rbacAPI } from '@/api/api';

vi.mock('@/api/api', () => ({
  adminUsersAPI: { list: vi.fn(), update: vi.fn(), resetPassword: vi.fn(), changeOwnPassword: vi.fn() },
  rbacAPI: { getSummary: vi.fn() },
}));

// Stable identity, like the real context: a fresh object per render would re-run the load effect.
const authValue = { user: { id: 1, role: 'admin', email: 'admin@example.com' }, accessToken: 'tok', updateUser: vi.fn() };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authValue,
}));

const languageValue = { t: (key: string) => key };
vi.mock('@/LanguageContext', () => ({
  useLanguage: () => languageValue,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const pending = {
  id: 7, email: 'new@example.com', full_name: 'New User', role: 'teacher', is_active: false, registration_pending: true,
};
const admin = { id: 1, email: 'admin@example.com', full_name: 'Admin', role: 'admin', is_active: true };
// Deactivated by an admin: inactive, but not a registration waiting for approval
const deactivated = {
  id: 9, email: 'old-admin@example.com', full_name: 'Old Admin', role: 'admin', is_active: false, registration_pending: false,
};

describe('AdminUsersPanel approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUsersAPI.list).mockResolvedValue([admin, pending] as never);
    vi.mocked(rbacAPI.getSummary).mockResolvedValue({ roles: [], user_roles: [] } as never);
  });

  it('shows the pending notice and lists inactive accounts first', async () => {
    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('pending-users-notice')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('new@example.com');
    expect(screen.queryByTestId('approve-user-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-status-7')).toHaveTextContent('statusPendingApproval');
  });

  it('does not offer to approve an account an admin deactivated', async () => {
    // 2026-10-12: the deactivated admin@example.com was shown as a registration with Approve
    vi.mocked(adminUsersAPI.list).mockResolvedValue([admin, deactivated] as never);
    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('user-status-9')).toHaveTextContent('inactive');
    expect(screen.queryByTestId('approve-user-9')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-users-notice')).not.toBeInTheDocument();
  });

  it('applies the server password rule before changing your own password', async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-status-7');
    const field = (name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    const submit = screen.getByRole('button', { name: /changeOwnPasswordButton/ });

    await user.type(field('currentPassword'), 'Current#2026');
    // 12 characters, but no symbol: the old score accepted it, the server refuses it
    await user.type(field('newPassword'), 'Abcdefgh1234');
    await user.type(field('confirmPassword'), 'Abcdefgh1234');
    expect(submit).toBeDisabled();
    expect(screen.getByTestId('own-password-unmet')).toHaveTextContent('passwordSpecial');

    await user.clear(field('newPassword'));
    await user.clear(field('confirmPassword'));
    await user.type(field('newPassword'), 'Short#1a');  // 8 characters with every class
    await user.type(field('confirmPassword'), 'Short#1a');
    expect(submit).toBeEnabled();
    expect(screen.queryByTestId('own-password-unmet')).not.toBeInTheDocument();
  });

  it('refuses a reset password the server would refuse, without calling it', async () => {
    const onToast = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AdminUsersPanel onToast={onToast} />);
    await screen.findByTestId('user-status-7');

    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('new@example.com'))!;
    await user.click(within(row).getByRole('button', { name: /resetPassword/ }));
    await user.type(container.querySelector('input[name="resetPassword"]') as HTMLInputElement, 'password');
    await user.click(screen.getByRole('button', { name: /applyReset/ }));

    expect(adminUsersAPI.resetPassword).not.toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith({
      message: 'passwordStillNeeds: passwordUppercase, passwordNumber, passwordSpecial',
      type: 'error',
    });
  });

  it.each([
    ['sent', 'activationEmailSent', 'success'],
    ['failed', 'activationEmailFailed', 'error'],
    ['not_configured', 'activationEmailNotConfigured', 'error'],
  ])('reports activation email outcome "%s" to the admin', async (outcome, messageKey, type) => {
    vi.mocked(adminUsersAPI.update).mockResolvedValue({ ...pending, is_active: true, activation_email: outcome } as never);
    const onToast = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={onToast} />);

    await user.click(await screen.findByTestId('approve-user-7'));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith({ message: messageKey, type }));
    expect(adminUsersAPI.update).toHaveBeenCalledWith(7, { is_active: true });
    await waitFor(() => expect(screen.queryByTestId('approve-user-7')).not.toBeInTheDocument());
  });
});
