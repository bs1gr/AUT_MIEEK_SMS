import React, { useEffect, useMemo, useState } from 'react';
import { RotateCw, Activity, AlertCircle, CheckCircle, Server } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { getHealthStatus, CONTROL_API_BASE, type HealthStatus } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';

// Base URL without /api/v1 for direct server endpoints
const metaEnv = import.meta.env as Partial<Record<string, string | undefined>>;
const RAW_API_BASE = (metaEnv?.VITE_API_URL?.trim()) ?? '';
const FALLBACK_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
const sanitizedApiBase = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

let resolvedBackendUrl: URL;
try {
  resolvedBackendUrl = new URL(sanitizedApiBase || '/', FALLBACK_ORIGIN);
} catch {
  resolvedBackendUrl = new URL(FALLBACK_ORIGIN);
}

// resolved backend origin available as resolvedBackendUrl if needed

const FALLBACK_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol || 'http:' : 'http:';
const FALLBACK_PORT = typeof window !== 'undefined' ? window.location.port || '' : '';

const BACKEND_PROTOCOL = resolvedBackendUrl.protocol || FALLBACK_PROTOCOL || 'http:';
const BACKEND_PORT = resolvedBackendUrl.port || FALLBACK_PORT || (BACKEND_PROTOCOL === 'https:' ? '443' : '80');

const CONTROL_RESTART_ENDPOINT = `${CONTROL_API_BASE.replace(/\/$/, '')}/restart`;

const FRONTEND_PROTOCOL = FALLBACK_PROTOCOL || 'http:';
const FRONTEND_PORT = FALLBACK_PORT || (FRONTEND_PROTOCOL === 'https:' ? '443' : '80');

type ServiceState = 'online' | 'offline' | 'checking';

interface ServerStatus {
  backend: 'online' | 'offline' | 'checking';
  frontend: 'online' | 'offline' | 'checking';
  uptime?: number;
  lastCheck: Date;
  error?: string;
}

export interface ServerStatusSummary {
  backend: ServiceState;
  frontend: ServiceState;
  docker: 'online' | 'offline' | 'unknown';
  environment: string | null;
  lastCheckedAt: string | null;
  uptime?: number;
}

interface ServerControlProps {
  onStatusSummary?: (summary: ServerStatusSummary) => void;
}

