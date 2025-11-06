import React, { useState, useEffect } from 'react';
import {
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Square,
  Terminal,
  Package,
  Container,
  FileText,
  Trash2,
  Cpu,
  HardDrive,
  Server
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../LanguageContext';

/**
 * Control Panel Component
 *
 * Comprehensive system management and monitoring dashboard with the following capabilities:
 *
 * Dashboard Tab:
 * - Real-time system status monitoring (Backend, Frontend, Docker, Database)
 * - Service health indicators with color-coded status
 * - Uptime tracking and system metrics
 * - Quick actions for service management (Restart/Stop)
 *
 * Operations Tab:
 * - Frontend/Backend dependency installation
 * - Docker image building and volume management
 * - System cleanup and maintenance operations
 * - Obsolete file removal
 * - Docker data volume updates with optional migration
 *
 * Diagnostics Tab:
 * - Comprehensive system health checks
 * - Dependency verification (Node.js, Python, Docker)
 * - Configuration validation
 * - API endpoint testing
 * - Detailed diagnostic reports with pass/fail status
 *
 * Ports Tab:
 * - Network port monitoring
 * - Port availability checking
 * - Process identification for occupied ports
 * - Port conflict detection
 *
 * Logs Tab:
 * - Backend log viewing with real-time updates
 * - Log level filtering (Info, Warning, Error)
 * - Timestamp tracking
 * - Log refresh and clearing
 *
 * Environment Tab:
 * - System information display
 * - Python/Node version details
 * - Working directory and path information
 * - Environment variables overview
 *
 * Note: Some operations (like file cleanup) are only available when the backend
 * runs directly on the host, not inside Docker containers.
 */

const API_BASE = window.location.origin;
const CONTROL_API = `${API_BASE}/api/v1/control/api`;
const LEGACY_CONTROL_API = `${API_BASE}/control/api`;

const ControlPanel = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('operations');
  const [status, setStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [ports, setPorts] = useState([]);
  const [environment, setEnvironment] = useState(null);
  const [showRuntimeDetails, setShowRuntimeDetails] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [operationStatus, setOperationStatus] = useState(null);

  // Fetch status
  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${CONTROL_API}/diagnostics`);
      setDiagnostics(response.data);
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ports
  const fetchPorts = async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/ports`);
      setPorts(response.data);
    } catch (error) {
      console.error('Failed to fetch ports:', error);
    }
  };

  // Fetch environment
  const fetchEnvironment = async (includePackages = false) => {
    try {
      const url = includePackages ? `${CONTROL_API}/environment?include_packages=true` : `${CONTROL_API}/environment`;
      const response = await axios.get(url);
      setEnvironment(response.data);
    } catch (error) {
      console.error('Failed to fetch environment:', error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/logs/backend?lines=50`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Generic operation handler
  const runOperation = async (endpoint, successMessage) => {
    try {
      setLoading(true);
      setOperationStatus({ type: 'info', message: t('controlPanel.executing') });
      const response = await axios.post(`${CONTROL_API}/operations/${endpoint}`);

      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || t('controlPanel.operationFailed') });
      }

      // Refresh data after operation
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: error.response?.data?.detail || error.message || t('controlPanel.operationFailed')
      });
    } finally {
      setLoading(false);
      setTimeout(() => setOperationStatus(null), 5000);
    }
  };

  // Operation with full path (allows query params)
  const runOperationPath = async (path, successMessage) => {
    try {
      setLoading(true);
      setOperationStatus({ type: 'info', message: t('controlPanel.executing') });
      const response = await axios.post(`${CONTROL_API}${path}`);
      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || t('controlPanel.operationFailed') });
      }
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: error.response?.data?.detail || error.message || t('controlPanel.operationFailed')
      });
    } finally {
      setLoading(false);
      setTimeout(() => setOperationStatus(null), 5000);
    }
  };

  // Control operations (use legacy endpoints for start/stop)
  const startFrontend = async () => {
    try {
      await axios.post(`${LEGACY_CONTROL_API}/start`);
      setOperationStatus({ type: 'success', message: 'Frontend started successfully' });
      await fetchStatus();
    } catch (error) {
      setOperationStatus({ type: 'error', message: 'Failed to start frontend' });
    }
  };

  const stopFrontend = async () => {
    try {
      await axios.post(`${LEGACY_CONTROL_API}/stop`);
      setOperationStatus({ type: 'success', message: 'Frontend stopped successfully' });
      await fetchStatus();
    } catch (error) {
      setOperationStatus({ type: 'error', message: 'Failed to stop frontend' });
    }
  };

  const stopAll = async () => {
    // Check if running in Docker mode
    const isDockerMode = environment?.environment_mode === 'docker';

    let confirmMessage = 'Stop all services? The control panel will become unavailable.';
    if (isDockerMode) {
      confirmMessage = 'IMPORTANT: Running in Docker mode.\n\n' +
        'The "Stop All" button can only stop the backend container from within Docker.\n' +
        'The frontend/nginx container will remain running.\n\n' +
        'For a complete shutdown, use the host command:\n' +
        '  .\\SMS.ps1 -Stop\n' +
        '  or: docker compose stop\n\n' +
        'Continue with partial stop (backend only)?';
    }

    if (!confirm(confirmMessage)) return;

    try {
      // Prefer new unified exit endpoint (stops Docker if possible, then shuts down everything)
      await axios.post(`${CONTROL_API}/operations/exit-all`, { });
      const msg = isDockerMode
        ? 'Backend stopping... Use host command to stop all containers.'
        : 'All services stopping...';
      setOperationStatus({ type: 'warning', message: msg });
    } catch (error) {
      // Fallback to legacy stop-all if new endpoint is not available
      try {
        await axios.post(`${LEGACY_CONTROL_API}/stop-all`);
        const msg = isDockerMode
          ? 'Backend stopping... Use host command to stop all containers.'
          : 'All services stopping...';
        setOperationStatus({ type: 'warning', message: msg });
      } catch (_) {
        // Expected - backend will shut down or endpoint may be unreachable during shutdown
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchDiagnostics();
    fetchPorts();
  fetchEnvironment();

    // Auto-refresh status
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tab change effects
  useEffect(() => {
    if (activeTab === 'diagnostics' && diagnostics.length === 0) {
      fetchDiagnostics();
    }
    if (activeTab === 'ports' && ports.length === 0) {
      fetchPorts();
    }
    if (activeTab === 'logs' && logs.length === 0) {
      fetchLogs();
    }
  }, [activeTab]);

  const getStatusBadge = (isRunning) => {
    return isRunning ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-900/30 text-green-400 rounded-full border border-green-700">
        <CheckCircle size={12} />
        {t('controlPanel.online')}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-900/30 text-red-400 rounded-full border border-red-700">
        <XCircle size={12} />
        {t('controlPanel.offline')}
      </span>
    );
  };

  const getDiagnosticIcon = (status) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
  <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-indigo-400" size={28} />
            <div>
              <h1 className="text-xl font-bold">{t('controlPanel.title')}</h1>
              <p className="text-sm text-gray-400">{t('controlPanel.subtitle')}</p>
            </div>
          </div>

          {operationStatus && (
            <div className={`px-4 py-2 rounded-lg border ${
              operationStatus.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' :
              operationStatus.type === 'error' ? 'bg-red-900/30 border-red-700 text-red-400' :
              operationStatus.type === 'warning' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400' :
              'bg-blue-900/30 border-blue-700 text-blue-400'
            }`}>
              {operationStatus.message}
            </div>
          )}
        </div>

        {/* Mode Indicator Banner */}
        {environment?.environment_mode === 'docker' && (
          <div className="mt-4 px-4 py-3 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-center gap-3">
            <Container size={20} className="text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-300">
                {t('controlPanel.runningIn')}: Docker Container Mode
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Some native operations are hidden. Use host commands (SMS.ps1) for full system control.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Tabs */}
  <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6">
          <nav className="flex gap-1">
            {[
              { id: 'operations', label: t('controlPanel.operations'), icon: Terminal },
              { id: 'diagnostics', label: t('controlPanel.diagnostics'), icon: AlertTriangle },
              { id: 'ports', label: t('controlPanel.ports'), icon: Server },
              { id: 'logs', label: t('controlPanel.logs'), icon: FileText },
              { id: 'environment', label: t('controlPanel.environment'), icon: Cpu }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Dashboard tab removed as redundant */}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            {/* Docker Mode Consolidated Info Card */}
            {environment?.environment_mode === 'docker' && (
              <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Container size={24} className="text-blue-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-blue-300 mb-2">Docker Container Mode</h2>
                    <p className="text-sm text-blue-200 mb-4">
                      Some operations are disabled because they require host-level access. Use these PowerShell commands from your terminal:
                    </p>

                    {/* Commands in a clean grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Container Management:</div>
                        <code className="text-xs text-green-400 font-mono block">.\SMS.ps1 -Quick</code>
                        <code className="text-xs text-red-400 font-mono block mt-1">.\SMS.ps1 -Stop</code>
                        <code className="text-xs text-yellow-400 font-mono block mt-1">.\SMS.ps1 -Restart</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Monitoring:</div>
                        <code className="text-xs text-blue-400 font-mono block">.\SMS.ps1 -Status</code>
                        <code className="text-xs text-purple-400 font-mono block mt-1">.\SMS.ps1 -Logs</code>
                        <code className="text-xs text-cyan-400 font-mono block mt-1">.\SMS.ps1 -Help</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Build & Setup:</div>
                        <code className="text-xs text-orange-400 font-mono block">docker compose build</code>
                        <code className="text-xs text-cyan-400 font-mono block mt-1">.\SMART_SETUP.ps1</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Hidden Operations:</div>
                        <div className="text-xs text-gray-300 mt-1">• Dependency installation</div>
                        <div className="text-xs text-gray-300">• Container lifecycle</div>
                        <div className="text-xs text-gray-300">• Volume management</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-blue-300 bg-blue-900/20 rounded p-3 border border-blue-800/30">
                      <span className="text-lg">💡</span>
                      <p>
                        <strong>Why?</strong> Docker containers can't manage their own lifecycle or install dependencies.
                        These operations must be performed from the host system for security and reliability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Control */}
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Square size={20} className="text-red-400" />
                System Control
              </h2>
              <button
                onClick={stopAll}
                disabled={!status?.backend}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed border border-red-200 dark:border-red-700 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Square size={18} />
                  Stop All Services
                </span>
                <span className="text-xs text-red-300">
                  {environment?.environment_mode === 'docker' ? '(Backend only - use .\SMS.ps1 -Stop for full shutdown)' : '(All services)'}
                </span>
              </button>
            </div>

            {/* Native Operations - Hidden in Docker mode */}
            {environment?.environment_mode !== 'docker' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package size={20} />
                {t('controlPanel.nativeOperations')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('install-frontend-deps', t('controlPanel.operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.installFrontendDeps')}</span>
                  <Package size={18} />
                </button>
                <button
                  onClick={() => runOperation('install-backend-deps', t('controlPanel.operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.installBackendDeps')}</span>
                  <Package size={18} />
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <button
                  onClick={() => runOperation('cleanup', t('controlPanel.operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.cleanupDesc')}</span>
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => runOperation('cleanup-obsolete', t('controlPanel.operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.cleanupObsoleteDesc') || 'Cleanup obsolete files (docs, unused)'} </span>
                  <Trash2 size={18} />
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <button
                  onClick={async () => {
                    const ok = confirm(t('controlPanel.confirmDockerCleanup') || 'Prune Docker (containers, images, build cache)?');
                    if (!ok) return;
                    const includeVolumes = confirm(t('controlPanel.confirmDockerCleanupVolumes') || 'Also prune unused volumes? WARNING: data volumes may be removed');
                    await runOperationPath(`/operations/docker-prune?include_volumes=${includeVolumes ? 'true' : 'false'}`, t('controlPanel.operationSuccess'));
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.dockerCleanupDesc') || 'Prune Docker (stopped containers, dangling images, build cache)'}</span>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            )}

            {/* Docker operations - Hidden in Docker mode */}
            {environment?.environment_mode !== 'docker' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Container size={20} />
                {t('controlPanel.dockerOperations')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('docker-build', t('controlPanel.operationSuccess'))}
                  disabled={loading || !status?.docker}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.dockerBuildDesc')}</span>
                  <Container size={18} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('controlPanel.confirmDockerUpdateVolume') || 'Create a new versioned Docker data volume and update override. Migrate data from current volume if present?')) {
                      runOperationPath('/operations/docker-update-volume?migrate=true', t('controlPanel.operationSuccess'))
                    } else {
                      if (confirm(t('controlPanel.confirmDockerUpdateNoMigrate') || 'Proceed without data migration?')) {
                        runOperationPath('/operations/docker-update-volume?migrate=false', t('controlPanel.operationSuccess'))
                      }
                    }
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('controlPanel.dockerUpdateVolumeDesc') || 'Create and switch to a new versioned volume (writes docker-compose.override.yml)'}</span>
                  <Container size={18} />
                </button>
                {!status?.docker && (
                  <p className="text-sm text-yellow-400">
                    {t('controlPanel.dockerStatus')}: {t('controlPanel.offline')}
                  </p>
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('controlPanel.diagnosticsTitle')}</h2>
              <button
                onClick={fetchDiagnostics}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('controlPanel.refresh')}
              </button>
            </div>

            {diagnostics.map((diag, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getDiagnosticIcon(diag.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{diag.category}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        diag.status === 'ok' ? 'bg-green-900/30 text-green-400' :
                        diag.status === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {diag.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{diag.message}</p>
                      {/* Show SMS Schema Version if present in DB health check */}
                      {diag.category === 'Database' && diag.details && diag.details.sms_schema_version && (
                        <p className="text-sm mt-2"><span className="text-gray-400">{t('controlPanel.smsSchemaVersion') || 'SMS Schema Version'}:</span> <span className="ml-2 font-mono">{diag.details.sms_schema_version}</span></p>
                      )}
                    {diag.details && Object.keys(diag.details).length > 0 && (
                      <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {JSON.stringify(diag.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ports Tab */}
        {activeTab === 'ports' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('controlPanel.portsTitle')}</h2>
              <button
                onClick={fetchPorts}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('controlPanel.refresh')}
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Port</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Process</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">PID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {ports.map((port) => (
                    <tr key={port.port} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-mono">{port.port}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          port.in_use
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {port.in_use ? 'In Use' : 'Available'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{port.process_name || '-'}</td>
                      <td className="px-4 py-3 font-mono text-sm">{port.process_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('controlPanel.logsTitle')}</h2>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('controlPanel.refresh')}
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">{t('controlPanel.noLogsAvailable')}</p>
              ) : (
                logs.map((log, index) => {
                  try {
                    const logData = JSON.parse(log);
                    const levelColor =
                      logData.level === 'ERROR' ? 'text-red-400' :
                      logData.level === 'WARNING' ? 'text-yellow-400' :
                      logData.level === 'INFO' ? 'text-blue-400' :
                      'text-gray-400';

                    return (
                      <div key={index} className="py-1 border-b border-gray-800">
                        <span className="text-gray-500">{logData.timestamp}</span>
                        <span className={`ml-2 ${levelColor}`}>[{logData.level}]</span>
                        <span className="ml-2 text-gray-300">{logData.message}</span>
                      </div>
                    );
                  } catch {
                    return (
                      <div key={index} className="py-1 text-gray-400">
                        {log}
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>
        )}

        {/* Environment Tab */}
        {activeTab === 'environment' && environment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('controlPanel.environmentTitle')}</h2>
              <button
                onClick={async () => {
                  const next = !showRuntimeDetails;
                  setShowRuntimeDetails(next);
                  if (next && !environment.python_packages) {
                    // fetch extended details on demand
                    await fetchEnvironment(true);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md border border-gray-600"
              >
                {showRuntimeDetails ? t('controlPanel.hideRuntimeDetails') : t('controlPanel.showRuntimeDetails')}
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="space-y-4">
                {/* Application Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.appInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {environment.app_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('controlPanel.appVersion')}:</span> <span className="ml-2 font-mono">{environment.app_version}</span></p>
                    )}
                    {environment.api_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('controlPanel.apiVersion')}:</span> <span className="ml-2 font-mono">{environment.api_version}</span></p>
                    )}
                    {environment.frontend_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('controlPanel.frontendVersion')}:</span> <span className="ml-2 font-mono">{environment.frontend_version}</span></p>
                    )}
                    {environment.git_revision && (
                      <p className="text-sm"><span className="text-gray-400">{t('controlPanel.gitRevision')}:</span> <span className="ml-2 font-mono">{environment.git_revision}</span></p>
                    )}
                    {environment.environment_mode && (
                      <p className="text-sm"><span className="text-gray-400">{t('controlPanel.runningIn')}:</span> <span className="ml-2 font-mono">{environment.environment_mode === 'docker' ? t('controlPanel.dockerContainer') : t('controlPanel.nativeMode')}</span></p>
                    )}
                      {environment.sms_schema_version && (
                        <p className="text-sm"><span className="text-gray-400">{t('controlPanel.smsSchemaVersion') || 'SMS Schema Version'}:</span> <span className="ml-2 font-mono">{environment.sms_schema_version}</span></p>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Python</h3>
                    <p className="text-sm"><span className="text-gray-400">Version:</span> <span className="ml-2 font-mono">{environment.python_version}</span></p>
                    <p className="text-sm"><span className="text-gray-400">Path:</span> <span className="ml-2 font-mono text-xs break-all">{environment.python_path}</span></p>
                    <p className="text-sm"><span className="text-gray-400">Virtual Env:</span> <span className="ml-2">{environment.venv_active ? 'Yes' : 'No'}</span></p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Node.js</h3>
                    <p className="text-sm"><span className="text-gray-400">Version:</span> <span className="ml-2 font-mono">{environment.node_version || 'Not installed'}</span></p>
                    <p className="text-sm"><span className="text-gray-400">npm:</span> <span className="ml-2 font-mono">{environment.npm_version || 'Not installed'}</span></p>
                    {environment.node_path && (
                      <p className="text-sm"><span className="text-gray-400">Path:</span> <span className="ml-2 font-mono text-xs break-all">{environment.node_path}</span></p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Docker</h3>
                    <p className="text-sm"><span className="text-gray-400">Version:</span> <span className="ml-2 font-mono">{environment.docker_version || 'Not installed'}</span></p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">System</h3>
                    <p className="text-sm"><span className="text-gray-400">Platform:</span> <span className="ml-2 font-mono">{environment.platform}</span></p>
                    <p className="text-sm"><span className="text-gray-400">Working Dir:</span> <span className="ml-2 font-mono text-xs break-all">{environment.cwd}</span></p>
                  </div>
                  {showRuntimeDetails && environment.python_packages && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.runtimeDetails')}</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-x-auto">
                        <div className="text-xs text-gray-400 mb-2">{t('controlPanel.pythonPackages')}</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 pr-4">Package</th>
                              <th className="text-left py-1">Version</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {Object.entries(environment.python_packages).map(([name, version]) => (
                              <tr key={name}>
                                <td className="py-1 pr-4 font-mono">{name}</td>
                                <td className="py-1 font-mono">{version}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ControlPanel;
