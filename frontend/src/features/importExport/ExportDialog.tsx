import React, { useState } from 'react';
import { useLanguage } from '@/LanguageContext';
import { useAsyncExport } from '@/hooks/useAsyncExport';

type ExportDialogProps = object;

const ExportDialog: React.FC<ExportDialogProps> = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<'students' | 'courses' | 'grades'>('students');

  const {
    exportJob,
    isCreating,
    isPolling,
    isComplete,
    isFailed,
    createExport,
    downloadExport,
    cancelExport,
  } = useAsyncExport();

  const handleStartExport = () => {
    createExport({
      export_type: exportType,
      file_format: 'xlsx',
      limit: 10000,
    });
  };

  const getStatusMessage = () => {
    if (!exportJob) return '';

    switch (exportJob.status) {
      case 'pending':
        return t('importExport.status.pending', 'Pending...');
      case 'processing':
        return t('importExport.status.processing', 'Processing...');
      case 'completed':
        return t('importExport.status.completed', `Completed: ${exportJob.total_records} records`);
      case 'failed':
        return t('importExport.status.failed', 'Export failed');
      default:
        return exportJob.status;
    }
  };

  return (
    <div>
      <button onClick={() => setOpen(true)} data-testid="open-export-dialog-btn">
        {t('importExport.openExportDialog')}
      </button>
      {open && (
        <div style={{
          border: '1px solid #aaa',
          padding: 16,
          background: '#fff',
          position: 'absolute',
          zIndex: 10,
          minWidth: 400,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 4,
        }}>
          <h3>{t('importExport.exportData')}</h3>

          {!exportJob ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  {t('importExport.exportType', 'Export Type')}
                </label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  disabled={isCreating}
                  style={{ width: '100%', padding: 8 }}
                >
                  <option value="students">{t('importExport.students', 'Students')}</option>
                  <option value="courses">{t('importExport.courses', 'Courses')}</option>
                  <option value="grades">{t('importExport.grades', 'Grades')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleStartExport}
                  disabled={isCreating}
                  style={{
                    flex: 1,
                    padding: 8,
                    backgroundColor: '#4F46E5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.6 : 1,
                  }}
                  data-testid="start-export-btn"
                >
                  {isCreating ? t('common.loading', 'Loading...') : t('importExport.startExport', 'Start Export')}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: 8,
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  data-testid="close-export-dialog-btn"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                padding: 12,
                backgroundColor: '#f3f4f6',
                borderRadius: 4,
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  {t('importExport.jobId', 'Job ID')}: {exportJob.id}
                </div>
                <div style={{ marginBottom: 8 }}>
                  {t('importExport.status', 'Status')}: <span style={{
                    fontWeight: 'bold',
                    color: exportJob.status === 'completed' ? '#10b981' :
                           exportJob.status === 'failed' ? '#ef4444' : '#f59e0b'
                  }}>
                    {getStatusMessage()}
                  </span>
                </div>
                {isPolling && (
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {t('importExport.pollingStatus', 'Polling for updates...')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {isComplete && (
                  <button
                    onClick={downloadExport}
                    style={{
                      flex: 1,
                      padding: 8,
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    data-testid="download-export-btn"
                  >
                    {t('importExport.download', 'Download')}
                  </button>
                )}
                {!isComplete && !isFailed && (
                  <button
                    onClick={cancelExport}
                    style={{
                      flex: 1,
                      padding: 8,
                      backgroundColor: '#f97316',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    data-testid="cancel-export-btn"
                  >
                    {t('importExport.cancel', 'Cancel')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    // Reset dialog state on close
                  }}
                  style={{
                    padding: 8,
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  data-testid="close-export-dialog-btn"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportDialog;

