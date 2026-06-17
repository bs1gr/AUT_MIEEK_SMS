import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/LanguageContext';
import { setServerUrl } from '@/utils/serverUrl';

export default function ServerSetupPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed.match(/^https?:\/\//i)) {
      setErrorMsg(t('common.serverSetup.errorInvalidUrl'));
      setStatus('error');
      return;
    }

    setStatus('testing');
    setErrorMsg('');

    try {
      const root = trimmed.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
      const response = await fetch(`${root}/health`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setServerUrl(trimmed);
      navigate('/', { replace: true });
    } catch {
      setStatus('error');
      setErrorMsg(t('common.serverSetup.errorUnreachable'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 mb-2">
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('common.systemTitle')}
          </h1>
          <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {t('common.serverSetup.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('common.serverSetup.subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.serverSetup.urlLabel')}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setStatus('idle'); setErrorMsg(''); }}
              onKeyDown={(e) => e.key === 'Enter' && void handleConnect()}
              placeholder={t('common.serverSetup.urlPlaceholder')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              disabled={status === 'testing'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('common.serverSetup.hint')}
            </p>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            onClick={() => void handleConnect()}
            disabled={status === 'testing' || !url.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            {status === 'testing' && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === 'testing' ? t('common.serverSetup.connecting') : t('common.serverSetup.connect')}
          </button>
        </div>
      </div>
    </div>
  );
}
