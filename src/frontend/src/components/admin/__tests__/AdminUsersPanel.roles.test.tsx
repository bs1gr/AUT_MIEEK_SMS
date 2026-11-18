/**
 * The role an account is listed with in User Accounts, and what Edit sends.
 *
 * Found on 18 November 2026 on a running copy:
 * - an account with the role Viewer or Guest (given under RBAC Configuration > Assign Role to
 *   User) could not be saved from Edit: the role box offered Administrator, Teacher and
 *   Student, showed "Administrator" and sent "viewer", which the server refuses (422);
 * - an administrator who got the role under Assign Role to User was listed as "Teacher",
 *   because the list replaced each account's role with the first of its role rows, and Edit
 *   followed by Save, with nothing changed, sent "teacher" and made the account one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPanel from '../AdminUsersPanel';
import { adminUsersAPI } from '@/api/api';

vi.mock('@/api/api', () => ({
  adminUsersAPI: { list: vi.fn(), update: vi.fn(), resetPassword: vi.fn(), changeOwnPassword: vi.fn() },
  // The list no longer asks for the role rows. If it does again, this test says so.
  rbacAPI: { getSummary: vi.fn(() => Promise.reject(new Error('the account list must not need the RBAC summary'))) },
}));

const authValue = { user: { id: 1, role: 'admin', email: 'head@example.com' }, accessToken: 'tok', updateUser: vi.fn() };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authValue }));

const texts: Record<string, string> = {
  'controlPanel.roles.admin': 'Administrator',
  'controlPanel.roles.teacher': 'Teacher',
  'controlPanel.roles.student': 'Student',
  'controlPanel.roles.viewer': 'Viewer',
  'controlPanel.roles.guest': 'Guest',
  'controlPanel.roles.none': 'No role',
};
const languageValue = { t: (key: string) => texts[key] ?? key };
vi.mock('@/LanguageContext', () => ({ useLanguage: () => languageValue }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const head = { id: 1, email: 'head@example.com', full_name: 'Head', role: 'admin', is_active: true };
// The server's answer for an administrator whose role rows are teacher, admin, viewer, guest.
const promoted = { id: 5, email: 'promoted@example.com', full_name: 'Promoted Teacher', role: 'admin', is_active: true };
const viewer = { id: 4, email: 'viewer@example.com', full_name: 'Read Only', role: 'viewer', is_active: true };
const teacher = { id: 3, email: 'teacher@example.com', full_name: 'Maria', role: 'teacher', is_active: true };
// An account whose roles were all revoked under Assign Role to User.
const roleless = { id: 8, email: 'former@example.com', full_name: 'Former Teacher', role: 'none', is_active: true };

const rowOf = (email: string) => screen.getAllByRole('row').find((row) => row.textContent?.includes(email))!;
const optionsOf = (select: HTMLElement) => within(select).getAllByRole('option').map((option) => option.textContent);

describe('AdminUsersPanel roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUsersAPI.list).mockResolvedValue([head, promoted, viewer, teacher] as never);
    vi.mocked(adminUsersAPI.update).mockImplementation((id: number, payload: Record<string, unknown>) =>
      Promise.resolve({ ...[head, promoted, viewer, teacher].find((account) => account.id === id)!, ...payload } as never)
    );
  });

  it('lists every account with the role the server gives it', async () => {
    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('user-role-5')).toHaveTextContent('Administrator');
    expect(screen.getByTestId('user-role-4')).toHaveTextContent('Viewer');
    expect(screen.getByTestId('user-role-3')).toHaveTextContent('Teacher');
  });

  it('saves a Viewer account from Edit without touching its role', async () => {
    const onToast = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={onToast} />);
    await screen.findByTestId('user-role-4');

    await user.click(within(rowOf('viewer@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-4') as HTMLSelectElement;
    expect(box.value).toBe('viewer');
    expect(optionsOf(box)).toEqual(['Viewer', 'Administrator', 'Teacher', 'Student']);
    await user.click(within(rowOf('viewer@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(adminUsersAPI.update).toHaveBeenCalledWith(4, { full_name: 'Read Only', is_active: true }));
    expect(onToast).toHaveBeenCalledWith({ message: 'updateUserSuccess', type: 'success' });
    expect(await screen.findByTestId('user-role-4')).toHaveTextContent('Viewer');
  });

  it('sends the role when another one is chosen', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-4');

    await user.click(within(rowOf('viewer@example.com')).getByRole('button', { name: /edit/i }));
    await user.selectOptions(screen.getByTestId('edit-role-4'), 'teacher');
    await user.click(within(rowOf('viewer@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(adminUsersAPI.update).toHaveBeenCalledWith(4, { full_name: 'Read Only', is_active: true, role: 'teacher' })
    );
    expect(await screen.findByTestId('user-role-4')).toHaveTextContent('Teacher');
  });

  it('leaves an administrator an administrator when Edit is saved with nothing changed', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-5');

    await user.click(within(rowOf('promoted@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-5') as HTMLSelectElement;
    expect(box.value).toBe('admin');
    // An account with one of the three roles of this panel gets no extra entry.
    expect(optionsOf(box)).toEqual(['Administrator', 'Teacher', 'Student']);
    await user.click(within(rowOf('promoted@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(adminUsersAPI.update).toHaveBeenCalledWith(5, { full_name: 'Promoted Teacher', is_active: true }));
    expect(await screen.findByTestId('user-role-5')).toHaveTextContent('Administrator');
  });

  it('lists an account without a role as that, and gives it one from Edit', async () => {
    vi.mocked(adminUsersAPI.list).mockResolvedValue([head, roleless] as never);
    vi.mocked(adminUsersAPI.update).mockResolvedValue({ ...roleless, role: 'teacher' } as never);
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('user-role-8')).toHaveTextContent('No role');
    await user.click(within(rowOf('former@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-8') as HTMLSelectElement;
    expect(box.value).toBe('none');
    expect(optionsOf(box)).toEqual(['No role', 'Administrator', 'Teacher', 'Student']);
    await user.selectOptions(box, 'teacher');
    await user.click(within(rowOf('former@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(adminUsersAPI.update).toHaveBeenCalledWith(8, { full_name: 'Former Teacher', is_active: true, role: 'teacher' })
    );
    expect(await screen.findByTestId('user-role-8')).toHaveTextContent('Teacher');
  });
});