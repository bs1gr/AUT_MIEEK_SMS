/**
 * Control Panel > Maintenance > User Accounts, for an account that is not an administrator.
 *
 * The form "Change Your Password" stood behind the administrator check of this panel, so the
 * panel answered a teacher with "Access Denied" and a teacher had no page for a new password:
 * the only way was to ask an administrator for a reset (the owner, 18 November 2026: "should
 * have access there"). Everybody who is signed in now gets the form; the list of accounts and
 * the form for a new account stay with the administrator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPanel from '../AdminUsersPanel';
import { adminUsersAPI } from '@/api/api';

vi.mock('@/api/api', () => ({
  adminUsersAPI: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
    changeOwnPassword: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  rbacAPI: { getSummary: vi.fn() },
}));

type Signed = { id: number; role: string; email: string } | null;
// One object for the whole file, like the real context; the tests change what it holds.
const authValue: { user: Signed; accessToken: string | null; updateUser: ReturnType<typeof vi.fn> } = {
  user: null,
  accessToken: 'tok',
  updateUser: vi.fn(),
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authValue }));

const languageValue = { t: (key: string) => key };
vi.mock('@/LanguageContext', () => ({ useLanguage: () => languageValue }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const signIn = (role: string | null) => {
  authValue.user = role ? { id: 3, role, email: `${role}@example.com` } : null;
  authValue.accessToken = role ? 'tok' : null;
};
const field = (name: string) => document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

describe('User Accounts: the own password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUsersAPI.list).mockResolvedValue([] as never);
    vi.mocked(adminUsersAPI.changeOwnPassword).mockResolvedValue({ status: 'ok' } as never);
    vi.mocked(adminUsersAPI.getCurrentUser).mockResolvedValue({ id: 3, role: 'teacher', email: 'teacher@example.com' } as never);
  });

  it.each(['teacher', 'none'])('gives an account with the role %s the password form, and not the accounts', (role) => {
    signIn(role);

    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(screen.getByText('changeOwnPasswordTitle')).toBeInTheDocument();
    expect(field('currentPassword')).toBeInTheDocument();
    expect(screen.getByTestId('accounts-admin-only')).toHaveTextContent('accountsAdminOnlyNote');
    // What it used to say, and what stays with the administrator.
    expect(screen.queryByText('accessDeniedTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-role')).not.toBeInTheDocument();
    expect(screen.queryByText('administratorUsersHeading')).not.toBeInTheDocument();
    expect(adminUsersAPI.list).not.toHaveBeenCalled();
  });

  it('changes a teacher\'s password', async () => {
    signIn('teacher');
    const onToast = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={onToast} />);

    await user.type(field('currentPassword'), 'Old#Passw0rd');
    await user.type(field('newPassword'), 'New#Passw0rd');
    await user.type(field('confirmPassword'), 'New#Passw0rd');
    await user.click(screen.getByRole('button', { name: /changeOwnPasswordButton/ }));

    await waitFor(() => expect(adminUsersAPI.changeOwnPassword).toHaveBeenCalledWith('Old#Passw0rd', 'New#Passw0rd'));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith({ message: 'changeOwnPasswordSuccess', type: 'success' }));
    expect(field('currentPassword')).toHaveValue('');
  });

  it('does not send a new password the server would refuse', async () => {
    signIn('teacher');
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);

    await user.type(field('currentPassword'), 'Old#Passw0rd');
    await user.type(field('newPassword'), 'short');
    await user.type(field('confirmPassword'), 'short');

    expect(screen.getByRole('button', { name: /changeOwnPasswordButton/ })).toBeDisabled();
    expect(screen.getByTestId('own-password-unmet')).toBeInTheDocument();
    expect(adminUsersAPI.changeOwnPassword).not.toHaveBeenCalled();
  });

  it('still shows an administrator the form above the accounts', async () => {
    signIn('admin');

    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(screen.getByText('changeOwnPasswordTitle')).toBeInTheDocument();
    expect(await screen.findByText('administratorUsersHeading')).toBeInTheDocument();
    expect(screen.getByTestId('create-role')).toBeInTheDocument();
    expect(screen.queryByTestId('accounts-admin-only')).not.toBeInTheDocument();
    await waitFor(() => expect(adminUsersAPI.list).toHaveBeenCalledTimes(1));
  });

  it('gives an administrator whom the server refuses the list the form, and says so', async () => {
    signIn('admin');
    vi.mocked(adminUsersAPI.list).mockRejectedValue({ response: { status: 403 } });

    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('accounts-admin-only')).toBeInTheDocument();
    expect(screen.getByText('changeOwnPasswordTitle')).toBeInTheDocument();
  });

  it('says "Access Denied" to nobody but somebody who is not signed in', () => {
    signIn(null);

    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(screen.getByText('accessDeniedTitle')).toBeInTheDocument();
    expect(screen.queryByText('changeOwnPasswordTitle')).not.toBeInTheDocument();
  });
});
