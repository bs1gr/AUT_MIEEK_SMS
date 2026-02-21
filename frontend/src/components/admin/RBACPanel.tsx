import React, { useState } from 'react';
import { useLanguage } from '@/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApiMutation, useApiQuery } from '@/hooks/useApiWithRecovery';
import apiClient, { isAuthOrPermissionError, rbacAPI, type Role, type RBACSummary } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const RBACPanel: React.FC = () => {
  const { t } = useLanguage();
  const { i18n } = useTranslation('rbac');
  const { user, updateUser } = useAuth();

  // Permission translation map - hardcoded for reliability
  const isGreek = i18n.language === 'el';
  const permissionTranslations = {
    analytics: isGreek ? 'Αναλυτικά' : 'Analytics',
    'analytics:export': isGreek ? 'Εξαγωγή Αναλυτικών' : 'Export Analytics',
    'analytics:view': isGreek ? 'Προβολή Αναλυτικών' : 'View Analytics',
    attendance: isGreek ? 'Παρουσίες' : 'Attendance',
    'attendance:create': isGreek ? 'Δημιουργία Παρουσιών' : 'Create Attendance',
    'attendance:delete': isGreek ? 'Διαγραφή Παρουσιών' : 'Delete Attendance',
    'attendance:edit': isGreek ? 'Επεξεργασία Παρουσιών' : 'Edit Attendance',
    'attendance:export': isGreek ? 'Εξαγωγή Παρουσιών' : 'Export Attendance',
    'attendance:view': isGreek ? 'Προβολή Παρουσιών' : 'View Attendance',
    'attendance:view_all': isGreek ? 'Προβολή Όλων Παρουσιών' : 'View All Attendance',
    audit: isGreek ? 'Έλεγχος' : 'Audit',
    'audit:export': isGreek ? 'Εξαγωγή Ελέγχου' : 'Export Audit',
    'audit:view': isGreek ? 'Προβολή Ελέγχου' : 'View Audit',
    backups: isGreek ? 'Αντίγραφα Ασφαλείας' : 'Backups',
    'backups:create': isGreek ? 'Δημιουργία Αντιγράφων' : 'Create Backups',
    'backups:restore': isGreek ? 'Επαναφορά Αντιγράφων' : 'Restore Backups',
    'backups:view': isGreek ? 'Προβολή Αντιγράφων' : 'View Backups',
    courses: isGreek ? 'Μαθήματα' : 'Courses',
    'courses:create': isGreek ? 'Δημιουργία Μαθημάτων' : 'Create Courses',
    'courses:delete': isGreek ? 'Διαγραφή Μαθημάτων' : 'Delete Courses',
    'courses:edit': isGreek ? 'Επεξεργασία Μαθημάτων' : 'Edit Courses',
    'courses:view': isGreek ? 'Προβολή Μαθημάτων' : 'View Courses',
    grades: isGreek ? 'Βαθμοί' : 'Grades',
    'grades:create': isGreek ? 'Δημιουργία Βαθμών' : 'Create Grades',
    'grades:delete': isGreek ? 'Διαγραφή Βαθμών' : 'Delete Grades',
    'grades:edit': isGreek ? 'Επεξεργασία Βαθμών' : 'Edit Grades',
    'grades:export': isGreek ? 'Εξαγωγή Βαθμών' : 'Export Grades',
    'grades:view': isGreek ? 'Προβολή Βαθμών' : 'View Grades',
    import: isGreek ? 'Εισαγωγή' : 'Import',
    'import:execute': isGreek ? 'Εκτέλεση Εισαγωγής' : 'Execute Import',
    'import:view': isGreek ? 'Προβολή Εισαγωγής' : 'View Import',
    logs: isGreek ? 'Αρχεία Καταγραφής' : 'Logs',
    'logs:export': isGreek ? 'Εξαγωγή Αρχείων' : 'Export Logs',
    'logs:view': isGreek ? 'Προβολή Αρχείων' : 'View Logs',
    monitoring: isGreek ? 'Παρακολούθηση' : 'Monitoring',
    'monitoring:control': isGreek ? 'Έλεγχος Παρακολούθησης' : 'Control Monitoring',
    'monitoring:view': isGreek ? 'Προβολή Παρακολούθησης' : 'View Monitoring',
    rbac: isGreek ? 'RBAC' : 'RBAC',
    'rbac:assign': isGreek ? 'Ανάθεση RBAC' : 'Assign RBAC',
    'rbac:view': isGreek ? 'Προβολή RBAC' : 'View RBAC',
    reports: isGreek ? 'Αναφορές' : 'Reports',
    'reports:create': isGreek ? 'Δημιουργία Αναφορών' : 'Create Reports',
    'reports:export': isGreek ? 'Εξαγωγή Αναφορών' : 'Export Reports',
    'reports:view': isGreek ? 'Προβολή Αναφορών' : 'View Reports',
    settings: isGreek ? 'Ρυθμίσεις' : 'Settings',
    'settings:edit': isGreek ? 'Επεξεργασία Ρυθμίσεων' : 'Edit Settings',
    'settings:view': isGreek ? 'Προβολή Ρυθμίσεων' : 'View Settings',
    students: isGreek ? 'Σπουδαστές' : 'Students',
    'students:create': isGreek ? 'Δημιουργία Σπουδαστών' : 'Create Students',
    'students:delete': isGreek ? 'Διαγραφή Σπουδαστών' : 'Delete Students',
    'students:edit': isGreek ? 'Επεξεργασία Σπουδαστών' : 'Edit Students',
    'students:export': isGreek ? 'Εξαγωγή Σπουδαστών' : 'Export Students',
    'students:view': isGreek ? 'Προβολή Σπουδαστών' : 'View Students',
    system: isGreek ? 'Σύστημα' : 'System',
    'system:control': isGreek ? 'Έλεγχος Συστήματος' : 'Control System',
    'system:view': isGreek ? 'Προβολή Συστήματος' : 'View System',
    users: isGreek ? 'Χρήστες' : 'Users',
    'users:create': isGreek ? 'Δημιουργία Χρηστών' : 'Create Users',
    'users:delete': isGreek ? 'Διαγραφή Χρηστών' : 'Delete Users',
    'users:edit': isGreek ? 'Επεξεργασία Χρηστών' : 'Edit Users',
    'users:view': isGreek ? 'Προβολή Χρηστών' : 'View Users',
  };

  const translatePermission = (permName: string): string => {
    return permissionTranslations[permName as keyof typeof permissionTranslations] || permName;
  };

  const getTranslationValue = (key: string): string => {
    const value = t(key) as string;
    return value && value !== key ? value : '';
  };

  const translateRoleName = (name?: string): string => {
    if (!name) return '';
    return getTranslationValue(`controlPanel.roles.${name}`) || name;
  };

  const translateRoleDescription = (role: Role): string => {
    return getTranslationValue(`controlPanel.roleDescriptions.${role.name}`) || role.description || '';
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [userId, setUserId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);  // Store role name
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);  // Store permission key
  const {
    data: rbacData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useApiQuery<RBACSummary>(
    ['rbac-summary'],
    () => rbacAPI.getSummary(),
    { enabled: activeTab === 'overview' || activeTab === 'users' }
  );

  // Derive users from RBAC summary (user_roles contains all user IDs)
  const usersData = rbacData?.user_roles
    ? Array.from(new Set(rbacData.user_roles.map((ur) => ur.user_id))).map((id) => ({
        id,
        email: `user_${id}@system`,
        full_name: `User ${id}`,
        role: 'user',
      }))
    : [];

  const refreshCurrentUser = async (targetUserId: number | null) => {
    if (!user || !targetUserId || user.id !== targetUserId) return;
    try {
      const meResp = await apiClient.get('/auth/me', { withCredentials: true });
      if (meResp?.data) {
        updateUser(meResp.data);
      }
    } catch (err) {
      console.warn('Failed to refresh current user after role update', err);
    }
  };

  const selectedUserRoles = userId && rbacData
    ? rbacData.user_roles
        .filter((ur) => ur.user_id === userId)
        .map((ur) => rbacData.roles.find((r) => r.id === ur.role_id))
        .filter(Boolean)
    : [];

  // Ensure defaults mutation
  const ensureDefaultsMutation = useApiMutation<{ status: string }, Error, Record<string, never>>(
    () => rbacAPI.ensureDefaults(),
    {
      onSuccess: () => {
        refetchSummary();
      },
    }
  );

  // Assign role mutation
  const assignRoleMutation = useApiMutation<{ status: string }, Error, { user_id: number; role_name: string }>(
    async (data) => rbacAPI.assignRole(data.user_id, data.role_name),
    {
      onSuccess: async () => {
        setUserId(null);
        setRoleName('');
        refetchSummary();
        await refreshCurrentUser(userId);
      },
    }
  );

  const revokeRoleMutation = useApiMutation<{ status: string }, Error, { user_id: number; role_name: string }>(
    async (data) => rbacAPI.revokeRole(data.user_id, data.role_name),
    {
      onSuccess: async () => {
        refetchSummary();
        await refreshCurrentUser(userId);
      },
    }
  );

  // Grant permission mutation
  const grantPermissionMutation = useApiMutation<{ status: string }, Error, { role_name: string; permission_name: string }>(
    async (data) => rbacAPI.grantPermission(data.role_name, data.permission_name),
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

  const handleRevokeRole = async (targetRole: string) => {
    if (!userId || !targetRole) return;
    try {
      await revokeRoleMutation.mutate({ user_id: userId, role_name: targetRole });
    } catch (error) {
      console.error('Error in handleRevokeRole:', error);
      alert(t('rbac.roleRevokedError'));
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedRole || !selectedPermission) return;
    await grantPermissionMutation.mutate({ role_name: selectedRole, permission_name: selectedPermission });
  };

  const tabs = [
    { id: 'overview', label: t('rbac.overview') || 'Overview' },
    { id: 'users', label: t('rbac.users') || 'Users' },
    { id: 'assign-role', label: t('rbac.assignRoleTab') || t('rbac.assignRole') },
    { id: 'grant-permission', label: t('rbac.grantPermissionTab') || t('rbac.grantPermission') },
    { id: 'settings', label: t('rbac.settings') || 'Settings' },
  ];

  if (isSummaryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isSummaryError && isAuthOrPermissionError(summaryError)) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t('accessDeniedTitle')}
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t('rbacAccessDeniedMessage') || t('accessDeniedMessage')}
            </p>
          </div>
        </div>
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
                    <CardTitle className="text-sm">
                      {t('rbac.rolesLabel', { count: rbacData.roles.length }) || `Roles (${rbacData.roles.length})`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rbacData.roles.map((role) => (
                        <li key={role.id} className="text-sm p-2 bg-blue-50 rounded">
                          <strong>{translateRoleName(role.name)}</strong>
                          {translateRoleDescription(role) && (
                            <p className="text-xs text-gray-600">{translateRoleDescription(role)}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {t('rbac.permissionsLabel', { count: rbacData.permissions.length }) || `Permissions (${rbacData.permissions.length})`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {rbacData.permissions.map((perm) => (
                        <li key={perm.id} className="text-sm p-2 bg-green-50 rounded">
                          <strong>{translatePermission(perm.name)}</strong>
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
                          <span>{translateRoleName(role?.name)}</span>
                          <span className="text-gray-600">→</span>
                          <span>{perm?.name ? translatePermission(perm.name) : ''}</span>
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
                <CardTitle className="text-sm">{t('rbac.userRoleMappings', { count: usersData.length })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {usersData.map((user) => {
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
                                  {translateRoleName(role?.name)}
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
                <p className="text-sm text-gray-600">
                  {t('rbac.assignRoleHelp')}
                </p>
                <div>
                  <label className="text-sm font-medium">{t('rbac.userId')}</label>
                  <Input
                    type="number"
                    value={userId || ''}
                    onChange={(e) => setUserId(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder={t('rbac.enterUserId')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('rbac.assignedRoles')}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUserRoles.length > 0 ? (
                      selectedUserRoles.map((role) => (
                        <div key={role!.id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs">
                          <span>{translateRoleName(role?.name)}</span>
                          <button
                            type="button"
                            onClick={() => role?.name && handleRevokeRole(role.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            {t('rbac.revokeRole')}
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">{t('rbac.noRolesForUser')}</span>
                    )}
                  </div>
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
                    {rbacData?.roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {t(`controlPanel.roles.${role.name}`) || role.name}
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
                {revokeRoleMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {t('rbac.roleRevokedSuccess')}
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
                    onChange={(e) => setSelectedRole(e.target.value || null)}
                    className="w-full p-2 border rounded"
                    aria-label="Select role to grant permission"
                  >
                    <option value="">{t('rbac.selectRole')}</option>
                    {rbacData?.roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {t(`controlPanel.roles.${role.name}`) || role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="permission-select" className="text-sm font-medium">{t('rbac.permission')}</label>
                  <select
                    id="permission-select"
                    value={selectedPermission || ''}
                    onChange={(e) => setSelectedPermission(e.target.value || null)}
                    className="w-full p-2 border rounded"
                    aria-label="Select permission to grant"
                  >
                    <option value="">{t('rbac.selectPermission')}</option>
                    {rbacData?.permissions.map((perm) => (
                      <option key={perm.id} value={perm.key || perm.name}>
                        {translatePermission(perm.key || perm.name)}
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
