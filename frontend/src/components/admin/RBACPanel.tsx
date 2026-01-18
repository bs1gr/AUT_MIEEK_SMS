import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApiMutation, useApiQuery } from '@/hooks/useApiWithRecovery';
import apiClient from '@/api/api';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
}

interface RBACSummary {
  roles: Role[];
  permissions: Permission[];
  role_permissions: Array<{ role_id: number; permission_id: number }>;
  user_roles: Array<{ user_id: number; role_id: number }>;
}

export const RBACPanel: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');

  // Fetch RBAC summary
  const { data: rbacData, isLoading: isSummaryLoading, refetch: refetchSummary } = useApiQuery<RBACSummary>(
    ['rbac-summary'],
    () => apiClient.get('/admin/rbac/summary').then(r => r.data),
    { enabled: activeTab === 'overview' || activeTab === 'users' }
  );

  // Fetch users list
  const { data: usersData } = useApiQuery<{ items: User[] }>(
    ['users-list'],
    () => apiClient.get('/users/').then(r => r.data),
    { enabled: activeTab === 'users' }
  );

  // Ensure defaults mutation
  const ensureDefaultsMutation = useApiMutation<{ status: string }, Error, Record<string, never>>(
    () => apiClient.post<{ status: string }>('/admin/rbac/ensure-defaults').then((r) => r.data),
    {
      onSuccess: () => {
        refetchSummary();
      },
    }
  );

  // Assign role mutation
  const assignRoleMutation = useApiMutation<{ status: string }, Error, { user_id: number; role_name: string }>(
    (data) => apiClient.post<{ status: string }>('/admin/rbac/assign-role', data).then((r) => r.data),
    {
      onSuccess: () => {
        setUserId(null);
        setRoleName('');
        refetchSummary();
      },
    }
  );

  // Grant permission mutation
  const grantPermissionMutation = useApiMutation<{ status: string }, Error, { role_name: string; permission_name: string }>(
    (data) => apiClient.post<{ status: string }>('/admin/rbac/grant-permission', data).then((r) => r.data),
    {
      onSuccess: () => {
        setSelectedRole(null);
        setSelectedPermission(null);
        refetchSummary();
      },
    }
  );

  const handleEnsureDefaults = async () => {
    await ensureDefaultsMutation.mutate({});
  };

  const handleAssignRole = async () => {
    if (!userId || !roleName) return;
    await assignRoleMutation.mutate({ user_id: userId, role_name: roleName });
  };

  const handleGrantPermission = async () => {
    if (!selectedRole || !selectedPermission || !rbacData) return;
    const role = rbacData.roles.find((r) => r.id === selectedRole);
    const perm = rbacData.permissions.find((p) => p.id === selectedPermission);
    if (!role || !perm) return;
    await grantPermissionMutation.mutate({ role_name: role.name, permission_name: perm.name });
  };

  const tabs = [
    { id: 'overview', label: t('common:overview') || 'Overview' },
    { id: 'users', label: t('common:users') || 'Users' },
    { id: 'assign-role', label: t('rbac.assignRole') },
    { id: 'grant-permission', label: t('rbac.grantPermission') },
    { id: 'settings', label: t('common:settings') || 'Settings' },
  ];

  if (isSummaryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('rbac.configuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && rbacData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('common:roles', { count: rbacData.roles.length }) || `Roles (${rbacData.roles.length})`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rbacData.roles.map((role) => (
                        <li key={role.id} className="text-sm p-2 bg-blue-50 rounded">
                          <strong>{role.name}</strong>
                          {role.description && <p className="text-xs text-gray-600">{role.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('common:permissions', { count: rbacData.permissions.length }) || `Permissions (${rbacData.permissions.length})`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {rbacData.permissions.map((perm) => (
                        <li key={perm.id} className="text-sm p-2 bg-green-50 rounded">
                          <strong>{perm.name}</strong>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('rbac.rolePermissionMappings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {rbacData.role_permissions.map((rp, idx) => {
                      const role = rbacData.roles.find((r) => r.id === rp.role_id);
                      const perm = rbacData.permissions.find((p) => p.id === rp.permission_id);
                      return (
                        <div key={idx} className="text-sm p-1 bg-gray-100 rounded flex justify-between">
                          <span>{role?.name}</span>
                          <span className="text-gray-600">→</span>
                          <span>{perm?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && usersData && rbacData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('rbac.userRoleMappings', { count: usersData.items.length })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {usersData.items.map((user) => {
                    const userRoles = rbacData.user_roles
                      .filter((ur) => ur.user_id === user.id)
                      .map((ur) => rbacData.roles.find((r) => r.id === ur.role_id))
                      .filter(Boolean);

                    return (
                      <div key={user.id} className="p-3 bg-gray-50 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{user.full_name || user.email}</div>
                            <div className="text-xs text-gray-600">{user.email}</div>
                            <div className="text-xs text-gray-500">{t('rbac.legacyRole', { role: user.role })}</div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {userRoles.length > 0 ? (
                              userRoles.map((role) => (
                                <span
                                  key={role!.id}
                                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {role!.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">{t('rbac.noRolesAssigned')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assign Role Tab */}
          {activeTab === 'assign-role' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('rbac.assignRole')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('rbac.userId')}</label>
                  <Input
                    type="number"
                    value={userId || ''}
                    onChange={(e) => setUserId(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <label htmlFor="role-select" className="text-sm font-medium">{t('rbac.roleName')}</label>
                  <select
                    id="role-select"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full p-2 border rounded"
                    aria-label="Select role"
                  >
                    <option value="">{t('rbac.selectRole')}</option>
                    {rbacData?.roles
                      .filter((role) => ["admin", "teacher", "guest"].includes(role.name))
                      .map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </div>
                <Button
                  onClick={handleAssignRole}
                  disabled={!userId || !roleName || assignRoleMutation.isPending}
                  className="w-full"
                >
                  {assignRoleMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t('rbac.assignRole')}
                </Button>
                {assignRoleMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {t('rbac.roleAssignedSuccess')}
                  </div>
                )}
                {assignRoleMutation.isError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t('rbac.roleAssignedError')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grant Permission Tab */}
          {activeTab === 'grant-permission' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('rbac.grantPermission')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="grant-role-select" className="text-sm font-medium">{t('rbac.roleName')}</label>
                  <select
                    id="grant-role-select"
                    value={selectedRole || ''}
                    onChange={(e) => setSelectedRole(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border rounded"
                    aria-label="Select role to grant permission"
                  >
                    <option value="">{t('rbac.selectRole')}</option>
                    {rbacData?.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="permission-select" className="text-sm font-medium">{t('rbac.permission')}</label>
                  <select
                    id="permission-select"
                    value={selectedPermission || ''}
                    onChange={(e) => setSelectedPermission(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border rounded"
                    aria-label="Select permission to grant"
                  >
                    <option value="">{t('rbac.selectPermission')}</option>
                    {rbacData?.permissions.map((perm) => (
                      <option key={perm.id} value={perm.id}>
                        {perm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleGrantPermission}
                  disabled={!selectedRole || !selectedPermission || grantPermissionMutation.isPending}
                  className="w-full"
                >
                  {grantPermissionMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t('rbac.grantPermission')}
                </Button>
                {grantPermissionMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {t('rbac.permissionGrantedSuccess')}
                  </div>
                )}
                {grantPermissionMutation.isError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t('rbac.permissionGrantedError')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('rbac.rbacInitialization')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('rbac.createDefaultsDesc')}
                </p>
                <Button onClick={handleEnsureDefaults} disabled={ensureDefaultsMutation.isPending} className="w-full">
                  {ensureDefaultsMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t('rbac.initializeDefaults')}
                </Button>
                {ensureDefaultsMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {t('rbac.defaultsInitializedSuccess')}
                  </div>
                )}
                {ensureDefaultsMutation.isError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t('rbac.defaultsInitializedError')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
