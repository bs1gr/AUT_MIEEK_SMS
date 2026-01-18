
import React from 'react';
import { useImportExport } from './useImportExport';
import { useLanguage } from '@/LanguageContext';

const HistoryTable: React.FC = () => {
  const { importJobs, exportJobs, loading, error } = useImportExport();
  const { t } = useLanguage();

  return (
    <div data-testid="history-table-root">
      <h2>{t('importExport.history')}</h2>
      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>}
      {!loading && !error && (
        <>
          {importJobs.length === 0 && exportJobs.length === 0 ? (
            <p>{t('importExport.noJobsFound')}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('importExport.type')}</th>
                  <th>{t('importExport.status')}</th>
                  <th>{t('importExport.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {importJobs.map(job => (
                  <tr key={`import-${job.id}`}>
                    <td>{t('importExport.import')}</td>
                    <td>{job.status}</td>
                    <td>{job.createdAt}</td>
                  </tr>
                ))}
                {exportJobs.map(job => (
                  <tr key={`export-${job.id}`}>
                    <td>{t('importExport.export')}</td>
                    <td>{job.status}</td>
                    <td>{job.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryTable;
