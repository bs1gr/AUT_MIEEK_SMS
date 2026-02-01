/**
 * ReportTemplateList Component - Browse and use pre-built report templates
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Copy, Trash2, Search } from 'lucide-react';
import { useReportTemplates, useDeleteTemplate } from '@/hooks/useCustomReports';

interface Template {
  id: number;
  name: string;
  description: string;
  entity_type: string;
  fields: any[];
  filters: any[];
  sorting: any[];
  output_format: string;
  is_favorite?: boolean;
  created_by?: string;
  created_at?: string;
  is_system?: boolean;
}

interface ReportTemplateListProps {
  onUseTemplate?: (template: Template) => void;
  onEditTemplate?: (templateId: number) => void;
}

export const ReportTemplateList: React.FC<ReportTemplateListProps> = ({
  onUseTemplate,
  onEditTemplate,
}) => {
  const { t } = useTranslation();
  const { data: templates, isLoading, error } = useReportTemplates();
  const deleteMutation = useDeleteTemplate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('standard');
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);

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
        <p className="text-red-800 font-medium">{t('customReports:errorLoading')}</p>
      </div>
    );
  }

  const standardTemplates = templates?.filter((t: Template) => t.is_system) || [];
  const userTemplates = templates?.filter((t: Template) => !t.is_system && t.created_by === 'current_user') || [];
  const sharedTemplates = templates?.filter((t: Template) => !t.is_system && t.created_by !== 'current_user') || [];

  const filterTemplates = (items: Template[]) => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEntity = !selectedEntityType || item.entity_type === selectedEntityType;
      return matchesSearch && matchesEntity;
    });
  };

  const renderTemplateGrid = (items: Template[], emptyMessage: string) => {
    const filtered = filterTemplates(items);

    if (filtered.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-gray-600">{emptyMessage}</p>
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
            onDelete={() => {
              if (window.confirm(t('customReports:confirmDelete'))) {
                deleteMutation.mutate(template.id);
              }
            }}
            isUserTemplate={activeTab === 'my'}
          />
        ))}
      </div>
    );
  };

  const entityTypes = Array.from(
    new Set((templates || []).map((t: Template) => t.entity_type))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('customReports:searchTemplates')}
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
            <option value="">{t('customReports:allEntityTypes')}</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`customReports:entity_${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="standard">{t('customReports:standardTemplates')}</TabsTrigger>
          <TabsTrigger value="my">{t('customReports:myTemplates')}</TabsTrigger>
          <TabsTrigger value="shared">{t('customReports:sharedTemplates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4">
          {renderTemplateGrid(
            standardTemplates,
            t('customReports:noStandardTemplates')
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          {renderTemplateGrid(
            userTemplates,
            t('customReports:noMyTemplates')
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          {renderTemplateGrid(
            sharedTemplates,
            t('customReports:noSharedTemplates')
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
  template: Template;
  onUseTemplate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isUserTemplate: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUseTemplate,
  onEdit,
  onDelete,
  isUserTemplate,
}) => {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(template.is_favorite || false);

  return (
    <div className="bg-white rounded-lg border hover:border-blue-500 hover:shadow-lg transition-all p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
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
          {t(`customReports:entity_${template.entity_type}`)}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
          {template.output_format.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500">
          {t('customReports:fields', { count: template.fields?.length || 0 })}
        </span>
      </div>

      {/* Preview Info */}
      <div className="bg-gray-50 rounded p-3 space-y-1 text-xs text-gray-600">
        <p>
          <span className="font-medium">{t('customReports:filters')}:</span> {template.filters?.length || 0}
        </p>
        <p>
          <span className="font-medium">{t('customReports:sortRules')}:</span> {template.sorting?.length || 0}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={onUseTemplate}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          {t('customReports:useTemplate')}
        </button>

        {isUserTemplate && (
          <>
            <button
              onClick={onEdit}
              className="px-3 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
              title={t('customReports:edit')}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              title={t('customReports:delete')}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportTemplateList;
