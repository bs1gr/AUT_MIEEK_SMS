/**
 * The role an account is listed with in User Accounts, and what the two forms send.
 *
 * The application has two roles, Administrator and Teacher, and "No role" for an account that
 * holds none (the owner, 18 November 2026: Student leaves the role boxes, Viewer and Guest go).
 *
 * Two defects of the same day are pinned here as well:
 * - an administrator who got the role under Assign Role to User was listed as "Teacher",
 *   because the list replaced each account's role with the first of its role rows, and Edit
 *   followed by Save, with nothing changed, sent "teacher" and made the account one;
 * - an account whose word is not one the box offers was shown as "Administrator" and could
 *   not be saved (the box sent the word back, and the server refused it).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  },
  // The list no longer asks for the role rows. If it does again, this test says so.
  rbacAPI: { getSummary: vi.fn(() => Promise.reject(new Error('the account list must not need the RBAC summary'))) },
}));

const authValue = { user: { id: 1, role: 'admin', email: 'head@example.com' }, accessToken: 'tok', updateUser: vi.fn() };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authValue }));

const texts: Record<string, string> = {
  'controlPanel.roles.admin': 'Administrator',
  'controlPanel.roles.teacher': 'Teacher',
  'controlPanel.roles.none': 'No role',
};
const languageValue = { t: (key: string) => texts[key] ?? key };
vi.mock('@/LanguageContext', () => ({ useLanguage: () => languageValue }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const head = { id: 1, email: 'head@example.com', full_name: 'Head', role: 'admin', is_active: true };
// The server's answer for an administrator whose role rows are teacher first, then admin.
const promoted = { id: 5, email: 'promoted@example.com', full_name: 'Promoted Teacher', role: 'admin', is_active: true };
const teacher = { id: 3, email: 'teacher@example.com', full_name: 'Maria', role: 'teacher', is_active: true };
// An account that holds no role: its roles were revoked, or it was a Student, Viewer or Guest.
const roleless = { id: 8, email: 'former@example.com', full_name: 'Former Teacher', role: 'none', is_active: true };
// A word the box does not offer, as a database of an older version can still hold.
const oldWord = { id: 4, email: 'office@example.com', full_name: 'Office', role: 'staff', is_active: true };
const accounts = [head, promoted, teacher, roleless, oldWord];

const rowOf = (email: string) => screen.getAllByRole('row').find((row) => row.textContent?.includes(email))!;
const optionsOf = (select: HTMLElement) => within(select).getAllByRole('option').map((option) => option.textContent);

describe('AdminUsersPanel roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUsersAPI.list).mockResolvedValue(accounts as never);
    vi.mocked(adminUsersAPI.update).mockImplementation((id: number, payload: Record<string, unknown>) =>
      Promise.resolve({ ...accounts.find((account) => account.id === id)!, ...payload } as never)
    );
  });

  it('lists every account with the role the server gives it', async () => {
    render(<AdminUsersPanel onToast={vi.fn()} />);

    expect(await screen.findByTestId('user-role-5')).toHaveTextContent('Administrator');
    expect(screen.getByTestId('user-role-3')).toHaveTextContent('Teacher');
    expect(screen.getByTestId('user-role-8')).toHaveTextContent('No role');
    expect(screen.getByTestId('user-role-4')).toHaveTextContent('staff');
  });

  it('offers Administrator and Teacher for a new account, and nothing else', async () => {
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-5');

    expect(optionsOf(screen.getByTestId('create-role'))).toEqual(['Administrator', 'Teacher']);
  });

  it('leaves an administrator an administrator when Edit is saved with nothing changed', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-5');

    await user.click(within(rowOf('promoted@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-5') as HTMLSelectElement;
    expect(box.value).toBe('admin');
    expect(optionsOf(box)).toEqual(['Administrator', 'Teacher', 'No role']);
    await user.click(within(rowOf('promoted@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(adminUsersAPI.update).toHaveBeenCalledWith(5, { full_name: 'Promoted Teacher', is_active: true }));
    expect(await screen.findByTestId('user-role-5')).toHaveTextContent('Administrator');
  });

  it('takes every role away with "No role"', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-3');

    await user.click(within(rowOf('teacher@example.com')).getByRole('button', { name: /edit/i }));
    await user.selectOptions(screen.getByTestId('edit-role-3'), 'none');
    await user.click(within(rowOf('teacher@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(adminUsersAPI.update).toHaveBeenCalledWith(3, { full_name: 'Maria', is_active: true, role: 'none' })
    );
    expect(await screen.findByTestId('user-role-3')).toHaveTextContent('No role');
  });

  it('gives an account without a role one from Edit', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={vi.fn()} />);
    await screen.findByTestId('user-role-8');

    await user.click(within(rowOf('former@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-8') as HTMLSelectElement;
    expect(box.value).toBe('none');
    // "No role" is one of the three choices, so it gets no entry of its own on top.
    expect(optionsOf(box)).toEqual(['Administrator', 'Teacher', 'No role']);
    await user.selectOptions(box, 'teacher');
    await user.click(within(rowOf('former@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(adminUsersAPI.update).toHaveBeenCalledWith(8, { full_name: 'Former Teacher', is_active: true, role: 'teacher' })
    );
    expect(await screen.findByTestId('user-role-8')).toHaveTextContent('Teacher');
  });

  it('shows a word it does not offer as it is, and saves the account without touching it', async () => {
    const onToast = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersPanel onToast={onToast} />);
    await screen.findByTestId('user-role-4');

    await user.click(within(rowOf('office@example.com')).getByRole('button', { name: /edit/i }));
    const box = screen.getByTestId('edit-role-4') as HTMLSelectElement;
    expect(box.value).toBe('staff');
    expect(optionsOf(box)).toEqual(['staff', 'Administrator', 'Teacher', 'No role']);
    await user.click(within(rowOf('office@example.com')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(adminUsersAPI.update).toHaveBeenCalledWith(4, { full_name: 'Office', is_active: true }));
    expect(onToast).toHaveBeenCalledWith({ message: 'updateUserSuccess', type: 'success' });
  });
});
