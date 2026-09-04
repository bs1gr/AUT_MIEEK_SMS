import { Fragment, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AppearanceThemeVariant } from '@/contexts/AppearanceThemeContext';
import { AppearanceThemeSelectorWidget } from './AppearanceThemeSelector';
import type { HealthStatus, DevToolsPanelProps } from './DevToolsPanel';
import {
  BACKEND_PATH_PREFIX,
  BACKEND_PROTOCOL,
  FRONTEND_PROTOCOL,
  BACKEND_PORT_SEGMENT,
  BACKEND_PORT_LABEL,
  FRONTEND_PORT_SEGMENT,
  FRONTEND_PORT_LABEL,
  BACKEND_DISPLAY_ORIGIN,
  statusTone,
} from './devToolsBackendUrl';

export interface DevToolsOperationsMonitorProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  health: HealthStatus | null;
  uptimeSeconds: number | null;
  identityLabel: string | null;
  formatDateTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) => string;
  formatTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) => string;
  lastChecked: Date | null;
  variant: NonNullable<DevToolsPanelProps['variant']>;
  selectedTheme: AppearanceThemeVariant;
  setAppearanceTheme: (theme: AppearanceThemeVariant) => void;
  runHealthCheck: () => void;
  healthLoading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  intervalMs: number;
  setIntervalMs: (value: number) => void;
  subtleCardClass: string;
}

