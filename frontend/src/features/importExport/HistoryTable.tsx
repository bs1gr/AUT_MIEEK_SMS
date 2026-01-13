
import React from 'react';
import { useImportExport } from './useImportExport';

const HistoryTable: React.FC = () => {
  const { importJobs, exportJobs, loading, error } = useImportExport();

  return (
    <div data-testid="history-table-root">
      <h2>Import/Export History</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && (
        <>
          {importJobs.length === 0 && exportJobs.length === 0 ? (
            <p>No import or export jobs found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {importJobs.map(job => (
                  <tr key={`import-${job.id}`}>
                    <td>Import</td>
                    <td>{job.status}</td>
                    <td>{job.createdAt}</td>
                  </tr>
                ))}
                {exportJobs.map(job => (
                  <tr key={`export-${job.id}`}>
                    <td>Export</td>
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
