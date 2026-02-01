/**
 * ReportBuilder Component - Main Report Configuration UI
 * Drag-and-drop field selection with filters and sorting
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreateReport, useUpdateReport } from '@/hooks/useCustomReports';
import FieldSelector from './FieldSelector';
import FilterBuilder from './FilterBuilder';
import SortBuilder from './SortBuilder';

interface ReportBuilderProps {
  reportId?: number;
  initialData?: any;
  onSuccess?: (reportId: number) => void;
  onCancel?: () => void;
}

interface ReportConfig {
  name: string;
  description: string;
  entity_type: string;
  output_format: string;
  selected_fields: string[];
  filters: any[];
  sorting_rules: any[];
}

const ENTITY_TYPES = [
  { value: 'students', label: 'entity_students' },
  { value: 'courses', label: 'entity_courses' },
  { value: 'grades', label: 'entity_grades' },
  { value: 'attendance', label: 'entity_attendance' },
  { value: 'enrollments', label: 'entity_enrollments' },
];

const OUTPUT_FORMATS = [
  { value: 'pdf', label: 'format_pdf' },
  { value: 'excel', label: 'format_excel' },
  { value: 'csv', label: 'format_csv' },
];

const ENTITY_FIELDS: Record<string, string[]> = {
  students: [
    'id', 'first_name', 'last_name', 'email', 'phone',
    'enrollment_date', 'is_active', 'school_id'
  ],
  courses: [
    'id', 'course_code', 'name', 'description', 'credits',
    'semester', 'instructor', 'capacity'
  ],
  grades: [
    'id', 'student_id', 'course_id', 'grade', 'points',
    'date_assigned', 'notes'
  ],
  attendance: [
    'id', 'student_id', 'course_id', 'date', 'status',
    'notes'
  ],
  enrollments: [
    'id', 'student_id', 'course_id', 'enrollment_date',
    'status', 'grade'
  ],
};

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  reportId,
  initialData,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();

  // Generate a unique key for session storage based on reportId
  const storageKey = `report-builder-${reportId || 'new'}`;

  const [config, setConfig] = useState<ReportConfig>(() => {
    // Try to restore from session storage first
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to restore report config from session storage:', e);
      }
    }

    // Fall back to initialData or default
    return (
      initialData || {
        name: '',
        description: '',
        entity_type: 'students',
        output_format: 'pdf',
        selected_fields: [],
        filters: [],
        sorting_rules: [],
      }
    );
  });

  // Persist config to session storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(config));
      } catch (e) {
        console.error('Failed to save report config to session storage:', e);
      }
    }
  }, [config, storageKey]);

  // Clear storage on unmount if success
  useEffect(() => {
    return () => {
      // Only clear if we're not editing (i.e., it was a new report)
      if (!reportId && typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(storageKey);
        } catch (e) {
          console.error('Failed to clear report config from session storage:', e);
        }
      }
    };
  }, [reportId, storageKey]);

  const [activeStep, setActiveStep] = useState<
    'config' | 'fields' | 'filters' | 'sorting' | 'preview'
  >('config');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableFields = ENTITY_FIELDS[config.entity_type] || [];

  const handleConfigChange = useCallback(
    (key: keyof ReportConfig, value: any) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleFieldsChange = useCallback((fields: string[]) => {
    setConfig((prev) => ({ ...prev, selected_fields: fields }));
  }, []);

  const handleFiltersChange = useCallback((filters: any[]) => {
    setConfig((prev) => ({ ...prev, filters }));
  }, []);

  const handleSortingChange = useCallback((sorting: any[]) => {
    setConfig((prev) => ({ ...prev, sorting_rules: sorting }));
  }, []);

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = 'nameRequired';
    }
    if (!config.entity_type) {
      newErrors.entity_type = 'entityRequired';
    }
    if (!config.output_format) {
      newErrors.output_format = 'formatRequired';
    }
    if (config.selected_fields.length === 0) {
      newErrors.selected_fields = 'fieldsRequired';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    try {
      // Transform frontend config to backend schema format
      const backendConfig: any = {
        name: config.name,
        description: config.description || undefined,
        report_type: config.entity_type,
        fields: config.selected_fields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>),
        export_format: config.output_format,
        include_charts: true,
        schedule_enabled: false,
      };

      // Only add optional fields if they have values
      if (config.filters.length > 0) {
        backendConfig.filters = config.filters;
      }
      if (config.sorting_rules.length > 0) {
        backendConfig.sort_by = config.sorting_rules;
      }

      if (reportId) {
        await updateMutation.mutateAsync({
          id: reportId,
          updates: backendConfig,
        });
      } else {
        const result = await createMutation.mutateAsync(backendConfig);
        onSuccess?.(result.id);
      }
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('back', { ns: 'common' })}
          >
            <ChevronUp size={24} className="rotate-90" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {reportId ? t('reportBuilder', { ns: 'customReports' }) : t('createNew', { ns: 'customReports' })}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b">
        <div className="flex gap-4 px-6 py-4 overflow-x-auto">
          {[
            { key: 'config', label: 'reportConfiguration' },
            { key: 'fields', label: 'dataSelection' },
            { key: 'filters', label: 'filtersAndSorting' },
            { key: 'preview', label: 'previewAndGenerate' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveStep(key as typeof activeStep)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeStep === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(label, { ns: 'customReports' })}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeStep === 'config' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reportName', { ns: 'customReports' })} *
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('reportName', { ns: 'customReports' })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{t(errors.name, { ns: 'customReports' })}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reportDescription', { ns: 'customReports' })}
              </label>
              <textarea
                value={config.description}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={t('reportDescription', { ns: 'customReports' })}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('entityType', { ns: 'customReports' })} *
                </label>
                <select
                  value={config.entity_type}
                  onChange={(e) => handleConfigChange('entity_type', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.entity_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {ENTITY_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {t(label, { ns: 'customReports' })}
                    </option>
                  ))}
                </select>
                {errors.entity_type && (
                  <p className="mt-1 text-sm text-red-500">{t(errors.entity_type, { ns: 'customReports' })}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outputFormat', { ns: 'customReports' })} *
                </label>
                <select
                  value={config.output_format}
                  onChange={(e) => handleConfigChange('output_format', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.output_format ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {OUTPUT_FORMATS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {t(label, { ns: 'customReports' })}
                    </option>
                  ))}
                </select>
                {errors.output_format && (
                  <p className="mt-1 text-sm text-red-500">{t(errors.output_format, { ns: 'customReports' })}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeStep === 'fields' && (
          <FieldSelector
            availableFields={availableFields}
            selectedFields={config.selected_fields}
            onChange={handleFieldsChange}
          />
        )}

        {activeStep === 'filters' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {t('filtersAndSorting', { ns: 'customReports' })}
              </h2>
              <FilterBuilder
                fields={availableFields}
                filters={config.filters}
                onChange={handleFiltersChange}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4 mt-8">
                {t('sortBy', { ns: 'customReports' })}
              </h2>
              <SortBuilder
                fields={availableFields}
                sorting={config.sorting_rules}
                onChange={handleSortingChange}
              />
            </div>
          </div>
        )}

        {activeStep === 'preview' && (
          <div className="bg-white rounded-lg border p-6 max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">{t('previewTitle', { ns: 'customReports' })}</h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium">{t('previewName', { ns: 'customReports' })}:</span> {config.name}
              </div>
              <div>
                <span className="font-medium">{t('previewDescription', { ns: 'customReports' })}:</span> {config.description || t('previewNotAvailable', { ns: 'customReports' })}
              </div>
              <div>
                <span className="font-medium">{t('previewEntityType', { ns: 'customReports' })}:</span>{' '}
                {t(`entity_${config.entity_type}`, { ns: 'customReports' })}
              </div>
              <div>
                <span className="font-medium">{t('previewOutputFormat', { ns: 'customReports' })}:</span>{' '}
                {t(`format_${config.output_format}`, { ns: 'customReports' })}
              </div>
              <div>
                <span className="font-medium">{t('previewFields', { ns: 'customReports' })} ({config.selected_fields.length}):</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {config.selected_fields.map((field) => (
                    <span
                      key={field}
                      className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">{t('previewFilters', { ns: 'customReports' })}: </span>
                {config.filters.length > 0
                  ? t('previewFiltersCount', { ns: 'customReports', count: config.filters.length })
                  : t('previewNone', { ns: 'customReports' })}
              </div>
              <div>
                <span className="font-medium">{t('previewSorting', { ns: 'customReports' })}: </span>
                {config.sorting_rules.length > 0
                  ? t('previewSortingCount', { ns: 'customReports', count: config.sorting_rules.length })
                  : t('previewNone', { ns: 'customReports' })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-6 flex gap-4 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('cancel', { ns: 'common' })}
        </button>

        {activeStep !== 'preview' && (
          <button
            onClick={() => {
              const steps: typeof activeStep[] = ['config', 'fields', 'filters', 'preview'];
              const currentIndex = steps.indexOf(activeStep);
              if (currentIndex < steps.length - 1) {
                setActiveStep(steps[currentIndex + 1]);
              }
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {t('next', { ns: 'common' })}
            <ChevronDown size={18} className="rotate-[-90deg]" />
          </button>
        )}

        {activeStep === 'preview' && (
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {isLoading ? t('generating', { ns: 'customReports' }) : t('save', { ns: 'common' })}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportBuilder;
