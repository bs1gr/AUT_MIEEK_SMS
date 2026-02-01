/**
 * ReportListPage - Page wrapper for reports management
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ReportList } from '../components/ReportList';

export const ReportListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('customReports:myReports')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('customReports:reportsDescription')}
            </p>
          </div>
          <button
            onClick={() => navigate('/reports/builder')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            {t('customReports:createReport')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReportList
          onEditReport={(reportId) => navigate(`/reports/builder/${reportId}`)}
          onViewReport={(reportId) => {
            // Navigate to generated reports view for this report
            navigate(`/reports/${reportId}/generated`);
          }}
        />
      </div>
    </div>
  );
};

export default ReportListPage;
