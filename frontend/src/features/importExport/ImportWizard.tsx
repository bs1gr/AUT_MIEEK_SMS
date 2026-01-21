import React, { useState } from 'react';
import Papa from 'papaparse';
import apiClient from '@/api/api';
import { useLanguage } from '@/LanguageContext';

// ImportWizard: Step 2 - Add stepper UI (basic, no logic)
type ImportWizardProps = object;

type CsvRow = string[];
type CsvData = CsvRow[];


const ImportWizard: React.FC<ImportWizardProps> = () => {
  const { t } = useLanguage();
  const steps = [
    t('importExport.selectFile'),
    t('importExport.previewData'),
    t('importExport.validate'),
    t('importExport.commit'),
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [previewData, setPreviewData] = useState<CsvData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setFileName(file ? file.name : '');

    // If user is on preview step and file is selected, parse CSV for preview
    if (file && activeStep === 1) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = Papa.parse(text, { header: false, preview: 10 });
          if (parsed.errors.length) {
            setPreviewError('Failed to parse file: ' + parsed.errors[0].message);
            setPreviewData(null);
          } else {
            setPreviewData((parsed.data as CsvData) || []);
            setPreviewError(null);
          }
        } catch (err: Error | unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setPreviewError('Error reading file: ' + errorMessage);
          setPreviewData(null);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div>
      <h2>{t('importExport.importWizard')}</h2>
      <ol style={{ display: 'flex', listStyle: 'none', padding: 0 }}>
        {steps.map((label, idx) => (
          <li
            key={label}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveStep(idx);
              }
            }}
            style={{
              marginRight: idx < steps.length - 1 ? 16 : 0,
              fontWeight: activeStep === idx ? 'bold' : 'normal',
              color: activeStep === idx ? '#1976d2' : '#888',
              borderBottom: activeStep === idx ? '2px solid #1976d2' : '2px solid #eee',
              paddingBottom: 4,
              cursor: 'pointer',
            }}
            onClick={() => setActiveStep(idx)}
            data-testid={`step-${idx}`}
          >
            {label}
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 24 }}>
        {activeStep === 0 && (
          <div>
            <label htmlFor="import-file-input">
              <strong>{t('importExport.selectFileToImport')}</strong>
            </label>
            <input
              id="import-file-input"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              style={{ display: 'block', marginTop: 8 }}
              data-testid="file-input"
            />
            {fileName && (
              <div style={{ marginTop: 8 }}>
                <span>{t('importExport.selectedFile', { fileName })}</span>
              </div>
            )}
          </div>
        )}
        {activeStep === 1 && (
          <div>
            <strong>
              {t('importExport.previewDataHeading', {
                defaultValue: `${t('importExport.previewData')} - ${t('common.details', { defaultValue: 'Details' })}`,
              })}
            </strong>
            {!selectedFile && <p>{t('importExport.noFileSelected')}</p>}
            {previewError && <p style={{ color: 'red' }}>{previewError}</p>}
            {previewData && previewData.length > 0 && (
              <table style={{ borderCollapse: 'collapse', marginTop: 12 }}>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Backend preview integration: create import job and preview rows */}
            {selectedFile && !importJobId && (
              <button
                onClick={async () => {
                  // Upload file to backend for preview (create import job)
                  const formData = new FormData();
                  formData.append('file', selectedFile);
                  try {
                    const resp = await apiClient.post('/import-export/imports/students', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    setImportJobId(resp.data.id || resp.data.job_id || null);
                    setPreviewData(resp.data.preview || null);
                } catch (err: Error | unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                  setPreviewError('Backend preview failed: ' + errorMessage);
                  }
                }}
                style={{ marginTop: 12 }}
                data-testid="backend-preview-btn"
              >
                {t('importExport.previewWithBackend')}
              </button>
            )}
          </div>
        )}
        {activeStep === 2 && (
          <div>
            <strong>{t('importExport.validateData')}</strong>
            <button
              onClick={async () => {
                setIsValidating(true);
                try {
                  if (!importJobId) throw new Error('No import job');
                  const resp = await apiClient.post(`/import-export/imports/${importJobId}/validate`);
                  setValidationResult(resp.data.result || 'Validation successful!');
                } catch (err: Error | unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                  setValidationResult('Validation failed: ' + errorMessage);
                }
                setIsValidating(false);
              }}
              disabled={isValidating || !importJobId}
              style={{ marginTop: 8 }}
              data-testid="validate-btn"
            >
              {isValidating ? t('importExport.validating') : t('importExport.validate')}
            </button>
            {validationResult && (
              <div style={{ marginTop: 12, color: validationResult.includes('success') ? 'green' : 'red' }}>
                {validationResult}
              </div>
            )}
          </div>
        )}
        {activeStep === 3 && (
          <div>
            <strong>{t('importExport.commitImport')}</strong>
            <button
              onClick={async () => {
                setIsCommitting(true);
                try {
                  if (!importJobId) throw new Error('No import job');
                  const resp = await apiClient.post(`/import-export/imports/${importJobId}/commit`);
                  setCommitResult(resp.data.result || 'Import committed successfully!');
                } catch (err: Error | unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                  setCommitResult('Commit failed: ' + errorMessage);
                }
                setIsCommitting(false);
              }}
              disabled={isCommitting || !validationResult || !validationResult.includes('success') || !importJobId}
              style={{ marginTop: 8 }}
              data-testid="commit-btn"
            >
              {isCommitting ? t('importExport.committing') : t('importExport.commit')}
            </button>
            {commitResult && (
              <div style={{ marginTop: 12, color: commitResult.includes('success') ? 'green' : 'red' }}>{commitResult}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
