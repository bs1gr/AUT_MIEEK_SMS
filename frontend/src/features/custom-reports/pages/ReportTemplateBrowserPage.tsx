/**
 * ReportTemplateBrowserPage - Page wrapper for template browsing
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ReportTemplateList } from '../components/ReportTemplateList';
import type { ReportTemplate } from '@/api/customReportsAPI';

export const ReportTemplateBrowserPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEntityType = searchParams.get('report_type') || undefined;
  const initialFormat = searchParams.get('format') || undefined;
  const initialQuery = searchParams.get('query') || undefined;

  const handleUseTemplate = (template: ReportTemplate) => {
    // Navigate to builder with template data pre-filled
    navigate('/operations/reports/builder', {
      state: {
        templateData: {
          name: `${template.name} - Copy`,
          description: template.description,
          report_type: template.report_type,
          fields: template.fields,
          filters: template.filters,
          sort_by: template.sort_by,
          default_export_format: template.default_export_format,
          default_include_charts: template.default_include_charts,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/operations?tab=reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('back', { ns: 'common' })}
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('customReports:templates')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('customReports:templatesDescription')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReportTemplateList
          onUseTemplate={handleUseTemplate}
          onEditTemplate={(templateId) => {
            navigate(`/operations/reports/builder?template=${templateId}`);
          }}
          initialEntityType={initialEntityType}
          initialFormat={initialFormat}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  );
};

export default ReportTemplateBrowserPage;
