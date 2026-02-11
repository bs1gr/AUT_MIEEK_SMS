/**
 * ReportTemplateList Component - Browse and use pre-built report templates
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Copy, Trash2, Search, Heart } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useReportTemplates, useDeleteTemplate, useUpdateTemplate, useImportDefaultTemplates } from '@/hooks/useCustomReports';
import { reportTemplatesAPI } from '@/api/customReportsAPI';
import type { ReportTemplate } from '@/api/customReportsAPI';
import { getLocalizedTemplateText } from '../utils/templateLocalization';

interface ReportTemplateListProps {
  onUseTemplate?: (template: ReportTemplate) => void;
  onEditTemplate?: (templateId: number) => void;
  initialEntityType?: string;
  initialFormat?: string;
  initialQuery?: string;
  initialTab?: string;
}

const VALID_TABS = ['standard', 'csv', 'analytics', 'my', 'shared'];


export const ReportTemplateList: React.FC<ReportTemplateListProps> = ({
  onUseTemplate,
  onEditTemplate,
  initialEntityType,
  initialFormat,
  initialQuery,
  initialTab,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const { data: templates, isLoading, error } = useReportTemplates({
    is_active: showArchivedOnly ? false : true,
  });
  const deleteMutation = useDeleteTemplate();
  const updateMutation = useUpdateTemplate();
  const importDefaultsMutation = useImportDefaultTemplates();
  const [restoringArchived, setRestoringArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState(() =>
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'standard'
  );
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(initialEntityType || null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(initialFormat || null);

  React.useEffect(() => {
    if (initialTab && VALID_TABS.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto-switch to appropriate tab when format filter is selected
  React.useEffect(() => {
    if (selectedFormat?.toLowerCase() === 'csv') {
      setActiveTab('csv');
    }
  }, [selectedFormat]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">{t('errorLoading', { ns: 'customReports' })}</p>
      </div>
    );
  }

  const standardTemplates = templates?.filter((t: ReportTemplate) => t.is_system && t.category !== 'export' && t.category !== 'analytics') || [];
  const csvTemplates = templates?.filter((t: ReportTemplate) => t.is_system && t.category === 'export') || [];
  const analyticsTemplates = templates?.filter((t: ReportTemplate) => t.is_system && t.category === 'analytics') || [];
  const sharedTemplates = templates?.filter((t: ReportTemplate) => !t.is_system && t.category === 'shared') || [];
  const userTemplates = templates?.filter((t: ReportTemplate) => !t.is_system && t.category !== 'shared') || [];
  const hasAnyTemplates = (templates?.length ?? 0) > 0;
  const importDefaultsLabel = !hasAnyTemplates ? t('importDefaults', { ns: 'customReports' }) : undefined;
  const handleImportDefaults = !hasAnyTemplates
    ? () => {
        if (!importDefaultsMutation.isPending) {
          importDefaultsMutation.mutate();
        }
      }
    : undefined;
  const handleRestoreDefaults = () => {
    if (importDefaultsMutation.isPending) return;
    const confirmed = window.confirm(t('restoreDefaultsConfirm', { ns: 'customReports' }));
    if (!confirmed) return;
    importDefaultsMutation.mutate();
  };

  const handleRestoreArchivedSystemTemplates = async () => {
    if (restoringArchived) return;
    const confirmed = window.confirm(t('restoreArchivedConfirm', { ns: 'customReports' }));
    if (!confirmed) return;

    setRestoringArchived(true);
    try {
      const archivedTemplates = await reportTemplatesAPI.getAll({ is_active: false });
      const archivedSystemTemplates = archivedTemplates.filter((template) => template.is_system);
      await Promise.all(
        archivedSystemTemplates.map((template) =>
          reportTemplatesAPI.update(template.id, { is_active: true })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['customReports', 'templates'] });
      const toast = document.createElement('div');
      toast.textContent = `✅ ${t('restoreArchivedSuccess', { ns: 'customReports', count: archivedSystemTemplates.length })}`;
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    } catch (error) {
      console.error('Failed to restore archived system templates:', error);
      const toast = document.createElement('div');
      toast.textContent = `❌ ${t('restoreArchivedError', { ns: 'customReports' })}`;
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    } finally {
      setRestoringArchived(false);
    }
  };

  const filterTemplates = (items: ReportTemplate[]) => {
    return items.filter((item) => {
      const localized = getLocalizedTemplateText(item, t);
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        localized.name.toLowerCase().includes(normalizedQuery) ||
        localized.description.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.description || '').toLowerCase().includes(normalizedQuery);
      const matchesEntity = !selectedEntityType || item.report_type === selectedEntityType;
      const templateFormat = item.default_export_format?.toLowerCase();
      const matchesFormat = !selectedFormat || templateFormat === selectedFormat.toLowerCase();
      return matchesSearch && matchesEntity && matchesFormat;
    });
  };

  const renderTemplateGrid = (
    items: ReportTemplate[],
    emptyMessage: string,
    emptyActionLabel?: string,
    onEmptyAction?: () => void
  ) => {
    const filtered = filterTemplates(items);

    if (filtered.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-gray-600">{emptyMessage}</p>
          {emptyActionLabel && onEmptyAction && (
            <button
              type="button"
              onClick={onEmptyAction}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUseTemplate={() => onUseTemplate?.(template)}
            onEdit={() => onEditTemplate?.(template.id)}
            onShare={() => {
              updateMutation.mutate(
                {
                  id: template.id,
                  updates: { category: 'shared' },
                },
                {
                  onSuccess: () => {
                    const toast = document.createElement('div');
                    toast.textContent = `✅ ${t('templateShared', { ns: 'customReports' })}`;
                    toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 4000);
                  },
                }
              );
            }}
            onDelete={() => {
              if (window.confirm(t('confirmDelete', { ns: 'customReports' }))) {
                deleteMutation.mutate(template.id);
              }
            }}
            onArchiveToggle={() => {
              updateMutation.mutate({
                id: template.id,
                updates: { is_active: template.is_active === false },
              });
            }}
            isUserTemplate={activeTab === 'my'}
          />
        ))}
      </div>
    );
  };

  const entityTypes = Array.from(
    new Set((templates || []).map((t: ReportTemplate) => t.report_type))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('searchTemplates', { ns: 'customReports' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedEntityType || ''}
            onChange={(e) => setSelectedEntityType(e.target.value || null)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('allEntityTypes', { ns: 'customReports' })}</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`customReports:entity_${type}`)}
              </option>
            ))}
          </select>

          <select
            value={selectedFormat || ''}
            onChange={(e) => setSelectedFormat(e.target.value || null)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('allFormats', { ns: 'customReports' })}</option>
            <option value="pdf">{t('format_pdf', { ns: 'customReports' })}</option>
            <option value="excel">{t('format_excel', { ns: 'customReports' })}</option>
            <option value="csv">{t('format_csv', { ns: 'customReports' })}</option>
          </select>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={showArchivedOnly}
              onChange={(event) => setShowArchivedOnly(event.target.checked)}
            />
            {t('showArchivedOnly', { ns: 'customReports' })}
          </label>

          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t('restoreDefaults', { ns: 'customReports' })}
          </button>

          <button
            type="button"
            onClick={handleRestoreArchivedSystemTemplates}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {restoringArchived
              ? t('restoringArchived', { ns: 'customReports' })
              : t('restoreArchived', { ns: 'customReports' })}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border rounded-lg p-1 flex gap-1 w-full justify-start overflow-x-auto">
          <TabsTrigger
            value="standard"
            className="flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-blue-700"
          >
            {t('standardTemplates', { ns: 'customReports' })}
          </TabsTrigger>
          <TabsTrigger
            value="csv"
            className="flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
          >
            {t('csvExportTemplates', { ns: 'customReports' })}
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-orange-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-orange-700"
          >
            {t('analyticsTemplates', { ns: 'customReports' })}
          </TabsTrigger>
          <TabsTrigger
            value="my"
            className="flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-indigo-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-indigo-700"
          >
            {t('myTemplates', { ns: 'customReports' })}
          </TabsTrigger>
          <TabsTrigger
            value="shared"
            className="flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-purple-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-purple-700"
          >
            {t('sharedTemplates', { ns: 'customReports' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4">
          {renderTemplateGrid(
            standardTemplates,
            t('noStandardTemplates', { ns: 'customReports' }),
            importDefaultsLabel,
            handleImportDefaults
          )}
        </TabsContent>

        <TabsContent value="csv" className="space-y-4">
          {renderTemplateGrid(
            csvTemplates,
            t('noCsvTemplates', { ns: 'customReports' }),
            importDefaultsLabel,
            handleImportDefaults
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {renderTemplateGrid(
            analyticsTemplates,
            t('noAnalyticsTemplates', { ns: 'customReports' }),
            importDefaultsLabel,
            handleImportDefaults
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          {renderTemplateGrid(
            userTemplates,
            t('noMyTemplates', { ns: 'customReports' }),
            t('addTemplateFromReports', { ns: 'customReports' }),
            () => {
              window.location.href = '/operations/reports';
            }
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          {renderTemplateGrid(
            sharedTemplates,
            t('noSharedTemplates', { ns: 'customReports' }),
            t('addTemplateFromReports', { ns: 'customReports' }),
            () => {
              window.location.href = '/operations/reports';
            }
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * TemplateCard Component - Individual template display card
 */
