import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPermissionsPage from '../AdminPermissionsPage';
import * as apiModule from '../../api/api';

const mockApiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

// Mock the API client (default and named) to align with component imports
vi.mock('../../api/api', () => ({
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  extractAPIResponseData: (response: Record<string, unknown> | null | undefined) => response?.data || response,
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>
  );
}

describe('AdminPermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and permissions list with grant controls', async () => {
    // Mock permissions API response
    const mockPermissions = [
      {
        id: 1,
        key: 'students:view',
        resource: 'students',
        action: 'view',
        description: 'View students',
        is_active: true,
      },
      {
        id: 2,
        key: 'courses:edit',
        resource: 'courses',
        action: 'edit',
        description: 'Edit courses',
        is_active: true,
      },
    ];

    // Mock roles API response
    const mockRoles = [
      { id: 1, name: 'admin', description: 'Administrator' },
      { id: 2, name: 'teacher', description: 'Teacher' },
    ];

    const mockPermissionsByResource = [
      { resource: 'students', permissions: [mockPermissions[0]] },
      { resource: 'courses', permissions: [mockPermissions[1]] },
    ];

    const mockStats = {
      total_permissions: 2,
      active_permissions: 2,
      inactive_permissions: 0,
      permissions_by_resource: { students: 1, courses: 1 },
      most_common_actions: [['view', 1], ['edit', 1]],
    };

    vi.mocked(apiModule.apiClient.get).mockImplementation((url: string) => {
      if (url === '/permissions') {
        return Promise.resolve({ data: mockPermissions });
      }
      if (url === '/permissions/by-resource') {
        return Promise.resolve({ data: mockPermissionsByResource });
      }
      if (url === '/permissions/stats') {
        return Promise.resolve({ data: mockStats });
      }
      if (url === '/rbac/roles') {
        return Promise.resolve({ data: mockRoles });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<AdminPermissionsPage />);

    // Wait for main heading to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    // Verify grant section exists
    await waitFor(() => {
      expect(screen.getByText(/grant permission/i)).toBeInTheDocument();
    });

    // Verify revoke section exists
    expect(screen.getByText(/revoke permission/i)).toBeInTheDocument();

    // Verify audit section exists
    expect(screen.getByText(/permission audit/i)).toBeInTheDocument();

    // Verify permissions are rendered in the list (using descriptions to avoid dropdown collision)
    await waitFor(() => {
      const permissionList = screen.getByRole('list');
      expect(permissionList).toBeInTheDocument();
      expect(screen.getByText('View students')).toBeInTheDocument();
      expect(screen.getByText('Edit courses')).toBeInTheDocument();
    });

    // Verify resource badges (use getAllByText since they appear in both dropdown and list)
    const studentsBadges = screen.getAllByText('students');
    expect(studentsBadges.length).toBeGreaterThan(0);
    const coursesBadges = screen.getAllByText('courses');
    expect(coursesBadges.length).toBeGreaterThan(0);
  });

  it('allows granting, revoking, and auditing permissions', async () => {
    const mockPermissions = [
      {
        id: 1,
        key: 'students:view',
        resource: 'students',
        action: 'view',
        description: 'View students',
        is_active: true,
      },
    ];
    const mockRoles = [{ id: 1, name: 'admin', description: 'Administrator' }];
    const mockPermissionsByResource = [{ resource: 'students', permissions: mockPermissions }];
    const mockStats = {
      total_permissions: 1,
      active_permissions: 1,
      inactive_permissions: 0,
      permissions_by_resource: { students: 1 },
      most_common_actions: [['view', 1]],
    };
    const mockUserPermissions = {
      user_id: 42,
      email: 'user@example.com',
      role: 'teacher',
      permissions: ['students:view'],
      direct_permissions: [
        { permission_key: 'students:view', granted_at: '2026-01-10T00:00:00Z', expires_at: null },
      ],
      role_permissions: [],
    };

    vi.mocked(apiModule.apiClient.get).mockImplementation((url: string) => {
      if (url === '/permissions') return Promise.resolve({ data: mockPermissions });
      if (url === '/permissions/by-resource') return Promise.resolve({ data: mockPermissionsByResource });
      if (url === '/permissions/stats') return Promise.resolve({ data: mockStats });
      if (url === '/rbac/roles') return Promise.resolve({ data: mockRoles });
      if (url === '/permissions/users/42') return Promise.resolve({ data: mockUserPermissions });
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const postSpy = vi.mocked(apiModule.apiClient.post);
    postSpy.mockResolvedValue({ data: { status: 'ok' } });

    const user = userEvent.setup();
    renderWithProviders(<AdminPermissionsPage />);

    // wait for data load
    await waitFor(() => expect(screen.getByText(/grant permission/i)).toBeInTheDocument());

    const grantCard = screen.getByText(/grant permission/i).closest('div');
    expect(grantCard).toBeTruthy();
    const [grantToSelect, grantRoleSelect, grantPermissionSelect] = within(grantCard as HTMLElement).getAllByRole('combobox');

    // Grant to role
    await user.selectOptions(grantToSelect, 'role');
    await user.selectOptions(grantRoleSelect, 'admin');
    await user.selectOptions(grantPermissionSelect, 'students:view');
    await user.click(screen.getByRole('button', { name: /grant/i }));

    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/permissions/roles/grant', expect.anything()));
    expect(screen.getByText(/permission granted successfully/i)).toBeInTheDocument();

    const revokeCard = screen.getByText(/revoke permission/i).closest('div');
    expect(revokeCard).toBeTruthy();
    const [revokeGrantToSelect, revokeRoleSelect, revokePermissionSelect] = within(revokeCard as HTMLElement).getAllByRole('combobox');

    // Revoke from role
    await user.selectOptions(revokeGrantToSelect, 'role');
    await user.selectOptions(revokeRoleSelect, 'admin');
    await user.selectOptions(revokePermissionSelect, 'students:view');
    await user.click(screen.getByRole('button', { name: /revoke/i }));

    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/permissions/roles/revoke', expect.anything()));
    expect(screen.getByText(/permission revoked successfully/i)).toBeInTheDocument();

    // Audit: lookup user permissions
    await user.clear(screen.getByPlaceholderText(/enter user id/i));
    await user.type(screen.getByPlaceholderText(/enter user id/i), '42');
    await user.click(screen.getByRole('button', { name: /view permissions/i }));

    await waitFor(() => expect(screen.getByText('user@example.com')).toBeInTheDocument());
    const directPermissionsSection = screen.getByText(/direct permissions/i).closest('div');
    expect(directPermissionsSection).toBeTruthy();
    expect(within(directPermissionsSection as HTMLElement).getByText('students:view')).toBeInTheDocument();
  });
});
