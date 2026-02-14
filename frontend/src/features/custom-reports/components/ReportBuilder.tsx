/**
 * ReportBuilder Component - Main Report Configuration UI
 * Drag-and-drop field selection with filters and sorting
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreateReport, useCustomReport, useUpdateReport } from '@/hooks/useCustomReports';
import type { ReportTemplate } from '@/api/customReportsAPI';
import FieldSelector from './FieldSelector';
import FilterBuilder from './FilterBuilder';
import SortBuilder from './SortBuilder';
import { getLocalizedTemplateText } from '../utils/templateLocalization';

interface ReportBuilderProps {
  reportId?: number;
  initialData?: unknown;
  prefillFilters?: FilterRule[];
  onSuccess?: (reportId: number) => void;
  onCancel?: () => void;
}

type FilterRule = {
  field: string;
  operator: string;
  value: string | number | string[];
};

type SortingRule = {
  field: string;
  order: 'asc' | 'desc';
};

type BackendReportPayload = {
  name: string;
  description?: string;
  report_type: string;
  template_id?: number;
  fields:
    | Record<string, boolean>
    | {
        columns: Array<{ key: string; label: string }>;
        fields?: string[];
      };
  filters?: Record<string, { operator?: string; value?: unknown }>;
  aggregations?: Record<string, unknown>;
  sort_by?: Record<string, string>;
  export_format: 'pdf' | 'excel' | 'csv';
  include_charts: boolean;
  schedule_enabled: boolean;
  schedule_frequency?: string;
  schedule_cron?: string;
  email_recipients?: string[];
  email_enabled: boolean;
};

interface ReportConfig {
  name: string;
  description: string;
  entity_type: string;
  report_type?: string; // from template
  output_format: 'pdf' | 'excel' | 'csv';
  default_export_format?: string; // from template
  selected_fields: string[];
  fields?: string[] | Record<string, unknown>; // from template
  filters: FilterRule[];
  sorting_rules: SortingRule[];
  sort_by?: SortingRule[]; // from template
  default_include_charts?: boolean;
  template_name?: string;
  template_description?: string;
  is_copy?: boolean;
  email_enabled: boolean;
  email_recipients: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeFilterValue = (value: unknown): string | number | string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const normalizeFilterRule = (value: unknown): FilterRule | null => {
  if (!isRecord(value)) {
    return null;
  }
  const field = typeof value.field === 'string' ? value.field : '';
  if (!field) {
    return null;
  }
  const operator = typeof value.operator === 'string' ? value.operator : 'equals';
  const normalizedValue = normalizeFilterValue(value.value);
  return { field, operator, value: normalizedValue };
};

const normalizeTemplateFilters = (value: unknown): FilterRule[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeFilterRule(entry))
      .filter((entry): entry is FilterRule => entry !== null);
  }
  if (isRecord(value)) {
    if ('field' in value) {
      const rule = normalizeFilterRule(value);
      return rule ? [rule] : [];
    }
    return Object.entries(value).map(([field, entry]) => {
      const operator = isRecord(entry) && typeof entry.operator === 'string' ? entry.operator : 'equals';
      const normalizedValue = isRecord(entry) ? normalizeFilterValue(entry.value ?? entry) : normalizeFilterValue(entry);
      return { field, operator, value: normalizedValue };
    });
  }
  return [];
};

const normalizeSortingRule = (value: unknown): SortingRule | null => {
  if (!isRecord(value)) {
    return null;
  }
  const field = typeof value.field === 'string' ? value.field : '';
  if (!field) {
    return null;
  }
  const order = value.order === 'desc' ? 'desc' : 'asc';
  return { field, order };
};

const normalizeTemplateSorting = (value: unknown): SortingRule[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeSortingRule(entry))
      .filter((entry): entry is SortingRule => entry !== null);
  }
  if (isRecord(value)) {
    if ('field' in value) {
      const rule = normalizeSortingRule(value);
      return rule ? [rule] : [];
    }
    return Object.entries(value).map(([field, order]) => ({
      field,
      order: order === 'desc' ? 'desc' : 'asc',
    }));
  }
  return [];
};

const areConfigsEqual = (left: ReportConfig, right: ReportConfig): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const mergeFilters = (base: FilterRule[], extra: FilterRule[]): FilterRule[] => {
  if (!extra.length) {
    return base;
  }

  const seen = new Set(base.map((rule) => `${rule.field}|${rule.operator}|${JSON.stringify(rule.value)}`));
  const merged = [...base];
  let added = false;
  extra.forEach((rule) => {
    const signature = `${rule.field}|${rule.operator}|${JSON.stringify(rule.value)}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      merged.push(rule);
      added = true;
    }
  });
  return added ? merged : base;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
};

const ENTITY_TYPES = [
  { value: 'student', label: 'entity_students' },
  { value: 'course', label: 'entity_courses' },
  { value: 'grade', label: 'entity_grades' },
  { value: 'attendance', label: 'entity_attendance' },
  { value: 'daily_performance', label: 'entity_daily_performance' },
];

const OUTPUT_FORMATS = [
  { value: 'pdf', label: 'format_pdf' },
  { value: 'excel', label: 'format_excel' },
  { value: 'csv', label: 'format_csv' },
];

const ENTITY_FIELDS: Record<string, string[]> = {
  student: [
    'id',
    'student_id',
    'first_name',
    'last_name',
    'email',
    'enrollment_date',
    'is_active',
    'father_name',
    'mobile_phone',
    'phone',
    'health_issue',
    'note',
    'academic_year',
    'class_division',
  ],
  course: [
    'id',
    'course_code',
    'course_name',
    'semester',
    'credits',
    'description',
    'evaluation_rules',
    'absence_penalty',
    'hours_per_week',
    'teaching_schedule',
  ],
  grade: [
    'id',
    'student_id',
    'course_id',
    'assignment_name',
    'category',
    'grade',
    'max_grade',
    'weight',
    'date_assigned',
    'date_submitted',
    'notes',
    'student_name',
    'course_code',
    'course_name',
  ],
  attendance: [
    'id',
    'student_id',
    'course_id',
    'date',
    'status',
    'period_number',
    'notes',
    'student_name',
    'course_code',
    'course_name',
  ],
  daily_performance: [
    'id',
    'student_id',
    'course_id',
    'date',
    'category',
    'score',
    'max_score',
    'percentage',
    'notes',
    'student_name',
    'course_code',
    'course_name',
  ],
};

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  reportId,
  initialData,
  prefillFilters,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();
  const { data: reportData } = useCustomReport(reportId ?? 0);
  const prefillAppliedRef = useRef(false);
  const lastAppliedReportSignatureRef = useRef<string | null>(null);
  const lastAppliedTemplateSignatureRef = useRef<string | null>(null);
  const normalizedPrefillFilters = useMemo(() => prefillFilters ?? [], [prefillFilters]);

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

    // Normalize initialData from template format to internal format
    if (initialData) {
      const templateMeta = initialData as ReportTemplate & {
        template_name?: string;
        template_description?: string;
        is_copy?: boolean;
        entity_type?: string;
        output_format?: string;
        selected_fields?: string[];
        sorting_rules?: SortingRule[];
      };
      const templateForLocalization: ReportTemplate | null = templateMeta.is_system
        ? {
            ...templateMeta,
            name: templateMeta.template_name || templateMeta.name,
            description: templateMeta.template_description || templateMeta.description,
          }
        : null;
      const templateText = templateForLocalization
        ? getLocalizedTemplateText(templateForLocalization, t)
        : null;
      const baseName = templateText?.name || templateMeta.name || '';
      const baseDescription = templateText?.description || templateMeta.description || '';
      const normalized: ReportConfig = {
        name: baseName,
        description: baseDescription,
        entity_type: (templateMeta.report_type || templateMeta.entity_type || 'student') as string,
        output_format: (templateMeta.default_export_format || templateMeta.output_format || 'pdf') as 'pdf' | 'excel' | 'csv',
        selected_fields: Array.isArray(templateMeta.fields)
          ? templateMeta.fields
          : (templateMeta.selected_fields || []),
        filters: mergeFilters(normalizeTemplateFilters(templateMeta.filters), normalizedPrefillFilters),
        sorting_rules: normalizeTemplateSorting(templateMeta.sort_by ?? templateMeta.sorting_rules),
        template_name: templateMeta.template_name || templateMeta.name,
        template_description: templateMeta.template_description || templateMeta.description || '',
        is_copy: templateMeta.is_copy,
        email_enabled: false,
        email_recipients: '',
      };
      return normalized;
    }

    // Fall back to default
    return {
      name: '',
      description: '',
      entity_type: 'student',
      output_format: 'pdf',
      selected_fields: [],
      filters: normalizedPrefillFilters,
      sorting_rules: [],
      email_enabled: false,
      email_recipients: '',
    };
  });

  // Normalize backend report data to builder config
  const normalizeReportData = useCallback((report: unknown): ReportConfig => {
    const reportRecord = isRecord(report) ? report : {};
    const reportFields = reportRecord.fields;
    const reportFilters = reportRecord.filters;
    const reportSortBy = reportRecord.sort_by;

    const fields = Array.isArray(reportFields)
      ? reportFields
      : reportFields && typeof reportFields === 'object'
        ? (() => {
            const reportFieldsRecord = reportFields as Record<string, unknown>;
            if (Array.isArray(reportFieldsRecord.columns)) {
              return reportFieldsRecord.columns
                .map((entry) => {
                  if (!isRecord(entry)) {
                    return '';
                  }
                  return (entry.key || entry.field || entry.name || '').toString();
                })
                .filter(Boolean);
            }
            if (Array.isArray(reportFieldsRecord.fields)) {
              return reportFieldsRecord.fields;
            }
            return Object.keys(reportFieldsRecord).filter((key) => Boolean(reportFieldsRecord[key]));
          })()
        : [];

    const filters = Array.isArray(reportFilters)
      ? reportFilters
      : reportFilters && typeof reportFilters === 'object'
        ? Object.entries(reportFilters).map(([field, value]) => ({
            field,
            operator: isRecord(value) && typeof value.operator === 'string' ? value.operator : 'equals',
            value: isRecord(value) ? normalizeFilterValue(value.value ?? value) : normalizeFilterValue(value),
          }))
        : [];

    const sortingRules = Array.isArray(reportSortBy)
      ? reportSortBy
      : reportSortBy && typeof reportSortBy === 'object'
        ? Object.entries(reportSortBy).map(([field, order]) => ({
            field,
            order: order === 'desc' ? 'desc' : 'asc',
          }))
        : [];

    return {
      name: (reportRecord.name as string) || '',
      description: (reportRecord.description as string) || '',
      entity_type: (reportRecord.report_type as string) || 'student',
      output_format: (reportRecord.export_format as 'pdf' | 'excel' | 'csv') || 'pdf',
      selected_fields: fields,
      filters,
      sorting_rules: sortingRules,
      email_enabled: Boolean(reportRecord.email_enabled),
      email_recipients: Array.isArray(reportRecord.email_recipients)
        ? reportRecord.email_recipients.join(', ')
        : '',
    };
  }, []);

  // Handle effect cleanup - consolidate data loading effects
  useEffect(() => {
    // Load report data when editing
    if (reportId && reportData) {
      const reportRecord: Record<string, unknown> = isRecord(reportData) ? reportData : {};
      const updatedAt = typeof reportRecord.updated_at === 'string' ? reportRecord.updated_at : '';
      const reportSignature = `report-${reportId}-${updatedAt}`;

      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Report hydration check:', {
          reportId,
          reportSignature,
          lastApplied: lastAppliedReportSignatureRef.current,
          willApply: lastAppliedReportSignatureRef.current !== reportSignature,
        });
      }

      if (lastAppliedReportSignatureRef.current !== reportSignature) {
        lastAppliedReportSignatureRef.current = reportSignature;
        if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
          console.warn('[ReportBuilder] ✅ Applying report data (signature changed)');
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfig((prev) => {
          const nextConfig = normalizeReportData(reportData);
          const isEqual = areConfigsEqual(prev, nextConfig);
          if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
            console.warn('[ReportBuilder] Config equality check:', {
              isEqual,
              willUpdate: !isEqual,
            });
          }
          return isEqual ? prev : nextConfig;
        });
      } else {
        if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
          console.warn('[ReportBuilder] ⏭️ Skipping report data (signature unchanged)');
        }
      }
      return;
    }

    // Load template data when creating from template
    if (!reportId && initialData) {
      const templateMeta = initialData as ReportTemplate & {
        template_name?: string;
        template_description?: string;
        is_copy?: boolean;
        entity_type?: string;
        output_format?: string;
        selected_fields?: string[];
        sorting_rules?: SortingRule[];
      };
      const templateId = typeof templateMeta.id === 'number' ? templateMeta.id : 'unknown';
      const updatedAt = typeof templateMeta.updated_at === 'string' ? templateMeta.updated_at : '';
      const copyFlag = templateMeta.is_copy ? 'copy' : 'base';
      const templateSignature = `template-${templateId}-${updatedAt}-${copyFlag}`;

      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Template hydration check:', {
          templateId,
          templateSignature,
          lastApplied: lastAppliedTemplateSignatureRef.current,
          willApply: lastAppliedTemplateSignatureRef.current !== templateSignature,
        });
      }

      if (lastAppliedTemplateSignatureRef.current === templateSignature) {
        if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
          console.warn('[ReportBuilder] ⏭️ Skipping template data (signature unchanged)');
        }
        return;
      }
      lastAppliedTemplateSignatureRef.current = templateSignature;
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] ✅ Applying template data (signature changed)');
      }

      const templateForLocalization: ReportTemplate | null = templateMeta.is_system
        ? {
            ...templateMeta,
            name: templateMeta.template_name || templateMeta.name,
            description: templateMeta.template_description || templateMeta.description,
          }
        : null;
      const templateText = templateForLocalization
        ? getLocalizedTemplateText(templateForLocalization, t)
        : null;
      const baseName = templateText?.name || templateMeta.name || '';
      const baseDescription = templateText?.description || templateMeta.description || '';
      const normalized: ReportConfig = {
        name: baseName,
        description: baseDescription,
        entity_type: (templateMeta.report_type || templateMeta.entity_type || 'student') as string,
        output_format: (templateMeta.default_export_format || templateMeta.output_format || 'pdf') as 'pdf' | 'excel' | 'csv',
        selected_fields: Array.isArray(templateMeta.fields)
          ? templateMeta.fields
          : (templateMeta.selected_fields || []),
        filters: mergeFilters(normalizeTemplateFilters(templateMeta.filters), normalizedPrefillFilters),
        sorting_rules: normalizeTemplateSorting(templateMeta.sort_by ?? templateMeta.sorting_rules),
        template_name: templateMeta.template_name || templateMeta.name,
        template_description: templateMeta.template_description || templateMeta.description || '',
        is_copy: templateMeta.is_copy,
        email_enabled: false,
        email_recipients: '',
      };
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Template config normalized, checking equality...');
      }
      setConfig((prev) => {
        const isEqual = areConfigsEqual(prev, normalized);
        if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
          console.warn('[ReportBuilder] Config equality check:', {
            isEqual,
            willUpdate: !isEqual,
          });
        }
        return isEqual ? prev : normalized;
      });
    }
  }, [reportId, reportData, normalizeReportData, initialData, t, normalizedPrefillFilters]);

  useEffect(() => {
    if (!normalizedPrefillFilters.length || reportId || prefillAppliedRef.current) {
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Prefill filters skipped:', {
          hasFilters: normalizedPrefillFilters.length > 0,
          reportId,
          alreadyApplied: prefillAppliedRef.current,
        });
      }
      return;
    }

    if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
      console.warn('[ReportBuilder] Prefill filters check:', {
        filtersCount: normalizedPrefillFilters.length,
        willApply: true,
      });
    }

    prefillAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig((prev) => {
      const mergedFilters = mergeFilters(prev.filters, normalizedPrefillFilters);
      const isIdentical = mergedFilters === prev.filters;
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Prefill filters merge result:', {
          prevFiltersCount: prev.filters.length,
          mergedFiltersCount: mergedFilters.length,
          isIdentical,
          willUpdate: !isIdentical,
        });
      }
      if (isIdentical) {
        return prev;
      }
      return { ...prev, filters: mergedFilters };
    });
  }, [normalizedPrefillFilters, reportId]);

  // Re-localize template name/description on language changes
  useEffect(() => {
    if (!config.template_name) {
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] Re-localization skipped: no template name');
      }
      return;
    }

    const templateForLocalization = {
      name: config.template_name,
      description: config.template_description || '',
      is_system: true,
    };

    const templateText = getLocalizedTemplateText(templateForLocalization, t);
    const localizedDescription = templateText.description || '';

    if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
      console.warn('[ReportBuilder] Re-localization check:', {
        templateName: config.template_name,
        currentName: config.name,
        localizedName: templateText.name,
        nameMatch: config.name === templateText.name,
        currentDesc: config.description,
        localizedDesc: localizedDescription,
        descMatch: config.description === localizedDescription,
      });
    }

    // Only update if localized text differs from current config
    if (config.name !== templateText.name || config.description !== localizedDescription) {
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] ⚠️ Re-localizing template text (language changed)');
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig((prev) => {
        // Ensure we only update name/description, preserving other config
        if (prev.name === templateText.name && prev.description === localizedDescription) {
          if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
            console.warn('[ReportBuilder] ⏭️ Re-localization redundant (already matching inside setter)');
          }
          return prev;
        }
        if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
          console.warn('[ReportBuilder] ✅ Applying re-localized text');
        }
        return {
          ...prev,
          name: templateText.name,
          description: localizedDescription,
        };
      });
    } else {
      if (import.meta.env.VITE_DEBUG_REPORTS === '1') {
        console.warn('[ReportBuilder] ⏭️ Re-localization not needed (already matching)');
      }
    }
  }, [config.template_name, config.template_description, config.name, config.description, t]);

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
    'config' | 'fields' | 'filters' | 'preview'
  >('config');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableFields = ENTITY_FIELDS[config.entity_type] || [];
  const getFieldLabel = useCallback(
    (field: string) => t(`field_${field}`, { ns: 'customReports', defaultValue: field }),
    [t]
  );

  const handleConfigChange = useCallback(
    <T extends keyof ReportConfig>(key: T, value: ReportConfig[T]) => {
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

  const handleFiltersChange = useCallback((filters: FilterRule[]) => {
    setConfig((prev) => ({ ...prev, filters }));
  }, []);

  const handleSortingChange = useCallback((sorting: SortingRule[]) => {
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
    if (config.email_enabled && !config.email_recipients.trim()) {
      newErrors.email_recipients = 'emailRecipientsRequired';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {

      // Show error toast
      const toast = document.createElement('div');
      toast.textContent = '❌ Please fill in all required fields';
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
      return;
    }

    try {
      // Transform sorting_rules array to sort_by dict
      const sortByDict = config.sorting_rules.length > 0
        ? config.sorting_rules.reduce((acc: Record<string, string>, rule) => {
            acc[rule.field] = rule.order || 'asc';
            return acc;
          }, {})
        : null;

      // Transform filters array to filters dict if needed
      const filtersDict = config.filters.length > 0
        ? config.filters.reduce((acc: Record<string, { operator?: string; value?: unknown }>, filter) => {
            acc[filter.field] = {
              operator: filter.operator,
              value: filter.value
            };
            return acc;
          }, {})
        : null;

      const emailRecipients = config.email_recipients
        .split(',')
        .map((recipient) => recipient.trim())
        .filter((recipient) => recipient.length > 0);

      const columns = config.selected_fields.map((field) => ({
        key: field,
        label: getFieldLabel(field),
      }));

      // Transform frontend config to backend schema format
      const backendConfig: BackendReportPayload = {
        name: config.name,
        description: config.description || undefined,
        report_type: config.entity_type,
        template_id: undefined,
        fields: {
          columns,
          fields: config.selected_fields,
        },
        filters: filtersDict || undefined,
        aggregations: undefined,
        sort_by: sortByDict || undefined,
        export_format: config.output_format,
        include_charts: true,
        schedule_enabled: false,
        schedule_frequency: undefined,
        schedule_cron: undefined,
        email_recipients: config.email_enabled ? emailRecipients : undefined,
        email_enabled: config.email_enabled,
      };



      if (reportId) {
        await updateMutation.mutateAsync({
          id: reportId,
          updates: backendConfig,
        });
        const toast = document.createElement('div');
        toast.textContent = `✅ ${t('reportUpdated', { ns: 'customReports' })}`;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
        onSuccess?.(reportId);
      } else {
        const result = await createMutation.mutateAsync(backendConfig);

        // Show success toast
        const toast = document.createElement('div');
        toast.textContent = `✅ ${t('reportCreated', { ns: 'customReports' })}`;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
        onSuccess?.(result.id);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      // Show error toast
      const toast = document.createElement('div');
      const errorMsg = getErrorMessage(error, 'Failed to save report');
      toast.textContent = `❌ ${t('error', { ns: 'customReports' })}: ${errorMsg}`;
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
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

            <div>
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={config.email_enabled}
                  onChange={(e) => handleConfigChange('email_enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t('enableEmailDelivery', { ns: 'customReports' })}
              </label>
              <p className="mt-1 text-sm text-gray-500">
                {t('helpEmail', { ns: 'customReports' })}
              </p>
            </div>

            {config.email_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('emailRecipients', { ns: 'customReports' })} *
                </label>
                <input
                  type="text"
                  value={config.email_recipients}
                  onChange={(e) => handleConfigChange('email_recipients', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.email_recipients ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('emailRecipientsPlaceholder', { ns: 'customReports' })}
                />
                {errors.email_recipients && (
                  <p className="mt-1 text-sm text-red-500">
                    {t(errors.email_recipients, { ns: 'customReports' })}
                  </p>
                )}
              </div>
            )}

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
                  onChange={(e) => handleConfigChange('output_format', e.target.value as 'pdf' | 'excel' | 'csv')}
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
            getFieldLabel={getFieldLabel}
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
                getFieldLabel={getFieldLabel}
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
                      {getFieldLabel(field)}
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
              <div>
                <span className="font-medium">{t('previewEmailDelivery', { ns: 'customReports' })}: </span>
                {config.email_enabled
                  ? t('previewEmailEnabled', { ns: 'customReports', recipients: config.email_recipients })
                  : t('previewEmailDisabled', { ns: 'customReports' })}
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
              const steps: ('config' | 'fields' | 'filters' | 'preview')[] = ['config', 'fields', 'filters', 'preview'];
              const currentIndex = steps.indexOf(activeStep);
              if (currentIndex < steps.length - 1) {
                setActiveStep(steps[currentIndex + 1] as typeof activeStep);
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
