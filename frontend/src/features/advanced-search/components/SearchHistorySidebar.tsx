import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchHistory } from '../hooks/useSearchHistory';

interface Props {
  onSelect: (query: string) => void;
  className?: string;
}

export const SearchHistorySidebar: React.FC<Props> = ({ onSelect, className }) => {
  const { t } = useTranslation('search');
  const { entries, removeEntry, clearAll } = useSearchHistory();

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t('search.history.title', { defaultValue: 'Search History' })}</h2>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {t('search.history.clear', { defaultValue: 'Clear All' })}
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-gray-500">{t('search.history.empty', { defaultValue: 'No recent searches.' })}</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelect(e.query)}
                  className="text-sm text-left text-gray-800 hover:text-blue-700"
                >
                  {e.query}
                </button>
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  {t('common.remove', { defaultValue: 'Remove' })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchHistorySidebar;