const DevToolsOperationsMonitor = ({
  t,
  health,
  uptimeSeconds,
  identityLabel,
  formatDateTime,
  formatTime,
  lastChecked,
  variant,
  selectedTheme,
  setAppearanceTheme,
  runHealthCheck,
  healthLoading,
  autoRefresh,
  setAutoRefresh,
  intervalMs,
  setIntervalMs,
  subtleCardClass,
}: DevToolsOperationsMonitorProps) => {
  const backendOrigin = BACKEND_DISPLAY_ORIGIN;
  const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const backendPathPrefix = BACKEND_PATH_PREFIX && BACKEND_PATH_PREFIX !== '/'
    ? (BACKEND_PATH_PREFIX.startsWith('/') ? BACKEND_PATH_PREFIX : `/${BACKEND_PATH_PREFIX}`)
    : '';
  const backendPortLabel = BACKEND_PORT_LABEL;
  const frontendPortLabel = FRONTEND_PORT_LABEL;

  const ipList = useMemo(() => {
    const ips = new Set<string>();
    const networkIps = Array.isArray(health?.network?.ips) ? health?.network?.ips : [];
    networkIps.forEach((ip) => {
      if (typeof ip === 'string' && ip.trim()) ips.add(ip.trim());
    });
    if (typeof window !== 'undefined') {
      [window.location.hostname, 'localhost', '127.0.0.1'].forEach((ip) => {
        if (ip) ips.add(ip);
      });
    }
    return Array.from(ips);
  }, [health]);

  const statusLabel = health?.status ?? t('unknown');
  const studentCount = health?.statistics?.students ?? health?.students_count;
  const courseCount = health?.statistics?.courses ?? health?.courses_count;
  const databaseName = health?.database ?? health?.db ?? t('unknown');
  const fallbackUptime = Number.isFinite(Number(health?.uptime)) ? Number(health?.uptime) : null;
  const displayUptimeSeconds = Number.isFinite(uptimeSeconds ?? NaN) ? uptimeSeconds : fallbackUptime;
  const uptimeDisplayValue = typeof displayUptimeSeconds === 'number' && Number.isFinite(displayUptimeSeconds)
    ? Math.max(0, Math.floor(displayUptimeSeconds))
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <div className={`px-4 py-3 text-white ${statusTone(health?.status)}`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{t('utils.operationsMonitor')}</div>
              <p className="text-xs text-white/80">{t('utils.operationsMonitorDescription')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {identityLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-white/90">
                  <span>{t('signedInAs')}</span>
                  <span className="font-semibold text-white">{identityLabel}</span>
                </span>
              )}
              <div className="flex items-center gap-2 text-white/85">
                {health?.version ? <span>{t('controlPanel.versionShort', { version: health.version })}</span> : null}
                  {health?.timestamp ? <span>{formatDateTime(health.timestamp)}</span> : null}
                  {lastChecked ? <span>({t('checkedAt')} {formatTime(lastChecked)})</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              <span className="text-white/90">{t('utils.frontend')} ({frontendOrigin})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="text-white/90">{t('utils.backend')} ({backendOrigin})</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {variant === 'standalone' && (
                <AppearanceThemeSelectorWidget
                  currentTheme={selectedTheme}
                  onThemeChange={setAppearanceTheme}
                />
              )}
              <button
                type="button"
                onClick={runHealthCheck}
                className="inline-flex items-center gap-2 rounded bg-white/20 px-3 py-1.5 text-xs font-medium transition hover:bg-white/30"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                {healthLoading ? t('loading') : t('utils.checkHealth')}
              </button>
              <label className="inline-flex items-center gap-1 text-xs text-white/90">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                  aria-label={t('toggleAutoRefresh')}
                />
                {t('autoRefresh')}
              </label>
              <select
                value={String(intervalMs)}
                onChange={(event) => setIntervalMs(Number(event.target.value))}
                className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-60"
                aria-label={t('autoRefreshInterval')}
                disabled={!autoRefresh}
              >
                <option className="text-black" value="3000">{t('controlPanel.timeoutSeconds', { s: 3 })}</option>
                <option className="text-black" value="5000">{t('controlPanel.timeoutSeconds', { s: 5 })}</option>
                <option className="text-black" value="10000">{t('controlPanel.timeoutSeconds', { s: 10 })}</option>
                <option className="text-black" value="30000">{t('controlPanel.timeoutSeconds', { s: 30 })}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 md:grid-cols-3">
        <div className={subtleCardClass}>
          <div className="text-xs text-slate-500 dark:text-gray-400">{t('database')}</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{databaseName}</div>
        </div>
        <div className={subtleCardClass}>
          <div className="text-xs text-slate-500 dark:text-gray-400">{t('students')}</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{studentCount ?? t('na')}</div>
        </div>
        <div className={subtleCardClass}>
          <div className="text-xs text-slate-500 dark:text-gray-400">{t('courses')}</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{courseCount ?? t('na')}</div>
        </div>
        {typeof uptimeDisplayValue === 'number' && (
          <div className={`${subtleCardClass} md:col-span-3`}>
            <div className="text-xs text-slate-500 dark:text-gray-400">{t('uptime')}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{t('controlPanel.timeoutSeconds', { s: uptimeDisplayValue })}</div>
          </div>
        )}
        <div className={`${subtleCardClass} md:col-span-3`}>
          <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{t('availableEndpoints')}</div>
          <div className="text-xs text-slate-500 dark:text-gray-400">{t('utils.quickLinks')}</div>
          {ipList.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">{t('noIpsAvailable')}</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {ipList.map((ip) => {
                const ipDisplay = ip.includes(':') ? `[${ip}]` : ip;
                const ipForUrl = ip.includes(':') && !ip.startsWith('[') ? `[${ip}]` : ip;
                const backendHostBase = `${BACKEND_PROTOCOL}//${ipForUrl}${BACKEND_PORT_SEGMENT}`;
                const frontendHostBase = `${FRONTEND_PROTOCOL}//${ipForUrl}${FRONTEND_PORT_SEGMENT}`;
                const buildBackendHref = (suffix = '') => {
                  const suffixPart = suffix ? (suffix.startsWith('/') ? suffix : `/${suffix}`) : '';
                  return `${backendHostBase}${backendPathPrefix}${suffixPart}`;
                };
                const backendDisplayLine = backendPathPrefix
                  ? `${ipDisplay}${BACKEND_PORT_SEGMENT}${backendPathPrefix}`
                  : `${ipDisplay}${BACKEND_PORT_SEGMENT}`;

                return (
                  <div key={ip} className="space-y-1">
                    <div className="font-mono text-xs text-slate-600 dark:text-gray-300">{backendDisplayLine}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {(
                        [
                          {
                            key: 'backend-root',
                            href: buildBackendHref(),
                            label: `${t('utils.backend')}${backendPortLabel}`,
                            className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                          },
                          {
                            key: 'backend-docs',
                            href: buildBackendHref('docs'),
                            label: `${t('utils.apiDocs')}${backendPortLabel}`,
                            className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                          },
                          {
                            key: 'backend-redoc',
                            href: buildBackendHref('redoc'),
                            label: `${t('utils.apiRedoc')}${backendPortLabel}`,
                            className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                          },
                          {
                            key: 'backend-openapi',
                            href: buildBackendHref('openapi.json'),
                            label: `${t('utils.openapiSpec')}${backendPortLabel}`,
                            className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                          },
                          {
                            key: 'backend-health',
                            href: buildBackendHref('health'),
                            label: `${t('utils.healthEndpoint')}${backendPortLabel}`,
                            className: 'text-sky-600 dark:text-sky-400 hover:underline',
                          },
                          {
                            key: 'backend-health-ready',
                            href: buildBackendHref('health/ready'),
                            label: `${t('utils.healthReadyEndpoint')}${backendPortLabel}`,
                            className: 'text-sky-600 dark:text-sky-400 hover:underline',
                          },
                          {
                            key: 'backend-health-live',
                            href: buildBackendHref('health/live'),
                            label: `${t('utils.healthLiveEndpoint')}${backendPortLabel}`,
                            className: 'text-sky-600 dark:text-sky-400 hover:underline',
                          },
                          {
                            key: 'frontend-root',
                            href: `${frontendHostBase}/`,
                            label: `${t('utils.frontend')}${frontendPortLabel}`,
                            className: 'text-emerald-700 dark:text-emerald-400 hover:underline',
                          },
                        ] as Array<{ key: string; href: string; label: string; className: string }>
                      ).map((link, index, array) => (
                        <Fragment key={link.key}>
                          <a
                            className={link.className}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.label}
                          </a>
                          {index < array.length - 1 ? (
                            <span className="text-slate-300 dark:text-gray-600">•</span>
                          ) : null}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={`${subtleCardClass} md:col-span-3`}>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">{t('utils.systemStatus')}</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{statusLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default DevToolsOperationsMonitor;
