/**
 * ReportBuilderPage - Page wrapper for custom report builder
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ReportBuilder } from '../components/ReportBuilder';
import { reportTemplatesAPI } from '@/api/customReportsAPI';
import { getLocalizedTemplateText } from '../utils/templateLocalization';

export const ReportBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id?: string }>();
  const importDefaultsAttempted = useRef(false);

  // Extract template data from navigation state
  const templateData = (location.state as { templateData?: unknown } | null)?.templateData;
  const templateIdParam = searchParams.get('template');
  const templateNameParam = searchParams.get('templateName');
  const studentIdParam = searchParams.get('studentId');
  const courseIdParam = searchParams.get('courseId');
  const [resolvedTemplate, setResolvedTemplate] = useState<unknown | null>(templateData ?? null);

  const prefillFilters = useMemo(() => {
    const filters: Array<{ field: string; operator: string; value: number }> = [];
    const studentId = studentIdParam ? Number(studentIdParam) : NaN;
    const courseId = courseIdParam ? Number(courseIdParam) : NaN;

    if (Number.isFinite(studentId)) {
      filters.push({ field: 'student_id', operator: 'equals', value: studentId });
    }
    if (Number.isFinite(courseId)) {
      filters.push({ field: 'course_id', operator: 'equals', value: courseId });
    }

    return filters;
  }, [studentIdParam, courseIdParam]);

  useEffect(() => {
    let isMounted = true;

    const normalizeTemplateName = (value: string | null) =>
      (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

    if (templateData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolvedTemplate(templateData);
      return undefined;
    }

    if (!templateIdParam && !templateNameParam) {
      setResolvedTemplate(null);
      return undefined;
    }

    const loadTemplate = async () => {
      try {
        let template = null;
        if (templateIdParam && Number.isFinite(Number(templateIdParam))) {
          // eslint-disable-next-line testing-library/no-await-sync-queries
          template = await reportTemplatesAPI.getById(Number(templateIdParam));
        } else if (templateNameParam) {
          const normalizedTarget = normalizeTemplateName(templateNameParam);
          const matchTemplate = (templates: typeof template) =>
            templates?.find((entry) => normalizeTemplateName(entry.name) === normalizedTarget) ??
            templates?.find(
              (entry) => normalizeTemplateName(getLocalizedTemplateText(entry, t).name) === normalizedTarget
            ) ??
            null;

          let templates = await reportTemplatesAPI.getAll({ is_active: true });
          template = matchTemplate(templates);

          if (!template && !importDefaultsAttempted.current) {
            importDefaultsAttempted.current = true;
            await reportTemplatesAPI.importDefaults();
            templates = await reportTemplatesAPI.getAll({ is_active: true });
            template = matchTemplate(templates);
          }
        }

        if (isMounted) {
          setResolvedTemplate(template);
        }
      } catch (error) {
        console.error('[ReportBuilderPage] Failed to load template:', error);
        if (isMounted) {
          setResolvedTemplate(null);
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateData, templateIdParam, templateNameParam, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/operations?tab=reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('back', { ns: 'common' })}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {id
                ? t('editReport', { ns: 'customReports' })
                : t('createReport', { ns: 'customReports' })}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ReportBuilder
          reportId={id ? parseInt(id) : undefined}
          initialData={resolvedTemplate ?? undefined}
          prefillFilters={prefillFilters.length ? prefillFilters : undefined}
          onCancel={() => navigate('/operations?tab=reports')}
          onSuccess={() => navigate('/operations?tab=reports')}
        />
      </div>
    </div>
  );
};

export default ReportBuilderPage;
