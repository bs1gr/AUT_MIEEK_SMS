import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type HistoryTableProps = Record<string, unknown>;

interface ImportExportRecord {
  id: string;
  operation_type: 'import' | 'export';
  entity_type: 'students' | 'courses' | 'grades';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  record_count: number;
  created_at: string;
  created_by: string;
  error_message?: string;
  file_url?: string;
}

export const HistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ImportExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/import-export/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      const historyData = data.data?.history || data.history || [];
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOperationLabel = (type: string) => {
    return type === 'import' ? t('import', { ns: 'export' }) : t('export', { ns: 'export' });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t('loading', { ns: 'common' })}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{t('error', { ns: 'common' })}: {error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('noData', { ns: 'common' })}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('type', { ns: 'export' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('entity', { ns: 'export' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('status', { ns: 'common' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('records', { ns: 'export' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('date', { ns: 'common' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('user', { ns: 'common' })}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('actions', { ns: 'common' })}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {getOperationLabel(record.operation_type)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.entity_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.record_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(record.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.created_by}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {record.status === 'completed' && record.file_url && (
                  <a
                    href={record.file_url}
                    download
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t('download', { ns: 'common' })}
                  </a>
                )}
                {record.status === 'failed' && record.error_message && (
                  <button
                    className="text-red-600 hover:text-red-800 font-medium"
                    title={record.error_message}
                  >
                    {t('viewError', { ns: 'export' })}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;
