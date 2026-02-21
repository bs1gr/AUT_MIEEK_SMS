import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { LanguageProvider } from '@/LanguageContext';
import { RBACPanel } from '../RBACPanel';
import type { RBACSummary } from '@/api/api';

const mockApiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const mockAssignRole = vi.hoisted(() => vi.fn());
const mockRevokeRole = vi.hoisted(() => vi.fn());
const mockEnsureDefaults = vi.hoisted(() => vi.fn());
const mockGrantPermission = vi.hoisted(() => vi.fn());

vi.mock('@/api/api', () => ({
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  rbacAPI: {
    getSummary: vi.fn(),
    ensureDefaults: mockEnsureDefaults,
    assignRole: mockAssignRole,
    revokeRole: mockRevokeRole,
    grantPermission: mockGrantPermission,
  },
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
});
