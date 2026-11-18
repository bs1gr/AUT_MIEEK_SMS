import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
// The application's own texts: the test set of '@/test-utils' has no role names.
import testI18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import { RBACPanel } from '../RBACPanel';
import type { RBACSummary } from '@/api/api';

const mockApiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const mockAssignRole = vi.hoisted(() => vi.fn());
const mockRevokeRole = vi.hoisted(() => vi.fn());
const mockEnsureDefaults = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock('@/api/api', () => ({
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  rbacAPI: {
    getSummary: vi.fn(),
    ensureDefaults: mockEnsureDefaults,
    assignRole: mockAssignRole,
    revokeRole: mockRevokeRole,
  },
  adminUsersAPI: { list: mockListUsers },
  isAuthOrPermissionError: () => false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@example.com', role: 'admin' },
    updateUser: vi.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <I18nextProvider i18n={testI18n}>
      <LanguageProvider>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}

describe('RBACPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns an additional role without revoking existing roles', async () => {
    const summary: RBACSummary = {
      roles: [
        { id: 1, name: 'admin', description: 'Admin' },
        { id: 2, name: 'teacher', description: 'Teacher' },
      ],
      permissions: [],
      role_permissions: [],
      user_roles: [
        { user_id: 1, role_id: 1 },
      ],
    };

    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(summary);
    vi.mocked(mockAssignRole).mockResolvedValue({ status: 'assigned' });

    renderWithProviders(<RBACPanel />);

    await screen.findByText('RBAC Configuration');

    const user = userEvent.setup();
    await user.click(screen.getByText('Assign Role to User'));

    await user.type(screen.getByPlaceholderText('Enter User ID'), '1');
    await user.selectOptions(screen.getByLabelText('Role Name'), 'teacher');
    const assignButtons = screen.getAllByRole('button', { name: 'Assign Role to User' });
    await user.click(assignButtons[assignButtons.length - 1]);

    await waitFor(() => {
      expect(mockAssignRole).toHaveBeenCalledWith(1, 'teacher');
    });
  });

  it('renders assigned roles and allows revocation', async () => {
    const summary: RBACSummary = {
      roles: [
        { id: 1, name: 'admin', description: 'Admin' },
        { id: 2, name: 'teacher', description: 'Teacher' },
      ],
      permissions: [],
      role_permissions: [],
      user_roles: [
        { user_id: 1, role_id: 1 },
        { user_id: 1, role_id: 2 },
      ],
    };

    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(summary);
    vi.mocked(mockRevokeRole).mockResolvedValue({ status: 'revoked' });

    renderWithProviders(<RBACPanel />);

    await screen.findByText('RBAC Configuration');

    const user = userEvent.setup();
    await user.click(screen.getByText('Assign Role to User'));

    await user.type(screen.getByPlaceholderText('Enter User ID'), '1');

    const revokeButtons = await screen.findAllByText('Revoke');
    expect(revokeButtons.length).toBeGreaterThan(0);

    await user.click(revokeButtons[0]);

    await waitFor(() => {
      expect(mockRevokeRole).toHaveBeenCalled();
    });
  });

  // What the server sends: a permission is known by its key. The Overview tab used to read a
  // "name" that was never sent, and showed 39 blank rows and mappings with nothing after the arrow.
  const serverSummary = {
    roles: [
      { id: 1, name: 'admin', description: 'Admin' },
      { id: 2, name: 'teacher', description: 'Teacher' },
    ],
    permissions: [
      { id: 1, key: 'students:view', resource: 'students', action: 'view', description: 'View all student records', is_active: true },
      { id: 2, key: '*:*', resource: '*', action: '*', description: 'All permissions (admin wildcard)', is_active: true },
      { id: 3, key: 'workshop.own:book', resource: 'workshop.own', action: 'book', description: 'Made by hand', is_active: true },
    ],
    role_permissions: [{ role_id: 2, permission_id: 1 }],
    user_roles: [
      { user_id: 1, role_id: 1 },
      { user_id: 3, role_id: 2 },
    ],
  } as RBACSummary;

  it('names every permission on the Overview tab by its key, with its name where it has one', async () => {
    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(serverSummary);

    renderWithProviders(<RBACPanel />);

    expect(await screen.findByTestId('rbac-permission-1')).toHaveTextContent('students:view');
    expect(screen.getByTestId('rbac-permission-1')).toHaveTextContent('View Students');
    // A key is looked up whole: i18next would split one at its colon (and at a dot).
    expect(screen.getByTestId('rbac-permission-2')).toHaveTextContent('*:*');
    expect(screen.getByTestId('rbac-permission-2')).toHaveTextContent('All Permissions');
    // A permission the installation added itself has no name: its key alone, dot and colon and all.
    expect(screen.getByTestId('rbac-permission-3').textContent).toBe('workshop.own:book');
    const mapping = screen.getByTestId('rbac-role-permission');
    expect(mapping).toHaveTextContent('Teacher');
    expect(mapping).toHaveTextContent('students:view');
  });

  it('lists the accounts on the Users tab as they are, also the ones without a role', async () => {
    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(serverSummary);
    mockListUsers.mockResolvedValue([
      { id: 3, email: 'maria@example.com', full_name: 'Maria Georgiou', role: 'teacher', is_active: true },
      { id: 1, email: 'admin@example.com', full_name: null, role: 'admin', is_active: true },
      { id: 7, email: 'former@example.com', full_name: 'Former Seven', role: 'none', is_active: true },
    ]);

    renderWithProviders(<RBACPanel />);
    await screen.findByText('RBAC Configuration');
    await userEvent.setup().click(screen.getByText('Users'));

    const teacher = await screen.findByTestId('rbac-user-3');
    expect(teacher).toHaveTextContent('Maria Georgiou');
    expect(teacher).toHaveTextContent('maria@example.com');
    expect(teacher).toHaveTextContent('ID: 3');
    expect(teacher).toHaveTextContent('Legacy role: Teacher');
    expect(screen.getByTestId('rbac-user-1')).toHaveTextContent('admin@example.com');
    expect(screen.getByTestId('rbac-user-1')).toHaveTextContent('Administrator');
    expect(screen.getByTestId('rbac-user-7')).toHaveTextContent('No RBAC roles assigned');
    expect(screen.getByText('User-Role Mappings (3 users)')).toBeInTheDocument();
    // What the tab used to make up for every account.
    expect(screen.queryByText(/@system/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy role: user/)).not.toBeInTheDocument();
  });

  it('shows the account numbers alone, and says so, when the list of accounts is refused', async () => {
    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(serverSummary);
    mockListUsers.mockRejectedValue({ response: { status: 403 } });

    renderWithProviders(<RBACPanel />);
    await screen.findByText('RBAC Configuration');
    await userEvent.setup().click(screen.getByText('Users'));

    expect(await screen.findByTestId('rbac-accounts-not-loaded')).toBeInTheDocument();
    expect(screen.getByTestId('rbac-user-3')).toHaveTextContent('ID: 3');
    expect(screen.getByTestId('rbac-user-3')).toHaveTextContent('Teacher');
    expect(screen.queryByText(/@system/)).not.toBeInTheDocument();
  });

  it('says that the account has no role left when its last one was revoked', async () => {
    // The server answers with the word the account's Role column now holds.
    const summary: RBACSummary = {
      roles: [{ id: 2, name: 'teacher', description: 'Teacher' }],
      permissions: [],
      role_permissions: [],
      user_roles: [{ user_id: 3, role_id: 2 }],
    };
    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(summary);
    vi.mocked(mockRevokeRole).mockResolvedValue({ status: 'revoked', role: 'none' });
    const user = userEvent.setup();
    renderWithProviders(<RBACPanel />);
    await screen.findByText('RBAC Configuration');
    await user.click(screen.getByText('Assign Role to User'));
    await user.type(screen.getByPlaceholderText('Enter User ID'), '3');

    expect(screen.queryByTestId('rbac-no-role-left')).not.toBeInTheDocument();
    await user.click((await screen.findAllByText('Revoke'))[0]);

    await waitFor(() => expect(mockRevokeRole).toHaveBeenCalledWith(3, 'teacher'));
    expect(await screen.findByTestId('rbac-no-role-left')).toHaveTextContent('The account has no role left.');
  });

  it('does not say so while the account still holds a role', async () => {
    const summary: RBACSummary = {
      roles: [
        { id: 2, name: 'teacher', description: 'Teacher' },
        { id: 3, name: 'admin', description: 'System administrator' },
      ],
      permissions: [],
      role_permissions: [],
      user_roles: [
        { user_id: 3, role_id: 2 },
        { user_id: 3, role_id: 3 },
      ],
    };
    const apiModule = await import('@/api/api');
    vi.mocked(apiModule.rbacAPI.getSummary).mockResolvedValue(summary);
    vi.mocked(mockRevokeRole).mockResolvedValue({ status: 'revoked', role: 'admin' });
    const user = userEvent.setup();
    renderWithProviders(<RBACPanel />);
    await screen.findByText('RBAC Configuration');
    await user.click(screen.getByText('Assign Role to User'));
    await user.type(screen.getByPlaceholderText('Enter User ID'), '3');

    await user.click((await screen.findAllByText('Revoke'))[0]);

    expect(await screen.findByText('Role revoked successfully')).toBeInTheDocument();
    expect(screen.queryByTestId('rbac-no-role-left')).not.toBeInTheDocument();
  });
});