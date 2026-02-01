/**
 * ReportTemplateBrowserPage - Page wrapper for template browsing
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ReportTemplateList } from '../components/ReportTemplateList';

interface Template {
  id: number;
  name: string;
  description: string;
  entity_type: string;
  fields: any[];
  filters: any[];
  sorting: any[];
  output_format: string;
}

export const ReportTemplateBrowserPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleUseTemplate = (template: Template) => {
    // Navigate to builder with template data pre-filled
    navigate('/operations/reports/builder', {
      state: {
        templateData: {
          name: `${template.name} - Copy`,
          description: template.description,
          entity_type: template.entity_type,
          fields: template.fields,
          filters: template.filters,
          sorting: template.sorting,
          output_format: template.output_format,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
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
        />
      </div>
    </div>
  );
};

export default ReportTemplateBrowserPage;
