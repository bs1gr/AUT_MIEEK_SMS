/**
 * ReportBuilderPage - Page wrapper for custom report builder
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ReportBuilder } from '../components/ReportBuilder';

export const ReportBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('common.back')}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {id
                ? t('customReports:editReport')
                : t('customReports:createReport')}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ReportBuilder
          reportId={id ? parseInt(id) : undefined}
          onCancel={() => navigate('/reports')}
          onSuccess={() => navigate('/reports')}
        />
      </div>
    </div>
  );
};

export default ReportBuilderPage;
