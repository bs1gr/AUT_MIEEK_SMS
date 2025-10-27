import React, { useState, useEffect } from 'react';
import { Power, RotateCw, Activity, AlertCircle, CheckCircle, Server, Monitor } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

// Base URL without /api/v1 for direct server endpoints
// @ts-ignore
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL?.trim() || window.location.origin).replace(/\/api\/v1\/?$/, '');
// Derive backend protocol/port from API_BASE_URL for accurate links
let BACKEND_PROTOCOL = 'http:';
let BACKEND_PORT = '8080';
try {
  const u = new URL(API_BASE_URL);
  BACKEND_PROTOCOL = u.protocol || 'http:';
  BACKEND_PORT = u.port || '8080';
} catch {}

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
  
  const [status, setStatus] = useState<ServerStatus>({
    backend: 'checking',
    frontend: 'checking',
    lastCheck: new Date()
  });
  const [currentUptime, setCurrentUptime] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

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
      // Check backend status with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const backendResponse = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      let backendStatus: 'online' | 'offline' = 'offline';
      let uptime = 0;
      let error = '';
      let health: any = null;

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        console.log('[ServerControl] Health data received:', data);
        backendStatus = 'online';
        uptime = data.uptime || 0;
        health = data;
      } else {
        error = `Backend error: ${backendResponse.status}`;
      }

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
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        backend: 'offline',
        frontend: 'online', // Frontend is online if this code is running
        lastCheck: new Date(),
        error: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      setHealthData(null);
      setLastCheckedAt(new Date().toLocaleTimeString());
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

  const handleExit = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsExiting(true);

    try {
      // Try multiple shutdown endpoints
      const shutdownEndpoints = [
        `${API_BASE_URL}/api/v1/admin/shutdown`,
        `${API_BASE_URL}/control/api/stop-backend`,
        `${API_BASE_URL}/control/api/stop-all`
      ];

      // Fire and forget - try all endpoints
      shutdownEndpoints.forEach(endpoint => {
        fetch(endpoint, {
          method: 'POST',
          signal: AbortSignal.timeout(1000)
        }).catch(() => {
          // Ignore errors as server is shutting down
        });
      });

      // Show exit message
      setTimeout(() => {
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          ">
            <div style="text-align: center; padding: 40px;">
              <div style="font-size: 64px; margin-bottom: 20px;">✓</div>
              <h1 style="font-size: 32px; margin-bottom: 10px;">${t('serverStopped')}</h1>
              <p style="font-size: 18px; opacity: 0.9;">${t('canCloseWindow')}</p>
              <p style="font-size: 14px; opacity: 0.7; margin-top: 20px;">
                ${t('systemTitle')}
              </p>
            </div>
          </div>
        `;

        // Try to close window
        setTimeout(() => {
          window.close();
        }, 1500);
      }, 500);

    } catch (error) {
      setIsExiting(false);
      setShowConfirm(false);
      console.error('Exit error:', error);
    }
  };

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
    if (status.backend === 'online' && status.frontend === 'online') return 'online';
    if (status.backend === 'offline' || status.frontend === 'offline') return 'offline';
    return 'checking';
  };

  if (isExiting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
        <div className="animate-spin">
          <RotateCw size={16} />
        </div>
        <span className="text-sm font-medium text-yellow-800">{t('exiting')}</span>
      </div>
    );
  }

  // Show splash/loading screen while checking status
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Activity size={48} className="animate-spin text-indigo-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('loadingSystem')}</h2>
        <p className="text-gray-500">Checking system status, please wait...</p>
      </div>
    );
  }

  // Show friendly offline message if backend or frontend is offline
  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 mb-2">{t('systemOffline')}</h2>
        <p className="text-gray-500">System is currently offline or starting up. Please refresh or try again in a moment.</p>
      </div>
    );
  }

  if (isRestarting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg">
        <div className="animate-spin">
          <RotateCw size={16} />
        </div>
        <span className="text-sm font-medium text-blue-800">Restarting...</span>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg">
        <AlertCircle size={16} className="text-red-600" />
        <span className="text-sm font-medium text-red-800">{t('confirmExit')}</span>
        <button
          onClick={handleExit}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          {t('yesExit')}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300 transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Enhanced Control Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleRestart}
          disabled={isRestarting || status.backend !== 'online'}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title={status.backend !== 'online' ? t('restartDisabled') : t('restart')}
        >
          <RotateCw size={16} className={isRestarting ? 'animate-spin' : ''} />
          <span>{t('restart')}</span>
        </button>

        <button
          onClick={handleExit}
          disabled={isExiting || status.backend !== 'online'}
          className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title={status.backend !== 'online' ? t('exitDisabled') : t('exit')}
        >
          <Power size={16} />
          <span>{t('exit')}</span>
        </button>
      </div>

      {/* Enhanced Server Status Display */}
      <div
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => { setShowDetails((s) => !s); if (!healthData) checkStatus(); }}
        title="Click to toggle details and refresh"
      >

        {/* Backend Status */}
        <div className="flex items-center space-x-2">
          <Server size={14} className="text-gray-500" />
          <div className={getStatusColor('backend')}>
            {getStatusIcon('backend')}
          </div>
          <span className="text-xs font-medium text-gray-700">Backend</span>
        </div>

        {/* Frontend Status */}
        <div className="flex items-center space-x-2">
          <Monitor size={14} className="text-gray-500" />
          <div className="text-green-500">
            <CheckCircle size={14} />
          </div>
          <span className="text-xs font-medium text-gray-700">Frontend</span>
          <span className="text-xs font-mono text-gray-500 ml-2">{t('active')}</span>
        </div>

        {/* Docker Status */}
        <div className="flex items-center space-x-2">
          <Server size={14} className="text-gray-500" />
          <div className={healthData?.docker === 'online' ? 'text-green-500' : healthData?.docker === 'offline' ? 'text-red-500' : 'text-gray-500'}>
            {healthData?.docker === 'online' ? <CheckCircle size={14} /> : healthData?.docker === 'offline' ? <AlertCircle size={14} /> : <Activity size={14} />}
          </div>
          <span className="text-xs font-medium text-gray-700">Docker</span>
          <span className="text-xs font-mono text-gray-500 ml-2">
            {healthData?.docker === 'online' ? t('ready') : healthData?.docker === 'offline' ? t('notRunning') : t('unknown')}
          </span>
        </div>

        {/* Overall Status & Info */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">
            {getOverallStatus() === 'online' ? 'System Online' :
             getOverallStatus() === 'offline' ? 'System Offline' : 'Checking...'}
          </span>
          {status.backend === 'online' && currentUptime > 0 && (
            <span className="text-xs text-gray-500">
              {t('uptime')}: {Math.floor(currentUptime / 3600)}h {Math.floor((currentUptime % 3600) / 60)}m {currentUptime % 60}s
            </span>
          )}
          {status.error && (
            <span className="text-xs text-red-500 truncate max-w-32" title={status.error}>
              Error: {status.error.substring(0, 20)}...
            </span>
          )}
        </div>
      </div>

      {/* Detailed System Health (toggle) */}
      {showDetails && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-white bg-slate-700">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">System Health</div>
                <div className="text-xs opacity-90 space-x-2">
                  {healthData?.version ? <span>v{healthData.version}</span> : null}
                  {healthData?.timestamp ? <span>{new Date(healthData.timestamp).toLocaleString()}</span> : null}
                  {lastCheckedAt ? <span>(checked {lastCheckedAt})</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* LEDs */}
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></span>
                  <span className="text-white/90 text-xs">Frontend</span>
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
                  <span className="text-white/90 text-xs">Backend</span>
                </div>
                {/* Controls */}
                <div className="ml-auto flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 text-xs text-white/90">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      aria-label="Toggle auto refresh"
                    />
                    Auto-refresh
                  </label>
                  <select
                    value={String(intervalMs)}
                    onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))}
                    className="bg-white/20 text-white rounded px-2 py-1 text-xs"
                    aria-label="Auto refresh interval"
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
                    <div className="text-sm font-semibold text-indigo-900 mb-2">System Uptime</div>
                    <div className="text-4xl font-bold text-indigo-600">
                      {Math.floor(currentUptime / 3600)}h {Math.floor((currentUptime % 3600) / 60)}m {currentUptime % 60}s
                    </div>
                  </div>
                  <div className="text-6xl opacity-20">⏱️</div>
                </div>
              </div>
            )}
            
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Database</div>
              <div className="text-sm font-semibold">{healthData?.database || healthData?.db || 'unknown'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Students</div>
              <div className="text-sm font-semibold">{healthData?.statistics?.students ?? healthData?.students_count ?? '—'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Courses</div>
              <div className="text-sm font-semibold">{healthData?.statistics?.courses ?? healthData?.courses_count ?? '—'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Frontend</div>
              <div className="text-sm font-semibold">running on {window.location.hostname}:{window.location.port || '5173'}</div>
            </div>
            
            {/* Available Endpoints - Only Active IPs */}
            <div className="rounded-lg border p-3 md:col-span-3">
              <div className="text-sm font-semibold mb-2">Available Endpoints</div>
              {(() => {
                const frontendPort = String(window.location.port || '5173');
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
                if (!ips.length) return <div className="text-xs text-gray-600">No active IPs available.</div>;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ips.map((ip) => {
                      const ipForUrl = ip.includes(':') && !ip.startsWith('[') ? `[${ip}]` : ip; // bracket IPv6
                      return (
                        <div key={ip} className="text-xs">
                          <div className="font-mono text-gray-700 mb-1">{ip}</div>
                          <div className="flex flex-wrap gap-2">
                            <a className="text-indigo-600 hover:underline" href={`${BACKEND_PROTOCOL}//${ipForUrl}:${BACKEND_PORT}/`} target="_blank" rel="noopener noreferrer">Backend</a>
                            <span className="text-gray-400">|</span>
                            <a className="text-indigo-600 hover:underline" href={`${BACKEND_PROTOCOL}//${ipForUrl}:${BACKEND_PORT}/docs`} target="_blank" rel="noopener noreferrer">Docs</a>
                            <a className="text-indigo-600 hover:underline" href={`${BACKEND_PROTOCOL}//${ipForUrl}:${BACKEND_PORT}/redoc`} target="_blank" rel="noopener noreferrer">ReDoc</a>
                            <a className="text-indigo-600 hover:underline" href={`${BACKEND_PROTOCOL}//${ipForUrl}:${BACKEND_PORT}/health`} target="_blank" rel="noopener noreferrer">Health</a>
                            <span className="text-gray-400">|</span>
                            <a className="text-emerald-700 hover:underline" href={`http://${ipForUrl}:${frontendPort}/`} target="_blank" rel="noopener noreferrer">Frontend</a>
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
                  Σύστημα Διαχείρισης Σπουδαστών ΜΙΕΕΚ - AUT Μηχανική Αυτοκινήτου
                </div>
                <div className="text-xs text-indigo-700">
                  Ανάπτυξη Λογισμικού: Βασίλειος Σαμαράς
                </div>
                <div className="text-xs text-indigo-600">
                  ©2025 All rights reserved - MIT license
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
