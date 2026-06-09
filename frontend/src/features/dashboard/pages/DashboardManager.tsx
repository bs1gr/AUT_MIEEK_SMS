import React, { useState } from 'react';
import { useLanguage } from '@/LanguageContext';
import { useDashboards, Dashboard } from '../hooks/useDashboards';
import { Plus, Trash2, Star, Edit } from 'lucide-react';
import CreateEditDashboardDialog from '../components/CreateEditDashboardDialog';

/**
 * Dashboard Manager Page
 * Allows users to create, edit, delete, and manage their custom dashboards
 */
const DashboardManager: React.FC = () => {
  const { t } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    dashboards,
    isLoadingDashboards,
    createDashboard,
    isCreating,
    createError,
    updateDashboard,
    isUpdating,
    updateError,
    deleteDashboard,
    isDeleting,
    setDefaultDashboard,
    isSettingDefault,
  } = useDashboards();

  const handleCreateClick = () => {
    setEditingDashboard(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setIsCreateDialogOpen(true);
  };

  const handleCreate = (data: {
    name: string;
    description?: string;
    configuration: { charts: string[] };
  }) => {
    createDashboard(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleUpdate = (data: {
    name?: string;
    description?: string;
    configuration?: { charts: string[] };
  }) => {
    if (!editingDashboard) return;
    updateDashboard(
      { id: editingDashboard.id, data },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setEditingDashboard(null);
        },
      }
    );
  };

  const handleDeleteConfirm = (id: number) => {
    deleteDashboard(id, {
      onSuccess: () => {
        setDeletingId(null);
      },
    });
  };

  const handleSetDefault = (id: number) => {
    setDefaultDashboard(id);
  };

  if (isLoadingDashboards) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {t('dashboard.managerTitle') || 'Dashboard Manager'}
          </h1>
          <p className="mt-2 text-slate-600">
            {t('dashboard.managerDescription') || 'Create and manage your custom analytics dashboards'}
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          {t('dashboard.newDashboard') || 'New Dashboard'}
        </button>
      </div>

      {/* Dashboards List */}
      {dashboards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <p className="text-slate-600">
            {t('dashboard.noDashboards') || 'No dashboards yet. Create one to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {dashboards.map((dashboard: Dashboard) => (
            <div
              key={dashboard.id}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{dashboard.name}</h3>
                    {dashboard.is_default && (
                      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        {t('dashboard.default') || 'Default'}
                      </span>
                    )}
                  </div>
                  {dashboard.description && (
                    <p className="mt-2 text-sm text-slate-600">{dashboard.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      {t('dashboard.chartsCount') || 'Charts'}:{' '}
                      {dashboard.configuration?.charts?.length || 0}
                    </span>
                    <span>
                      {t('dashboard.created') || 'Created'}: {new Date(dashboard.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ml-4 flex gap-2">
                  {!dashboard.is_default && (
                    <button
                      onClick={() => handleSetDefault(dashboard.id)}
                      disabled={isSettingDefault}
                      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                      title={t('dashboard.setAsDefault') || 'Set as default'}
                    >
                      <Star size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditClick(dashboard)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    title={t('dashboard.edit') || 'Edit'}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setDeletingId(dashboard.id)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-100 hover:text-red-600"
                    title={t('dashboard.delete') || 'Delete'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deletingId === dashboard.id && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-red-50 p-4">
                  <p className="flex-1 text-sm text-red-900">
                    {t('dashboard.deleteConfirm') || 'Are you sure you want to delete this dashboard?'}
                  </p>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="rounded px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(dashboard.id)}
                    disabled={isDeleting}
                    className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {t('common.delete') || 'Delete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {isCreateDialogOpen && (
        <CreateEditDashboardDialog
          dashboard={editingDashboard}
          onSave={editingDashboard ? handleUpdate : handleCreate}
          onClose={() => {
            setIsCreateDialogOpen(false);
            setEditingDashboard(null);
          }}
          isLoading={isCreating || isUpdating}
          externalError={editingDashboard ? updateError : createError}
        />
      )}
    </div>
  );
};

export default DashboardManager;