interface TemplateCardProps {
  template: ReportTemplate;
  onUseTemplate: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onArchiveToggle: () => void;
  isUserTemplate: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUseTemplate,
  onEdit,
  onShare,
  onDelete,
  onArchiveToggle,
  isUserTemplate,
}) => {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false); // No is_favorite field in backend yet
  const localized = getLocalizedTemplateText(template, t);
  const isSystemTemplate = template.is_system;
  const isActive = template.is_active !== false;

  return (
    <div className="bg-white rounded-lg border hover:border-blue-500 hover:shadow-lg transition-all p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{localized.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{localized.description}</p>
        </div>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className={`p-2 rounded transition-colors ${
            isFavorite
              ? 'text-yellow-500 bg-yellow-50'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
          }`}
        >
          <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {t(`customReports:entity_${template.report_type}`)}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
          {template.default_export_format?.toUpperCase() || 'PDF'}
        </span>
        {!isActive && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
            {t('archivedBadge', { ns: 'customReports' })}
          </span>
        )}
        <span className="text-xs text-gray-500">
          {t('fields', { ns: 'customReports', count: Array.isArray(template.fields) ? template.fields.length : 0 })}
        </span>
      </div>

      {/* Preview Info */}
      <div className="bg-gray-50 rounded p-3 space-y-1 text-xs text-gray-600">
        <p>
          <span className="font-medium">{t('filters', { ns: 'customReports' })}:</span> {Array.isArray(template.filters) ? template.filters.length : 0}
        </p>
        <p>
          <span className="font-medium">{t('sortRules', { ns: 'customReports' })}:</span> {Array.isArray(template.sort_by) ? template.sort_by.length : 0}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={onUseTemplate}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          {t('useTemplate', { ns: 'customReports' })}
        </button>

        {isUserTemplate && (
          <>
            <button
              onClick={onEdit}
              className="px-3 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
              title={t('edit', { ns: 'customReports' })}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onShare}
              className="px-3 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
              title={t('share', { ns: 'customReports' })}
            >
              <Heart size={16} className="mr-2" />
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              title={t('delete', { ns: 'customReports' })}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}

        {isSystemTemplate && (
          <button
            onClick={onArchiveToggle}
            className="px-3 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
            title={
              isActive
                ? t('archiveTemplate', { ns: 'customReports' })
                : t('restoreTemplate', { ns: 'customReports' })
            }
          >
            {isActive ? t('archive', { ns: 'customReports' }) : t('restore', { ns: 'customReports' })}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportTemplateList;