const ServerControl: React.FC<ServerControlProps> = ({ onStatusSummary }) => {
  // ...existing code...
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatDateTime, formatTime } = useDateTimeFormatter();

  const [status, setStatus] = useState<ServerStatus>({
    backend: 'checking',
    frontend: 'checking',
    lastCheck: new Date()
  });
  const [currentUptime, setCurrentUptime] = useState<number>(0);
  const [isRestarting, setIsRestarting] = useState(false);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  // Startup grace period and retry backoff to avoid scary offline message during boot
  const [startupGraceUntil] = useState<number>(() => Date.now() + 3000); // 3s grace (reduced from 12s)
  const [retryDelay, setRetryDelay] = useState<number>(1000); // start at 1s, backoff to 4s max
  const [didShowOffline, setDidShowOffline] = useState<boolean>(false);
  const runningInsideContainer = (healthData?.environment || '').toLowerCase() === 'docker';
  const restartSupported = !runningInsideContainer && status.backend === 'online';

  const identityLabel = useMemo(() => {
    if (!user) {
      return null;
    }
    if (typeof user.email === 'string' && user.email.includes('@')) {
      return user.email;
    }
    if (typeof user.full_name === 'string') {
      const trimmed = user.full_name.trim();
      if (trimmed && /\s/.test(trimmed) && !/password/i.test(trimmed)) {
        return trimmed;
      }
    }
    return null;
  }, [user]);

  const derivedDockerStatus = useMemo<'online' | 'offline' | 'unknown'>(() => {
    const normalize = (value?: string | null) => {
      if (!value) return undefined;
      const lower = value.toLowerCase();
      if (['online', 'ready', 'running', 'healthy', 'active'].includes(lower)) return 'online';
      if (['offline', 'stopped', 'error', 'unhealthy', 'not running'].includes(lower)) return 'offline';
      return undefined;
    };

    const direct = normalize(typeof healthData?.docker === 'string' ? healthData.docker : undefined);
    if (direct) return direct;

    const env = typeof healthData?.environment === 'string' ? healthData.environment.toLowerCase() : undefined;
    if (env === 'docker') return 'online';
    if (env === 'native') return 'offline';

    const dockerCheck = (healthData?.checks as Record<string, unknown> | undefined)?.['docker'];
    if (dockerCheck && typeof dockerCheck === 'object') {
      const status = normalize((dockerCheck as { status?: string | null }).status ?? undefined);
      if (status) return status;
      const details = (dockerCheck as { details?: { running?: boolean } | null }).details;
      if (details && typeof details === 'object') {
        const running = (details as { running?: boolean }).running;
        if (running === true) return 'online';
        if (running === false) return 'offline';
      }
    }

    return 'unknown';
  }, [healthData]);

  useEffect(() => {
    if (!onStatusSummary) return;
    onStatusSummary({
      backend: status.backend,
      frontend: status.frontend,
      docker: derivedDockerStatus,
      environment: healthData?.environment ?? null,
      lastCheckedAt,
      uptime: status.uptime,
    });
  }, [onStatusSummary, status.backend, status.frontend, status.uptime, derivedDockerStatus, healthData?.environment, lastCheckedAt]);

  // Splash/loading state (must be after status is declared)
  const isLoading = status.backend === 'checking' || status.frontend === 'checking';
  const isOffline = !isRestarting && (status.backend === 'offline' || status.frontend === 'offline');

  // Check server status periodically

  // Sync uptime from server when backend comes online or uptime changes significantly
  useEffect(() => {
    if (status.backend === 'online' && status.uptime !== undefined) {
      // Only update if uptime is significantly different (more than 5 seconds drift)
      // or if we're transitioning from offline to online
      if (currentUptime === 0 || Math.abs(currentUptime - status.uptime) > 5) {
        setCurrentUptime(status.uptime);
      }
    } else if (status.backend !== 'online') {
      setCurrentUptime(0);
    }
  }, [status.backend, status.uptime, currentUptime]);

  // Update uptime counter every second
  useEffect(() => {
    if (status.backend === 'online') {
      const uptimeInterval = setInterval(() => {
        setCurrentUptime(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(uptimeInterval);
      };
    }
  }, [status.backend]);


  const checkStatus = React.useCallback(async () => {
    try {
      const data = await getHealthStatus();

      let backendStatus: 'online' | 'offline' = 'offline';
      let uptime = 0;
      const error = '';
      let health: HealthStatus | null = null;

      const rawUptime = (data as { uptime_seconds?: unknown; uptime?: unknown })?.uptime_seconds ?? (data as { uptime?: unknown })?.uptime;
      if (typeof rawUptime === 'number' && Number.isFinite(rawUptime)) {
        uptime = Math.max(0, rawUptime);
      } else if (typeof rawUptime === 'string') {
        const parsed = Number.parseFloat(rawUptime);
        uptime = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      } else {
        uptime = 0;
      }

      backendStatus = 'online';
      health = data;

      // Check frontend status (self-check - if this code is running, frontend is online)
      const frontendStatus: 'online' | 'offline' = 'online';

      setStatus({
        backend: backendStatus,
        frontend: frontendStatus,
        uptime,
        lastCheck: new Date(),
        error: error || undefined
      });
      setHealthData(health);
      setLastCheckedAt(formatTime(new Date()));
      // Reset any offline indicators/backoff after successful check
      setDidShowOffline(false);
      setRetryDelay(1000);
    } catch (error) {
      const now = Date.now();
      const withinGrace = now < startupGraceUntil;
      if (withinGrace && !didShowOffline) {
        // During grace period, keep showing checking state and retry soon, suppress error text
        setStatus(prev => ({
          ...prev,
          backend: 'checking',
          frontend: 'online',
          lastCheck: new Date(),
          error: undefined,
        }));
        setHealthData(null);
        setLastCheckedAt(formatTime(new Date()));
        // Schedule a retry with exponential backoff up to 4s
        const nextDelay = Math.min(retryDelay * 2, 4000);
        setTimeout(() => {
          checkStatus();
        }, retryDelay);
        setRetryDelay(nextDelay);
      } else {
        // After grace period, show offline but keep polling via existing timers
        setStatus(prev => ({
          ...prev,
          backend: 'offline',
          frontend: 'online', // Frontend is online if this code is running
          lastCheck: new Date(),
          error: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
        setHealthData(null);
        setLastCheckedAt(formatTime(new Date()));
        setDidShowOffline(true);
      }
    }
  }, [startupGraceUntil, didShowOffline, retryDelay]);

  // Auto-refresh for health details
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      checkStatus();
    }, Math.max(2000, intervalMs));
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs, checkStatus]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (isRestarting && status.backend === 'online') {
      setIsRestarting(false);
    }
  }, [isRestarting, status.backend]);

  const handleRestart = async () => {
    if (healthData?.environment === 'docker') {
      setStatus(prev => ({
        ...prev,
        error: t('restartUnsupported') || 'Restart is only available in native mode. Use host scripts (DOCKER.ps1 or NATIVE.ps1 (depending on mode) -Restart) inside Docker.',
      }));
      return;
    }

    setIsRestarting(true);

    try {
      const restartResponse = await fetch(CONTROL_RESTART_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(8000),
      });

      if (!restartResponse.ok) {
        const payload = await restartResponse.json().catch(() => ({} as Record<string, unknown>));
        const detail = (payload?.detail ?? null) as Record<string, unknown> | string | null;
        const detailMessage = typeof detail === 'string'
          ? detail
          : (typeof detail === 'object' && detail !== null ? (detail.message as string | undefined) : undefined);
        const detailHint = typeof detail === 'object' && detail ? (detail.hint as string | undefined) : undefined;

        let message =
          (payload?.message as string) ||
          detailMessage ||
          restartResponse.statusText ||
          (t('restartFailed') || 'Restart failed');

        if (restartResponse.status === 404) {
          message = detailMessage || detailHint || (t('restartEndpointDisabled') || 'Control API is disabled. Set ENABLE_CONTROL_API=1 in backend/.env and restart backend.');
        } else if (restartResponse.status === 403) {
          message = detailMessage || (t('restartTokenRequired') || 'Restart denied. Provide ADMIN_SHUTDOWN_TOKEN or connect via localhost.');
        } else if (restartResponse.status === 400) {
          message = detailMessage || (t('restartUnsupported') || message);
        }

        if (restartResponse.status === 404 && !detailMessage) {
          try {
            const helperResponse = await fetch(CONTROL_RESTART_ENDPOINT, { method: 'GET', credentials: 'include' });
            if (helperResponse.ok) {
              const helperPayload = await helperResponse.json().catch(() => ({} as Record<string, unknown>));
              const helperMessage = (helperPayload?.message as string) || (helperPayload?.details as { hint?: string })?.hint;
              if (helperMessage) {
                message = helperMessage;
              }
            }
          } catch (helperError) {
            console.warn('Restart helper lookup failed', helperError);
          }
        }
        setStatus(prev => ({
          ...prev,
          error: message,
        }));
        setTimeout(() => {
          checkStatus();
        }, 3000);
        setIsRestarting(false);
        return;
      }

      // Restart scheduled — show checking state and poll
      setStatus(prev => ({
        ...prev,
        backend: 'checking',
        error: undefined,
      }));

      setTimeout(() => {
        checkStatus();
      }, 4000);
    } catch (error) {
      console.warn('Restart API failed, using page reload:', error);
      setStatus(prev => ({
        ...prev,
        backend: 'checking',
        error: error instanceof Error ? error.message : (t('restartFailed') || 'Restart failed'),
      }));
      setTimeout(() => {
        checkStatus();
      }, 4000);
      setIsRestarting(false);
      return;
    }
  };

  const getStatusIcon = (service: 'backend' | 'frontend') => {
    const serviceStatus = status[service];
    switch (serviceStatus) {
      case 'online': return <CheckCircle size={14} />;
      case 'offline': return <AlertCircle size={14} />;
      case 'checking': return <Activity size={14} className="animate-pulse" />;
      default: return <Activity size={14} />;
    }
  };

  const getOverallStatus = () => {
    if (status.backend === 'online' && status.frontend === 'online') return t('systemOnline') || 'System Online';
    if (status.backend === 'offline' || status.frontend === 'offline') return t('systemOffline') || 'System Offline';
    return t('checking') || 'Checking...';
  };

  // Show splash/loading screen while checking status
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Activity size={48} className="animate-spin text-indigo-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('loadingSystem')}</h2>
        <p className="text-gray-500">{t('checking')}</p>
      </div>
    );
  }

  if (isRestarting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg">
        <div className="animate-spin">
          <RotateCw size={16} />
        </div>
        <span className="text-sm font-medium text-blue-800">{t('restart')}...</span>
      </div>
    );
  }

  // Show friendly offline message if backend or frontend is offline
  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 mb-2">{t('systemOffline')}</h2>
        <p className="text-gray-500">{t('checking')}</p>
      </div>
    );
  }

  const formatServiceState = (value: ServiceState) => {
    if (value === 'online') return t('system.statusOnline');
    if (value === 'offline') return t('system.statusOffline');
    return t('system.statusChecking');
  };

  const statusChipTone = (state: ServiceState | 'unknown') => {
    switch (state) {
      case 'online':
        return 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50';
      case 'offline':
        return 'bg-rose-500/20 border-rose-300/40 text-rose-50';
      case 'checking':
      case 'unknown':
      default:
        return 'bg-amber-500/20 border-amber-300/40 text-amber-50';
    }
  };

  const renderActiveEndpointGrid = () => {
    const frontendPort = FRONTEND_PORT;
    const rawIps: string[] = Array.isArray(healthData?.network?.ips) ? healthData.network.ips : [];

    const activeIps = rawIps.filter((ip) => {
      if (!ip || typeof ip !== 'string') return false;
      if (ip === 'localhost' || ip === '127.0.0.1') return true;
      if (typeof window !== 'undefined' && ip === window.location.hostname) return true;
      if (ip.startsWith('169.254.')) return false;
      return true;
    });

    const uniqueIps = new Set<string>(activeIps);
    if (typeof window !== 'undefined' && window.location.hostname && !uniqueIps.has(window.location.hostname)) {
      uniqueIps.add(window.location.hostname);
    }

    const ips = Array.from(uniqueIps);
    if (!ips.length) {
      return <div className="text-xs text-gray-600">{t('noActiveIps')}</div>;
    }

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ips.map((ip) => {
          const isIpv6 = ip.includes(':');
          const ipForUrl = isIpv6 && !ip.startsWith('[') ? `[${ip}]` : ip;
          const backendPortSegment = BACKEND_PORT ? `:${BACKEND_PORT}` : '';
          const frontendPortSegment = frontendPort ? `:${frontendPort}` : '';
          const backendBase = `${BACKEND_PROTOCOL}//${ipForUrl}${backendPortSegment}`;
          const frontendBase = `${FRONTEND_PROTOCOL}//${ipForUrl}${frontendPortSegment}`;
          const ipDisplay = isIpv6 ? `[${ip}]` : ip;
          const backendDisplayLine = backendPortSegment ? `${ipDisplay}${backendPortSegment}` : ipDisplay;

          return (
            <div key={ip} className="text-xs">
              <div className="font-mono text-gray-700 mb-1">{backendDisplayLine}</div>
              <div className="flex flex-wrap gap-2">
                <a className="text-indigo-600 hover:underline" href={`${backendBase}/`} target="_blank" rel="noopener noreferrer">{`${t('utils.backend')} (${BACKEND_PORT})`}</a>
                <span className="text-gray-400">|</span>
                <a className="text-indigo-600 hover:underline" href={`${backendBase}/docs`} target="_blank" rel="noopener noreferrer">{`${t('utils.apiDocs')} (${BACKEND_PORT})`}</a>
                <a className="text-indigo-600 hover:underline" href={`${backendBase}/redoc`} target="_blank" rel="noopener noreferrer">{`${t('utils.apiRedoc')} (${BACKEND_PORT})`}</a>
                <a className="text-indigo-600 hover:underline" href={`${backendBase}/health`} target="_blank" rel="noopener noreferrer">{`${t('utils.healthEndpoint')} (${BACKEND_PORT})`}</a>
                <span className="text-gray-400">|</span>
                <a className="text-emerald-700 hover:underline" href={`${frontendBase}/`} target="_blank" rel="noopener noreferrer">{`${t('utils.frontend')} (${frontendPort})`}</a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const frontendHostLabel = typeof window !== 'undefined'
    ? `${window.location.hostname}:${window.location.port || '5173'}`
    : t('unknown');

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="px-4 py-3 text-white bg-slate-700">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="font-semibold">{t('systemHealth')}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {identityLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-white/90" data-testid="server-control-identity">
                  <span>{t('signedInAs')}</span>
                  <span className="font-semibold text-white">{identityLabel}</span>
                </span>
              )}
              <div className="flex items-center gap-2 text-white/90">
                {healthData?.version ? <span>{t('controlPanel.versionShort', { version: healthData.version })}</span> : null}
                {healthData?.timestamp ? <span>{formatDateTime(healthData.timestamp)}</span> : null}
                {lastCheckedAt ? <span>({t('checkedAt')} {lastCheckedAt})</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusChipTone(status.backend)}`}>
              {getStatusIcon('backend')}
              <span>{t('utils.backend')}</span>
              <span className="font-semibold">{formatServiceState(status.backend)}</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusChipTone(status.frontend)}`}>
              {getStatusIcon('frontend')}
              <span>{t('utils.frontend')}</span>
              <span className="font-semibold">{formatServiceState(status.frontend)}</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusChipTone(derivedDockerStatus)}`}>
              <Server size={14} />
              <span>{t('docker')}</span>
              <span className="font-semibold">
                {derivedDockerStatus === 'online'
                  ? (healthData?.environment === 'docker' ? t('environmentDocker') : t('system.statusOnline'))
                  : derivedDockerStatus === 'offline'
                    ? t('system.statusOffline')
                    : t('system.statusChecking')}
              </span>
            </div>
            {healthData?.environment && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                <span>{t('runningIn')}:</span>
                <span>{healthData.environment === 'docker' ? t('dockerContainer') : t('nativeMode')}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <span>{getOverallStatus()}</span>
              {status.backend === 'online' && currentUptime > 0 && (
                <span className="text-white/70">
                  • {t('controlPanel.uptimeFormatShort', {
                    h: Math.floor(currentUptime / 3600),
                    m: Math.floor((currentUptime % 3600) / 60),
                    s: currentUptime % 60,
                  })}
                </span>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {restartSupported && (
                <button
                  onClick={handleRestart}
                  disabled={isRestarting}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('restart')}
                >
                  <RotateCw size={14} className={isRestarting ? 'animate-spin' : ''} />
                  <span>{t('restart')}</span>
                </button>
              )}
              <label className="inline-flex items-center gap-1 text-xs text-white/90">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  aria-label={t('toggleAutoRefresh')}
                />
                {t('autoRefresh')}
              </label>
              <select
                value={String(intervalMs)}
                onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))}
                className="bg-white/20 text-white rounded px-2 py-1 text-xs"
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
          {status.error && (
            <div className="text-xs text-rose-200">
              {t('error') || 'Error'}: {typeof status.error === 'string' ? status.error : JSON.stringify(status.error)}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 bg-white p-4 md:grid-cols-3">
        {status.backend === 'online' && currentUptime > 0 && (
          <div className="md:col-span-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 text-sm font-semibold text-indigo-900">{t('uptime')}</div>
                <div className="text-4xl font-bold text-indigo-600">
                  {t('controlPanel.uptimeFormatShort', {
                    h: Math.floor(currentUptime / 3600),
                    m: Math.floor((currentUptime % 3600) / 60),
                    s: currentUptime % 60,
                  })}
                </div>
              </div>
              <div className="text-6xl opacity-20">{t('timerEmoji')}</div>
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">{t('database')}</div>
          <div className="text-sm font-semibold">{healthData?.database || healthData?.db || t('unknown')}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">{t('students')}</div>
          <div className="text-sm font-semibold">{healthData?.statistics?.students ?? healthData?.students_count ?? t('na')}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">{t('courses')}</div>
          <div className="text-sm font-semibold">{healthData?.statistics?.courses ?? healthData?.courses_count ?? t('na')}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">{t('utils.frontend')}</div>
          <div className="text-sm font-semibold">{frontendHostLabel}</div>
        </div>

        <div className="md:col-span-3 rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">{t('availableEndpoints')}</div>
          {renderActiveEndpointGrid()}
        </div>

        <div className="md:col-span-3 rounded-lg border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
          <div className="space-y-1 text-center">
            <div className="text-sm font-semibold text-indigo-900">{t('footerTitle')}</div>
            <div className="text-xs text-indigo-700">{t('footerDeveloper')}</div>
            <div className="text-xs text-indigo-600">{t('footerCopyright')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerControl;
