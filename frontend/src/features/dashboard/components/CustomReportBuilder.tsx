/**
 * CustomReportBuilder Component
 * Multi-step wizard for creating custom analytics reports
 */

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateReport } from '@/hooks/useCustomReports';

// Step components
import { ReportTemplate } from './builder-steps/ReportTemplate';
import { DataSeriesPicker } from './builder-steps/DataSeriesPicker';
import { ChartTypeSelector } from './builder-steps/ChartTypeSelector';
import { FilterConfiguration } from './builder-steps/FilterConfiguration';
import { ReportPreview } from './builder-steps/ReportPreview';

interface CustomReportBuilderProps {
  onSave?: (reportConfig: any) => void;
  onCancel?: () => void;
  initialReport?: any;
  isLoading?: boolean;
}

export const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({
  onSave,
  onCancel,
  initialReport,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const createReport = useCreateReport();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [reportConfig, setReportConfig] = useState(
    initialReport || {
      template: 'class_summary',
      dataSeries: [],
      chartType: 'bar',
      filters: {},
      name: '',
      description: '',
    }
  );

  const steps = [
    {
      label: t('analytics.builder.step.template', 'Report Template'),
      component: ReportTemplate,
      description: t('analytics.builder.step.template.desc', 'Select a template or start custom'),
    },
    {
      label: t('analytics.builder.step.dataseries', 'Data Series'),
      component: DataSeriesPicker,
      description: t('analytics.builder.step.dataseries.desc', 'Choose metrics to include'),
    },
    {
      label: t('analytics.builder.step.charttype', 'Chart Type'),
      component: ChartTypeSelector,
      description: t('analytics.builder.step.charttype.desc', 'Select visualization type'),
    },
    {
      label: t('analytics.builder.step.filters', 'Filters'),
      component: FilterConfiguration,
      description: t('analytics.builder.step.filters.desc', 'Configure data filters'),
    },
    {
      label: t('analytics.builder.step.preview', 'Preview'),
      component: ReportPreview,
      description: t('analytics.builder.step.preview.desc', 'Review your report'),
    },
  ];

  const currentStepConfig = steps[currentStep];
  const CurrentComponent = currentStepConfig.component;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdateConfig = (updates: any) => {
    setReportConfig((prev: any) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleSave = async () => {
    if (reportConfig.name.trim() === '') {
      alert(t('analytics.builder.error.noName', 'Please enter a report name'));
      return;
    }
    setIsSaving(true);
    try {
      // Call the backend API to save the report
      await createReport.mutateAsync(reportConfig);
      // Call parent callback if provided
      await onSave?.(reportConfig);
    } catch (error) {
      console.error('Failed to save report:', error);
      alert(t('analytics.builder.error.saveFailed', 'Failed to save report'));
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('analytics.builder.title', 'Custom Report Builder')}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentStepConfig.description}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((_step, idx) => (
          <React.Fragment key={idx}>
            <button
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                idx === currentStep
                  ? 'bg-blue-600 text-white shadow-lg'
                  : idx < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
              disabled={isLoading}
            >
              {idx < currentStep ? '✓' : idx + 1}
            </button>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  idx < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Labels */}
      <div className="grid grid-cols-5 gap-2 text-center">
        {steps.map((step, idx) => (
          <div key={idx} className="text-xs">
            <p className={`font-semibold ${idx === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
              {step.label}
            </p>
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="border border-gray-200 rounded-lg p-8 min-h-96 bg-white">
        {isLoading || isSaving ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {isLastStep ? (
              <ReportPreview
                reportConfig={reportConfig}
                onUpdate={handleUpdateConfig}
                onSave={handleSave}
                isSaving={isSaving}
              />
            ) : (
              <CurrentComponent
                reportConfig={reportConfig}
                onUpdate={handleUpdateConfig}
              />
            )}
          </>
        )}
      </div>

      {/* Validation Messages */}
      {currentStep === 0 && reportConfig.template === '' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">
              {t('analytics.builder.warning', 'Please select a template')}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          disabled={isLoading || isSaving}
        >
          {t('common.cancel', 'Cancel')}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={isFirstStep || isLoading || isSaving}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.previous', 'Previous')}
          </button>

          {!isLastStep && (
            <button
              onClick={handleNext}
              disabled={isLoading || isSaving}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isLastStep && (
            <button
              onClick={handleSave}
              disabled={isLoading || isSaving || reportConfig.name.trim() === ''}
              className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                <>
                  {t('common.save', 'Save Report')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Report Name (Always visible) */}
      {!isLastStep && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('analytics.builder.reportName', 'Report Name')}
          </label>
          <input
            type="text"
            value={reportConfig.name}
            onChange={(e) => handleUpdateConfig({ name: e.target.value })}
            placeholder={t('analytics.builder.reportName.placeholder', 'Enter report name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || isSaving}
          />
          <p className="text-xs text-gray-600 mt-1">
            {t('analytics.builder.reportName.hint', 'This name will appear in your reports list')}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomReportBuilder;
