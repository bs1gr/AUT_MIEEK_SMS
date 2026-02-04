import { useCallback, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  UserPlus,
  Shield as ShieldIcon,
  Save,
  XCircle,
  Edit3,
  Trash2,
  LockKeyhole,
  Users,
  AlertTriangle,
} from 'lucide-react';

import { useLanguage } from '@/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminUsersAPI, rbacAPI } from '@/api/api';
import type { CreateUserPayload, UpdateUserPayload, UserAccount, UserRole } from '@/types';
import type { ToastState } from '@/features/operations/components/DevToolsPanel';

interface AdminUsersPanelProps {
  onToast: (toast: ToastState) => void;
}

const roleOptions: Array<{ value: UserRole; key: string }> = [
  { value: 'admin', key: 'controlPanel.roles.admin' },
  { value: 'teacher', key: 'controlPanel.roles.teacher' },
  { value: 'student', key: 'controlPanel.roles.student' },
];

const initialCreateForm: CreateUserPayload = {
  email: '',
  password: '',
  full_name: '',
  role: 'teacher',
};

const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const { user, accessToken, updateUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserPayload>(initialCreateForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<UpdateUserPayload>({});
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  // Self password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.role === b.role) {
        return a.email.localeCompare(b.email);
      }
      return a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : a.role.localeCompare(b.role);
    });
  }, [users]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      // Fetch both users and RBAC summary to get actual roles
      const [usersData, rbacData] = await Promise.all([
        adminUsersAPI.list(),
        rbacAPI.getSummary(),
      ]);

      // Merge RBAC roles into user objects
      const usersWithRoles = usersData.map(user => {
        const userRoleMapping = rbacData?.user_roles?.find(ur => ur.user_id === user.id);
        if (userRoleMapping) {
          const actualRole = rbacData?.roles?.find(r => r.id === userRoleMapping.role_id);
          if (actualRole) {
            return { ...user, role: actualRole.name as UserRole };
          }
        }
        return user;
      });

      setUsers(usersWithRoles);
      setAccessDenied(false);
    } catch (error: unknown) {
      console.error('Failed to load users', error);
      // Check if it's a 401 Unauthorized error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          setAccessDenied(true);
          return; // Don't show toast for auth errors
        }
      }
      onToast({ message: t('userLoadFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [onToast, t]);

  useEffect(() => {
    // Only load users if authenticated and admin, AND we have a valid token
    if (!user || !accessToken) {
      setAccessDenied(true);
      return;
    }
    if (user.role !== 'admin') {
      setAccessDenied(true);
      return;
    }
    void loadUsers();
  }, [loadUsers, user, accessToken]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!createForm.email || !createForm.password) {
      onToast({ message: t('createUserValidation'), type: 'error' });
      return;
    }
    if (!user || user.role !== 'admin') {
      onToast({ message: t('adminAccessRequired'), type: 'error' });
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        ...createForm,
        full_name: createForm.full_name?.trim() || undefined,
      };
      const newUser = await adminUsersAPI.create(payload);
      setUsers((prev: UserAccount[]) => [...prev, newUser]);
      setCreateForm(initialCreateForm);
      onToast({ message: t('createUserSuccess'), type: 'success' });
    } catch (error: unknown) {
      console.error('Create user failed', error);
      onToast({ message: t('createUserFailed'), type: 'error' });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const passwordStrength = useMemo(() => {
    const pwd = newPassword;
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 12) score += 2; else if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 6);
  }, [newPassword]);

  const handleChangeOwnPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onToast({ message: t('changeOwnPasswordValidation'), type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast({ message: t('changeOwnPasswordMismatch'), type: 'error' });
      return;
    }
    if (passwordStrength < 4) {
      onToast({ message: t('changeOwnPasswordWeak'), type: 'error' });
      return;
    }
    setChangingOwnPassword(true);
    try {
      const response = await adminUsersAPI.changeOwnPassword(currentPassword, newPassword);

      // If backend returned a new access token, the axios interceptor will handle it
      // because we set it in the attachAuthHeader function which is called on every request
      if (response && 'access_token' in response && response.access_token) {
        console.warn('[Password Change] New access token received from backend');
      }

      // Refresh user profile to update password_change_required flag
      try {
        const updatedUser = await adminUsersAPI.getCurrentUser();
        if (updatedUser) {
          console.warn('[Password Change] User profile refreshed, password_change_required:', updatedUser.password_change_required);
          // Update the user in AuthContext (type is UserAccount)
          updateUser(updatedUser);
        }
      } catch (err) {
        console.warn('[Password Change] Failed to refresh user profile:', err);
      }

      onToast({ message: t('changeOwnPasswordSuccess'), type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Explicitly navigate to Power panel with a success indicator so the user sees confirmation
      try {
        navigate('/power?showControl=1&passwordChanged=1');
      } catch (err) {
        // If navigation fails for any reason, ignore - the toast is already shown
        console.warn('Navigation after password change failed', err);
      }
    } catch (err: unknown) {
      console.error('Failed to change own password', err);
      let errorMessage = t('changeOwnPasswordFailed');

      // Extract detailed error message
      if (err && typeof err === 'object' && err !== null) {
        const axiosError = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }

      onToast({ message: errorMessage, type: 'error' });
    } finally {
      setChangingOwnPassword(false);
    }
  };

  const startEditing = (user: UserAccount) => {
    setEditingId(user.id);
    setEditDraft({
      full_name: user.full_name ?? '',
      role: user.role,
      is_active: user.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setUpdatingId(editingId);
    try {
      const payload: UpdateUserPayload = {
        full_name: (editDraft.full_name ?? '').trim() || null,
        role: editDraft.role,
        is_active: editDraft.is_active,
      };
      const updated = await adminUsersAPI.update(editingId, payload);
      setUsers((prev: UserAccount[]) => prev.map((u: UserAccount) => (u.id === updated.id ? updated : u)));
      onToast({ message: t('updateUserSuccess'), type: 'success' });
      cancelEditing();
    } catch (error: unknown) {
      console.error('Update user failed', error);
      onToast({ message: t('updateUserFailed'), type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (user: UserAccount) => {
    if (!window.confirm(t('confirmDeleteUser'))) {
      return;
    }
    setDeletingId(user.id);
    try {
      await adminUsersAPI.delete(user.id);
      setUsers((prev: UserAccount[]) => prev.filter((item: UserAccount) => item.id !== user.id));
      onToast({ message: t('deleteUserSuccess'), type: 'success' });
    } catch (error: unknown) {
      console.error('Delete user failed', error);
      onToast({ message: t('deleteUserFailed'), type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetId || !resetPassword) {
      onToast({ message: t('resetPasswordValidation'), type: 'error' });
      return;
    }
    setResetSubmitting(true);
    try {
      await adminUsersAPI.resetPassword(resetId, resetPassword);
      onToast({ message: t('resetPasswordSuccess'), type: 'success' });
      setResetPassword('');
      setResetId(null);
    } catch (error: unknown) {
      console.error('Reset password failed', error);
      onToast({ message: t('resetPasswordFailed'), type: 'error' });
    } finally {
      setResetSubmitting(false);
    }
  };

  const currentResetUser = resetId ? sortedUsers.find((user) => user.id === resetId) : null;

  const statusBadge = (isActive: boolean) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {isActive ? t('active') : t('inactive')}
    </span>
  );

  // Show access denied message if not authorized
  if (accessDenied) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t('accessDeniedTitle')}
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t('accessDeniedMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Self password change card */}
      <section className="rounded-2xl border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 shadow-sm">
        <header className="flex items-center gap-3 border-b border-teal-100 dark:border-teal-800 px-4 py-3">
          <LockKeyhole className="text-teal-600 dark:text-teal-300" size={18} />
          <div>
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-100">{t('changeOwnPasswordTitle')}</p>
            <p className="text-xs text-teal-600 dark:text-teal-300">{t('changeOwnPasswordSubtitle')}</p>
          </div>
        </header>
        <form onSubmit={handleChangeOwnPassword} className="grid gap-4 p-4 md:grid-cols-3">
          <label className="text-xs font-medium text-teal-900 dark:text-teal-100">
            {t('currentPassword')}
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-300 bg-white px-2 py-1.5 text-sm dark:bg-teal-950 dark:border-teal-700"
              required
            />
          </label>
          <label className="text-xs font-medium text-teal-900 dark:text-teal-100">
            {t('newPassword')}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-300 bg-white px-2 py-1.5 text-sm dark:bg-teal-950 dark:border-teal-700"
              required
            />
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded bg-teal-100 dark:bg-teal-800">
                <div
                  className={`h-full transition-all ${
                    passwordStrength <= 2 ? 'bg-rose-500 w-1/6' :
                    passwordStrength === 3 ? 'bg-amber-500 w-2/5' :
                    passwordStrength === 4 ? 'bg-yellow-500 w-3/5' :
                    passwordStrength === 5 ? 'bg-lime-500 w-4/5' : 'bg-emerald-500 w-full'
                  }`}
                />
              </div>
              <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
                {t('passwordStrengthLabel')}: {passwordStrength}/6
              </span>
            </div>
          </label>
          <label className="text-xs font-medium text-teal-900 dark:text-teal-100">
            {t('confirmPassword')}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-300 bg-white px-2 py-1.5 text-sm dark:bg-teal-950 dark:border-teal-700"
              required
            />
          </label>
          <div className="md:col-span-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={changingOwnPassword || !currentPassword || !newPassword || passwordStrength < 4 || newPassword !== confirmPassword}
              className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} /> {t('changeOwnPasswordButton')}
            </button>
            <button
              type="button"
              onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              className="inline-flex items-center gap-1 rounded-md border border-teal-300 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:text-teal-200 dark:border-teal-600"
            >
              <XCircle size={14} /> {t('cancel')}
            </button>
          </div>

          {/* Validation feedback */}
          <div className="md:col-span-3 text-xs text-teal-700 dark:text-teal-300 space-y-1">
            {!currentPassword && <p>{t('bullet')} {t('fieldIsRequired', { field: t('currentPassword') })}</p>}
            {!newPassword && <p>{t('bullet')} {t('fieldIsRequired', { field: t('newPassword') })}</p>}
            {newPassword && passwordStrength < 4 && <p>{t('bullet')} {t('changeOwnPasswordHint')}</p>}
            {newPassword && confirmPassword && newPassword !== confirmPassword && <p>{t('bullet')} {t('changeOwnPasswordMismatch')}</p>}
            <p className="text-[11px] text-teal-600 dark:text-teal-400">{t('changeOwnPasswordHint')}</p>
          </div>
        </form>
      </section>
      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <ShieldIcon size={18} />
            <div>
              <p className="text-sm font-semibold">{t('administratorUsersHeading')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('administratorUsersDescription')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? t('loading') : t('refreshUsers')}
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('userName')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('userEmail')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('userRole')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('userStatus')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('userActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {sortedUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('noUsersFound')}
                  </td>
                </tr>
              )}
              {sortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:bg-gray-800"
                        value={editDraft.full_name ?? ''}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setEditDraft((draft: UpdateUserPayload) => ({ ...draft, full_name: event.target.value }))}
                        placeholder={t('fullNamePlaceholder')}
                      />
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{user.full_name || t('nameNotProvided')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('idLabel', { id: user.id })}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm text-gray-800 dark:text-gray-100">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <select
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:bg-gray-800"
                        value={editDraft.role ?? 'teacher'}
                        aria-label={t('userRole')}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          setEditDraft((draft: UpdateUserPayload) => ({ ...draft, role: event.target.value as UserRole }))
                        }
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.key)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 capitalize">
                        {t(roleOptions.find((opt) => opt.value === user.role)?.key || user.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={!!editDraft.is_active}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setEditDraft((draft: UpdateUserPayload) => ({ ...draft, is_active: event.target.checked }))
                          }
                        />
                        {t('isActiveLabel')}
                      </label>
                    ) : (
                      statusBadge(user.is_active)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === user.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={updatingId === user.id}
                        >
                          <Save size={14} /> {t('save')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <XCircle size={14} /> {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(user)}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit3 size={14} /> {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetId((prev: number | null) => (prev === user.id ? null : user.id));
                            setResetPassword('');
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50"
                        >
                          <LockKeyhole size={14} /> {t('resetPassword')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          disabled={deletingId === user.id}
                        >
                          <Trash2 size={14} /> {t('delete')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentResetUser && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <LockKeyhole size={18} className="text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {t('controlPanel.resetPasswordFor', { name: currentResetUser.full_name || currentResetUser.email })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('resetPasswordHint')}</p>
              </div>
              <input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder={t('newPasswordPlaceholder') as string}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:bg-gray-800"
              />
              <button
                type="button"
                onClick={handleResetPassword}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                disabled={resetSubmitting}
              >
                <Save size={14} /> {t('applyReset')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetId(null);
                  setResetPassword('');
                }}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                <XCircle size={14} /> {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 shadow-inner dark:border-indigo-700 dark:bg-indigo-900/30">
        <header className="mb-4 flex items-center gap-3 text-indigo-900 dark:text-indigo-100">
          <UserPlus />
          <div>
            <p className="text-sm font-semibold">{t('createUserTitle')}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-200">{t('createUserSubtitle')}</p>
          </div>
        </header>

        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-700 dark:text-gray-200">
            {t('userEmail')}
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-white"
              value={createForm.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setCreateForm((prev: CreateUserPayload) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            {t('password')}
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={createForm.password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setCreateForm((prev: CreateUserPayload) => ({ ...prev, password: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            {t('userName')}
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={createForm.full_name ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setCreateForm((prev: CreateUserPayload) => ({ ...prev, full_name: event.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            {t('userRole')}
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((prev: CreateUserPayload) => ({ ...prev, role: event.target.value as UserRole }))
              }
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              disabled={createSubmitting}
            >
              <Users size={16} />
              {createSubmitting ? t('loading') : t('createUserButton')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AdminUsersPanel;
