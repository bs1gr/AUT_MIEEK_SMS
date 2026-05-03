import React from 'react';
import FeatureImportWizard from '@/features/importExport/ImportWizard';
import FeatureHistoryTable from '@/features/importExport/HistoryTable';
import { useTranslation } from 'react-i18next';

export interface ImportWizardProps {
  type: 'students' | 'courses' | 'grades';
  onCancel: () => void;
  onComplete: () => void;
}

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'students' | 'courses' | 'grades';
  onComplete?: () => void;
}

// HistoryTableProps is intentionally broad to allow future table filters.
export type HistoryTableProps = Record<string, unknown>;

export const ImportWizard: React.FC<ImportWizardProps> = ({ type, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg bg-white p-6 shadow-xl" data-testid={`import-wizard-${type}`}>
      <FeatureImportWizard />
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
        </button>
      </div>
    </div>
  );
};

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, type = 'students', onComplete }) => {
  const { t } = useTranslation();
  const [exportType, setExportType] = React.useState(type);

  if (!isOpen) {
    return null;
  }

  const handleExport = () => {
    onComplete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 id="export-dialog-title" className="mb-4 text-lg font-medium text-gray-900">
          {t('exportData', { ns: 'export' })}
        </h3>
        <label htmlFor="export-type" className="mb-2 block text-sm font-medium text-gray-700">
          {t('exportType', { ns: 'export', defaultValue: 'Export type' })}
        </label>
        <select
          id="export-type"
          value={exportType}
          onChange={(event) => setExportType(event.target.value as NonNullable<ExportDialogProps['type']>)}
          className="mb-6 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="students">{t('students', { ns: 'export', defaultValue: 'Students' })}</option>
          <option value="courses">{t('courses', { ns: 'export', defaultValue: 'Courses' })}</option>
          <option value="grades">{t('grades', { ns: 'export', defaultValue: 'Grades' })}</option>
        </select>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('close', { ns: 'common', defaultValue: 'Close' })}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('export', { ns: 'export', defaultValue: 'Export' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export const HistoryTable: React.FC<HistoryTableProps> = () => <FeatureHistoryTable />;
