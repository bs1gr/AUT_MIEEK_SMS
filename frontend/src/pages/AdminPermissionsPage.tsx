import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractAPIResponseData } from '@/api/api';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { useState } from 'react';

interface Permission {
  id: number;
  key: string;
  resource: string;
  action: string;
  description?: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface PermissionItem {
  id?: number;
  name: string;
  description?: string | null;
}

interface PermissionsByResource {
  resource: string;
  permissions: Permission[];
}

interface PermissionStats {
  total_permissions: number;
  active_permissions: number;
  inactive_permissions: number;
  permissions_by_resource: Record<string, number>;
  most_common_actions: [string, number][];
}

interface UserPermissionDetail {
  permission_key: string;
  granted_at?: string | null;
  expires_at?: string | null;
}

interface RolePermissionDetail {
  permission_key: string;
  role_name: string;
}

interface UserPermissionsResponse {
  user_id: number;
  email: string;
  role?: string | null;
  permissions: string[];
  direct_permissions: UserPermissionDetail[];
  role_permissions: RolePermissionDetail[];
}

type ToastType = 'success' | 'error' | 'info';
type ToastState = { message: string; type: ToastType } | null;

export default function AdminPermissionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [grantMode, setGrantMode] = useState<'user' | 'role'>('role');
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [revokeMode, setRevokeMode] = useState<'user' | 'role'>('role');
  const [revokePermission, setRevokePermission] = useState<string>('');
  const [revokeTargetId, setRevokeTargetId] = useState<string>('');
  const [toast, setToast] = useState<ToastState>(null);
  const [auditUserId, setAuditUserId] = useState<string>('');

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data, isLoading, isError } = useQuery<Permission[]>({
    queryKey: ['permissions', 'list'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions');
      return extractAPIResponseData(res) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: permissionsByResource } = useQuery<PermissionsByResource[]>({
    queryKey: ['permissions', 'by-resource'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions/by-resource');
      return extractAPIResponseData(res) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: permissionStats } = useQuery<PermissionStats>({
    queryKey: ['permissions', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions/stats');
      return extractAPIResponseData(res) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await apiClient.get('/rbac/roles');
      return extractAPIResponseData(response) ?? [];
    },
  });

  const grantRolePermission = useMutation({
    mutationFn: async ({ roleName, permissionKey }: { roleName: string; permissionKey: string }) => {
      const response = await apiClient.post('/permissions/roles/grant', {
        role_name: roleName,
        permission_key: permissionKey,
      });
      return extractAPIResponseData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setSelectedPermission('');
      setTargetId('');
      showToast(t('rbac.permissionGrantedSuccess'), 'success');
    },
    onError: () => showToast(t('rbac.permissionGrantedError'), 'error'),
  });

  const grantUserPermission = useMutation({
    mutationFn: async ({ userId, permissionKey }: { userId: number; permissionKey: string }) => {
      const response = await apiClient.post('/permissions/users/grant', {
        user_id: userId,
        permission_key: permissionKey,
      });
      return extractAPIResponseData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setSelectedPermission('');
      setTargetId('');
      showToast(t('rbac.permissionGrantedSuccess'), 'success');
    },
    onError: () => showToast(t('rbac.permissionGrantedError'), 'error'),
  });

  const revokeRolePermission = useMutation({
    mutationFn: async ({ roleName, permissionKey }: { roleName: string; permissionKey: string }) => {
      const response = await apiClient.post('/permissions/roles/revoke', {
        role_name: roleName,
        permission_key: permissionKey,
      });
      return extractAPIResponseData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setRevokePermission('');
      setRevokeTargetId('');
      showToast(t('rbac.permissionRevokedSuccess'), 'success');
    },
    onError: () => showToast(t('rbac.permissionRevokedError'), 'error'),
  });

  const revokeUserPermission = useMutation({
    mutationFn: async ({ userId, permissionKey }: { userId: number; permissionKey: string }) => {
      const response = await apiClient.post('/permissions/users/revoke', {
        user_id: userId,
        permission_key: permissionKey,
      });
      return extractAPIResponseData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setRevokePermission('');
      setRevokeTargetId('');
      showToast(t('rbac.permissionRevokedSuccess'), 'success');
    },
    onError: () => showToast(t('rbac.permissionRevokedError'), 'error'),
  });

  const userPermissionsQuery = useQuery<UserPermissionsResponse>({
    queryKey: ['permissions', 'user', auditUserId],
    enabled: Boolean(auditUserId),
    queryFn: async () => {
      const res = await apiClient.get(`/permissions/users/${auditUserId}`);
      return extractAPIResponseData(res);
    },
    staleTime: 60 * 1000,
    retry: 1,
    onError: () => showToast(t('rbac.userPermissionError'), 'error'),
  });

  const handleGrant = () => {
    if (!selectedPermission || !targetId) return;

    if (grantMode === 'role') {
      grantRolePermission.mutate({ roleName: targetId, permissionKey: selectedPermission });
    } else {
      grantUserPermission.mutate({ userId: parseInt(targetId), permissionKey: selectedPermission });
    }
  };

  const handleRevoke = () => {
    if (!revokePermission || !revokeTargetId) return;

    if (revokeMode === 'role') {
      revokeRolePermission.mutate({ roleName: revokeTargetId, permissionKey: revokePermission });
    } else {
      revokeUserPermission.mutate({ userId: parseInt(revokeTargetId), permissionKey: revokePermission });
    }
  };

  if (isLoading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {t('errors.generic') || 'An error occurred while loading permissions.'}
        </div>
      </div>
    );
  }

  const permissions = Array.isArray(data) ? data : [];
  const resources = Array.from(new Set(permissions.map((p) => p.resource)));
  const filteredPermissions =
    selectedResource === 'all' ? permissions : permissions.filter((p) => p.resource === selectedResource);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t('rbac.configuration')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('rbac.rolePermissionMappings')}
        </p>
      </div>

      {/* Grant Permission Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {t('rbac.grantPermission')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('rbac.grantTo')}
            </label>
            <select
              value={grantMode}
              onChange={(e) => setGrantMode(e.target.value as 'user' | 'role')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="role">{t('rbac.role')}</option>
              <option value="user">{t('rbac.user')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {grantMode === 'role' ? t('rbac.selectRole') : t('rbac.userId')}
            </label>
            {grantMode === 'role' ? (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('common.select')}</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder={t('rbac.enterUserId')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('rbac.selectPermission')}
            </label>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('common.select')}</option>
              {permissions.map((perm) => (
                <option key={perm.id} value={perm.key}>
                  {perm.key}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGrant}
              disabled={
                !selectedPermission ||
                !targetId ||
                grantRolePermission.isPending ||
                grantUserPermission.isPending
              }
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('rbac.grant')}
            </button>
          </div>
        </div>
      </div>

      {/* Revoke Permission Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {t('rbac.revokePermission')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('rbac.grantTo')}
            </label>
            <select
              value={revokeMode}
              onChange={(e) => setRevokeMode(e.target.value as 'user' | 'role')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="role">{t('rbac.role')}</option>
              <option value="user">{t('rbac.user')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {revokeMode === 'role' ? t('rbac.selectRole') : t('rbac.userId')}
            </label>
            {revokeMode === 'role' ? (
              <select
                value={revokeTargetId}
                onChange={(e) => setRevokeTargetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('common.select')}</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={revokeTargetId}
                onChange={(e) => setRevokeTargetId(e.target.value)}
                placeholder={t('rbac.enterUserId')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('rbac.selectPermission')}
            </label>
            <select
              value={revokePermission}
              onChange={(e) => setRevokePermission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('common.select')}</option>
              {permissions.map((perm) => (
                <option key={perm.id} value={perm.key}>
                  {perm.key}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRevoke}
              disabled={
                !revokePermission ||
                !revokeTargetId ||
                revokeRolePermission.isPending ||
                revokeUserPermission.isPending
              }
              className="w-full px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('rbac.revoke')}
            </button>
          </div>
        </div>
      </div>

      {/* Permission Audit Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('rbac.permissionAudit')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('rbac.permissionAuditDesc')}</p>
          </div>
          {permissionStats && (
            <div className="flex gap-2 flex-wrap text-sm">
              <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">
                {t('rbac.totalPermissions', { count: permissionStats.total_permissions })}
              </span>
              <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                {t('rbac.activePermissions', { count: permissionStats.active_permissions })}
              </span>
              <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {t('rbac.inactivePermissions', { count: permissionStats.inactive_permissions })}
              </span>
            </div>
          )}
        </div>

        {/* Permissions by resource */}
        {permissionsByResource && permissionsByResource.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissionsByResource.map((group) => (
              <div key={group.resource} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">{group.resource}</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {group.permissions.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.permissions.map((perm) => (
                    <span
                      key={perm.key}
                      className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100"
                    >
                      {perm.key}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User permission lookup */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-end md:gap-3 gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('rbac.userPermissionLookup')}
              </label>
              <input
                type="number"
                value={auditUserId}
                onChange={(e) => setAuditUserId(e.target.value)}
                placeholder={t('rbac.enterUserId')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => userPermissionsQuery.refetch()}
              disabled={!auditUserId || userPermissionsQuery.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('rbac.viewPermissions')}
            </button>
          </div>

          {userPermissionsQuery.isFetching && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-label={t('common.loading') || 'Loading'} />
              <span>{t('common.loading') || 'Loading...'}</span>
            </div>
          )}

          {userPermissionsQuery.isError && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {t('rbac.userPermissionError')}
            </div>
          )}

          {userPermissionsQuery.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">{userPermissionsQuery.data.email}</span>
                {userPermissionsQuery.data.role && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                    {userPermissionsQuery.data.role}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
                  {t('rbac.directPermissions')}
                </h4>
                {userPermissionsQuery.data.direct_permissions.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {userPermissionsQuery.data.direct_permissions.map((perm) => (
                      <li key={`${perm.permission_key}-${perm.granted_at ?? 'na'}`} className="flex items-center gap-2">
                        <span className="font-medium">{perm.permission_key}</span>
                        {perm.expires_at && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">
                            {t('rbac.expiresAt', { date: perm.expires_at })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
                  {t('rbac.rolePermissions')}
                </h4>
                {userPermissionsQuery.data.role_permissions.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {userPermissionsQuery.data.role_permissions.map((perm) => (
                      <li key={`${perm.permission_key}-${perm.role_name}`} className="flex items-center gap-2">
                        <span className="font-medium">{perm.permission_key}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                          {perm.role_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions List */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('rbac.permission', { count: filteredPermissions.length })}
          </h3>
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">{t('common.all')}</option>
            {resources.map((resource) => (
              <option key={resource} value={resource}>
                {resource}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4">
          {filteredPermissions.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('common.noData') || 'No permissions found.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPermissions.map((perm) => (
                <li key={perm.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{perm.key}</p>
                        {!perm.is_active && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {t('common.inactive')}
                          </span>
                        )}
                      </div>
                      {perm.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{perm.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {perm.resource}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          {perm.action}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
