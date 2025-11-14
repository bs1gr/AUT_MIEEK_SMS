import React, { useEffect, useMemo, useState } from 'react';
import { RotateCw, Activity, AlertCircle, CheckCircle, Server, Monitor } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { getHealthStatus } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';

// Base URL without /api/v1 for direct server endpoints
// @ts-ignore
const RAW_API_BASE = ((import.meta as any).env?.VITE_API_URL?.trim()) ?? '';
const FALLBACK_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
const sanitizedApiBase = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

let resolvedBackendUrl: URL;
try {
  resolvedBackendUrl = new URL(sanitizedApiBase || '/', FALLBACK_ORIGIN);
} catch {
  resolvedBackendUrl = new URL(FALLBACK_ORIGIN);
}

const resolvedBackendPath = resolvedBackendUrl.pathname?.replace(/\/$/, '') || '';
const API_BASE_URL = `${resolvedBackendUrl.origin}${resolvedBackendPath}`;

const FALLBACK_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol || 'http:' : 'http:';
const FALLBACK_PORT = typeof window !== 'undefined' ? window.location.port || '' : '';

const BACKEND_PROTOCOL = resolvedBackendUrl.protocol || FALLBACK_PROTOCOL || 'http:';
const BACKEND_PORT = resolvedBackendUrl.port || FALLBACK_PORT || (BACKEND_PROTOCOL === 'https:' ? '443' : '80');

const FRONTEND_PROTOCOL = FALLBACK_PROTOCOL || 'http:';
const FRONTEND_PORT = FALLBACK_PORT || (FRONTEND_PROTOCOL === 'https:' ? '443' : '80');

interface ServerStatus {
  backend: 'online' | 'offline' | 'checking';
  frontend: 'online' | 'offline' | 'checking';
  uptime?: number;
  lastCheck: Date;
  error?: string;
}

