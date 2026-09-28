import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPanel from '../AdminUsersPanel';
import { adminUsersAPI, rbacAPI } from '@/api/api';

vi.mock('@/api/api', () => ({
  adminUsersAPI: { list: vi.fn(), update: vi.fn() },
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

const pending = { id: 7, email: 'new@example.com', full_name: 'New User', role: 'teacher', is_active: false };
const admin = { id: 1, email: 'admin@example.com', full_name: 'Admin', role: 'admin', is_active: true };

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
