import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/LanguageContext';
import { setServerUrl, setServerType, type ServerType } from '@/utils/serverUrl';

type Step = 'select' | 'configure';

// ── SVG icons ──────────────────────────────────────────────────────────────

function IconQnap() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="3" width="20" height="14" rx="2" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h2M6 11h2M10 7h2M10 11h2M16 7v4M18 9h-4" />
      <path strokeLinecap="round" d="M8 17v4M16 17v4M5 21h14" />
    </svg>
  );
}

function IconWifi() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

// ── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CardOption {
  type: ServerType;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
}

const CARD_OPTIONS: CardOption[] = [
  { type: 'qnap',   icon: <IconQnap />,  color: 'text-green-600 dark:text-green-400',  bgColor: 'bg-green-50 dark:bg-green-900/30' },
  { type: 'local',  icon: <IconWifi />,  color: 'text-blue-600 dark:text-blue-400',    bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  { type: 'cloud',  icon: <IconCloud />, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
  { type: 'custom', icon: <IconEdit />,  color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ServerSetupPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<ServerType | null>(null);

  // Per-type input state
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8000');
  const [domain, setDomain] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const [status, setStatus] = useState<'idle' | 'testing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const resetStatus = () => { setStatus('idle'); setErrorMsg(''); };

  const selectCard = (type: ServerType) => {
    setSelectedType(type);
    if (type === 'local') setPort('8000');
    resetStatus();
    setStep('configure');
  };

  const buildUrl = (): string => {
    const trimIp = ip.trim();
    switch (selectedType) {
      case 'qnap':
        return `http://${trimIp}:8080/api/v1`;
      case 'local':
        return `http://${trimIp}:${port.trim() || '8000'}/api/v1`;
      case 'cloud': {
        const d = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        return `https://${d}/api/v1`;
      }
      case 'custom':
        return customUrl.trim().replace(/\/+$/, '');
      default:
        return '';
    }
  };

  const isInputReady = (): boolean => {
    switch (selectedType) {
      case 'qnap':
      case 'local':
        return ip.trim().length > 0;
      case 'cloud':
        return domain.trim().length > 0;
      case 'custom':
        return customUrl.trim().length > 0;
      default:
        return false;
    }
  };

  const handleConnect = async () => {
    const url = buildUrl();
    if (!url.match(/^https?:\/\//i)) {
      setErrorMsg(t('common.serverSetup.errorInvalidUrl'));
      setStatus('error');
      return;
    }
    setStatus('testing');
    setErrorMsg('');
    try {
      const root = url.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
      const response = await fetch(`${root}/health`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setServerUrl(url);
      if (selectedType) setServerType(selectedType);
      navigate('/', { replace: true });
    } catch {
      setStatus('error');
      setErrorMsg(t('common.serverSetup.errorUnreachable'));
    }
  };

  // ── Selection screen ────────────────────────────────────────────────────

  if (step === 'select') {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-10 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {t('common.systemTitle')}
            </h1>
            <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
              {t('common.serverSetup.selectTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.serverSetup.selectSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CARD_OPTIONS.map(({ type, icon, color, bgColor }) => (
              <button
                key={type}
                onClick={() => selectCard(type)}
                className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-95 transition-all shadow-sm"
                type="button"
              >
                <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
                  {icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t(`common.serverSetup.${type}Title`)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {t(`common.serverSetup.${type}Subtitle`)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Configure screen ────────────────────────────────────────────────────

  const card = CARD_OPTIONS.find(c => c.type === selectedType)!;

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-10 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setStep('select'); resetStatus(); }}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            type="button"
            aria-label={t('common.serverSetup.back')}
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
            {card.icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t(`common.serverSetup.${selectedType}Title`)}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t(`common.serverSetup.${selectedType}Subtitle`)}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">

          {/* QNAP */}
          {selectedType === 'qnap' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.serverSetup.qnapLabel')}
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={ip}
                  onChange={e => { setIp(e.target.value); resetStatus(); }}
                  onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                  placeholder={t('common.serverSetup.qnapPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  disabled={status === 'testing'}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('common.serverSetup.qnapHint')}
                </p>
              </div>
              {ip.trim() && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                    → http://{ip.trim()}:8080/api/v1
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Local */}
          {selectedType === 'local' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.serverSetup.localLabel')}
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={ip}
                  onChange={e => { setIp(e.target.value); resetStatus(); }}
                  onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                  placeholder={t('common.serverSetup.localPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  disabled={status === 'testing'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.serverSetup.localPortLabel')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={port}
                  onChange={e => { setPort(e.target.value); resetStatus(); }}
                  onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                  placeholder={t('common.serverSetup.localPortPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  disabled={status === 'testing'}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('common.serverSetup.localHint')}
                </p>
              </div>
              {ip.trim() && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                    → http://{ip.trim()}:{port.trim() || '8000'}/api/v1
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cloud */}
          {selectedType === 'cloud' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.serverSetup.cloudLabel')}
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={domain}
                  onChange={e => { setDomain(e.target.value); resetStatus(); }}
                  onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                  placeholder={t('common.serverSetup.cloudPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  disabled={status === 'testing'}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('common.serverSetup.cloudHint')}
                </p>
              </div>
              {domain.trim() && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                    → https://{domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')}/api/v1
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Custom */}
          {selectedType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.serverSetup.urlLabel')}
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={e => { setCustomUrl(e.target.value); resetStatus(); }}
                onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                placeholder={t('common.serverSetup.urlPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                autoCapitalize="off" autoCorrect="off" spellCheck={false}
                disabled={status === 'testing'}
              />
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {t('common.serverSetup.hint')}
              </p>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Connect button */}
          <button
            onClick={() => void handleConnect()}
            disabled={status === 'testing' || !isInputReady()}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
            type="button"
          >
            {status === 'testing' && <Spinner />}
            {status === 'testing' ? t('common.serverSetup.connecting') : t('common.serverSetup.connect')}
          </button>
        </div>
      </div>
    </div>
  );
}