const ServerControl: React.FC = () => {
  // ...existing code...
  const { t } = useLanguage() as any;
  const { user } = useAuth();

  const [status, setStatus] = useState<ServerStatus>({
    backend: 'checking',
    frontend: 'checking',
    lastCheck: new Date()
  });
  const [currentUptime, setCurrentUptime] = useState<number>(0);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  // Startup grace period and retry backoff to avoid scary offline message during boot
  const [startupGraceUntil] = useState<number>(() => Date.now() + 12000); // 12s grace
  const [retryDelay, setRetryDelay] = useState<number>(1000); // start at 1s, backoff to 4s max
  const [didShowOffline, setDidShowOffline] = useState<boolean>(false);

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

  // Splash/loading state (must be after status is declared)
  const isLoading = status.backend === 'checking' || status.frontend === 'checking';
  const isOffline = status.backend === 'offline' || status.frontend === 'offline';

  // Check server status periodically
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

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
  }, [status.backend, status.uptime]);

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

  const checkStatus = async () => {
    try {
      const data = await getHealthStatus();

      let backendStatus: 'online' | 'offline' = 'offline';
      let uptime = 0;
      let error = '';
      let health: any = null;

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
      setLastCheckedAt(new Date().toLocaleTimeString());
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
        setLastCheckedAt(new Date().toLocaleTimeString());
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
        setLastCheckedAt(new Date().toLocaleTimeString());
        setDidShowOffline(true);
      }
    }
  };

  // Auto-refresh for health details
  useEffect(() => {
    if (!autoRefresh || !showDetails) return;
    const id = setInterval(() => {
      checkStatus();
    }, Math.max(2000, intervalMs));
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs, showDetails]);

  const handleRestart = async () => {
    setIsRestarting(true);

    try {
      // Try to restart backend via API
      const restartResponse = await fetch(`${API_BASE_URL}/control/api/start`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000)
      });

      if (restartResponse.ok) {
        // Backend restart initiated, reload frontend
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Fallback: just reload the page
        window.location.reload();
      }
    } catch (error) {
      // Fallback: just reload the page
      console.warn('Restart API failed, using page reload:', error);
      window.location.reload();
    }
  };

  const getStatusColor = (service: 'backend' | 'frontend') => {
    const serviceStatus = status[service];
    switch (serviceStatus) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-red-500';
      case 'checking': return 'text-yellow-500';
      default: return 'text-gray-500';
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
    if (status.backend === 'online' && status.frontend === 'online') return t('controlPanel.systemOnline') || 'System Online';
    if (status.backend === 'offline' || status.frontend === 'offline') return t('controlPanel.systemOffline') || 'System Offline';
    return t('controlPanel.checking') || 'Checking...';
  };

  // Show splash/loading screen while checking status
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Activity size={48} className="animate-spin text-indigo-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('controlPanel.loadingSystem')}</h2>
        <p className="text-gray-500">{t('controlPanel.checking')}</p>
      </div>
    );
  }

  // Show friendly offline message if backend or frontend is offline
  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 mb-2">{t('controlPanel.systemOffline')}</h2>
        <p className="text-gray-500">{t('controlPanel.checking')}</p>
      </div>
    );
  }

  if (isRestarting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg">
        <div className="animate-spin">
          <RotateCw size={16} />
        </div>
        <span className="text-sm font-medium text-blue-800">{t('controlPanel.restart')}...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Enhanced Server Status Display */}
      <div
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => { setShowDetails((s) => !s); if (!healthData) checkStatus(); }}
        title={t('controlPanel.toggleDetailsRefresh')}
      >

        {/* Backend Status */}
        <div className="flex items-center space-x-2">
          <Server size={14} className="text-gray-500" />
          <div className={getStatusColor('backend')}>
            {getStatusIcon('backend')}
          </div>
          <span className="text-xs font-medium text-gray-700">{t('utils.backend')}</span>
        </div>

        {/* Frontend Status */}
        <div className="flex items-center space-x-2">
          <Monitor size={14} className="text-gray-500" />
          <div className="text-green-500">
            <CheckCircle size={14} />
          </div>
          <span className="text-xs font-medium text-gray-700">{t('utils.frontend')}</span>
          <span className="text-xs font-mono text-gray-500 ml-2">{t('active')}</span>
        </div>

        {/* Docker Status */}
        <div className="flex items-center space-x-2">
          <Server size={14} className="text-gray-500" />
          <div className={healthData?.docker === 'online' ? 'text-green-500' : healthData?.docker === 'offline' ? 'text-red-500' : 'text-gray-500'}>
            {healthData?.docker === 'online' ? <CheckCircle size={14} /> : healthData?.docker === 'offline' ? <AlertCircle size={14} /> : <Activity size={14} />}
          </div>
          <span className="text-xs font-medium text-gray-700">{t('controlPanel.docker')}</span>
          <span className="text-xs font-mono text-gray-500 ml-2">
            {healthData?.docker === 'online' ? t('controlPanel.ready') : healthData?.docker === 'offline' ? t('controlPanel.notRunning') : t('controlPanel.unknown')}
          </span>
        </div>

        {/* Environment Info */}
        {healthData?.environment && (
          <div className="flex items-center space-x-2 px-2 py-1 bg-indigo-50 rounded">
            <span className="text-xs font-medium text-indigo-700">{t('controlPanel.runningIn')}:</span>
            <span className="text-xs font-semibold text-indigo-900">
              {healthData.environment === 'docker' ? t('controlPanel.dockerContainer') : t('controlPanel.nativeMode')}
            </span>
          </div>
        )}

        {/* Overall Status & Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">
              {getOverallStatus()}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleRestart();
              }}
              disabled={isRestarting || status.backend !== 'online'}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={status.backend !== 'online' ? t('restartDisabled') : t('controlPanel.restart')}
            >
              <RotateCw size={14} className={isRestarting ? 'animate-spin' : ''} />
              <span>{t('controlPanel.restart')}</span>
            </button>
          </div>
          {status.backend === 'online' && currentUptime > 0 && (
            <span className="text-xs text-gray-500">
              {t('uptime')}: {Math.floor(currentUptime / 3600)}h {Math.floor((currentUptime % 3600) / 60)}m {currentUptime % 60}s
            </span>
          )}
          {status.error && (
            <span className="text-xs text-red-500 truncate max-w-32" title={status.error}>
              {t('error') || 'Error'}: {status.error.substring(0, 20)}...
            </span>
          )}
        </div>
      </div>

      {/* Detailed System Health (toggle) */}
      {showDetails && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-white bg-slate-700">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="font-semibold">{t('controlPanel.systemHealth')}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {identityLabel && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-white/90" data-testid="server-control-identity">
                      <span>{t('controlPanel.signedInAs')}</span>
                      <span className="font-semibold text-white">{identityLabel}</span>
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-white/90">
                    {healthData?.version ? <span>v{healthData.version}</span> : null}
                    {healthData?.timestamp ? <span>{new Date(healthData.timestamp).toLocaleString()}</span> : null}
                    {lastCheckedAt ? <span>({t('controlPanel.checkedAt')} {lastCheckedAt})</span> : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* LEDs */}
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></span>
                  <span className="text-white/90 text-xs">{t('utils.frontend')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'inline-block w-2.5 h-2.5 rounded-full ' +
                      (healthData?.status === 'healthy'
                        ? 'bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                        : status.backend === 'checking'
                        ? 'bg-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.9)]'
                        : 'bg-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.9)]')
                    }
                  ></span>
                  <span className="text-white/90 text-xs">{t('utils.backend')}</span>
                </div>
                {/* Environment Badge */}
                {healthData?.environment && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-white/10 rounded">
                    <span className="text-white/90 text-xs font-semibold">
                      {healthData.environment === 'docker' ? '🐳 Docker' : '💻 ' + t('controlPanel.nativeMode')}
                    </span>
                  </div>
                )}
                {/* Controls */}
                <div className="ml-auto flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 text-xs text-white/90">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      aria-label={t('controlPanel.toggleAutoRefresh')}
                    />
                    {t('controlPanel.autoRefresh')}
                  </label>
                  <select
                    value={String(intervalMs)}
                    onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))}
                    className="bg-white/20 text-white rounded px-2 py-1 text-xs"
                    aria-label={t('controlPanel.autoRefreshInterval')}
                    disabled={!autoRefresh}
                  >
                    <option className="text-black" value="3000">3s</option>
                    <option className="text-black" value="5000">5s</option>
                    <option className="text-black" value="10000">10s</option>
                    <option className="text-black" value="30000">30s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white">
            {/* Prominent Uptime Widget */}
            {status.backend === 'online' && currentUptime > 0 && (
              <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-indigo-900 mb-2">{t('controlPanel.uptime')}</div>
                    <div className="text-4xl font-bold text-indigo-600">
                      {Math.floor(currentUptime / 3600)}h {Math.floor((currentUptime % 3600) / 60)}m {currentUptime % 60}s
                    </div>
                  </div>
                  <div className="text-6xl opacity-20">⏱️</div>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">{t('controlPanel.database')}</div>
              <div className="text-sm font-semibold">{healthData?.database || healthData?.db || t('controlPanel.unknown')}</div>
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
              <div className="text-sm font-semibold">{window.location.hostname}:{window.location.port || '5173'}</div>
            </div>

            {/* Available Endpoints - Only Active IPs */}
            <div className="rounded-lg border p-3 md:col-span-3">
              <div className="text-sm font-semibold mb-2">{t('controlPanel.availableEndpoints')}</div>
              {(() => {
                const frontendPort = FRONTEND_PORT;
                const rawIps: string[] = Array.isArray(healthData?.network?.ips) ? healthData.network.ips : [];

                // Filter for active IPs: localhost, current hostname, and non-169.254 (APIPA) addresses
                const activeIps = rawIps.filter(ip => {
                  if (!ip || typeof ip !== 'string') return false;
                  // Keep localhost
                  if (ip === 'localhost' || ip === '127.0.0.1') return true;
                  // Keep current hostname
                  if (ip === window.location.hostname) return true;
                  // Filter out APIPA addresses (169.254.x.x)
                  if (ip.startsWith('169.254.')) return false;
                  // Keep all other IPs (likely active network interfaces)
                  return true;
                });

                // Remove duplicates and add current host if not present
                const set = new Set<string>(activeIps);
                if (window.location.hostname && !set.has(window.location.hostname)) {
                  set.add(window.location.hostname);
                }

                const ips = Array.from(set);
                if (!ips.length) return <div className="text-xs text-gray-600">{t('controlPanel.noActiveIps')}</div>;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ips.map((ip) => {
                      const ipForUrl = ip.includes(':') && !ip.startsWith('[') ? `[${ip}]` : ip; // bracket IPv6
                      const backendPortSegment = BACKEND_PORT ? `:${BACKEND_PORT}` : '';
                      const frontendPortSegment = frontendPort ? `:${frontendPort}` : '';
                      const backendBase = `${BACKEND_PROTOCOL}//${ipForUrl}${backendPortSegment}`;
                      const frontendBase = `${FRONTEND_PROTOCOL}//${ipForUrl}${frontendPortSegment}`;
                      const ipDisplay = ip.includes(':') ? `[${ip}]` : ip;
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
              })()}
            </div>

            {/* Copyright Footer */}
            <div className="rounded-lg border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 md:col-span-3">
              <div className="text-center space-y-1">
                <div className="text-sm font-semibold text-indigo-900">
                  {t('controlPanel.footerTitle')}
                </div>
                <div className="text-xs text-indigo-700">
                  {t('controlPanel.footerDeveloper')}
                </div>
                <div className="text-xs text-indigo-600">
                  {t('controlPanel.footerCopyright')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerControl;
