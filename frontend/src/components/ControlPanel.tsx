import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Terminal,
  Package,
  Container,
  FileText,
  Trash2,
  Cpu,
  Server,
  Shield,
  Download
} from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { useLanguage } from '../LanguageContext';
import Toast from './ui/Toast';
import DevToolsPanel, { type ToastState } from '@/features/operations/components/DevToolsPanel';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import { RBACPanel } from '@/components/admin/RBACPanel';
import { useAuth } from '@/contexts/AuthContext';
import UpdatesPanel from './ControlPanel/UpdatesPanel';

// TypeScript interfaces
interface SystemStatus {
  backend: string;
  frontend: string;
  docker: string;
  database: string;
  process_start_time?: string; // ISO string from backend
}

interface DiagnosticItem {
  name: string;
  category?: string;
  status: string;
  message: string;
  details?: {
    [key: string]: unknown;
    sms_schema_version?: string;
  };
}

interface PortInfo {
  port: number;
  status: string;
  in_use?: boolean;
  process_name?: string;
  process_id?: number;
}

interface EnvironmentInfo {
  python_version?: string;
  node_version?: string;
  docker_version?: string;
  platform?: string;
  cwd?: string;
  environment_mode?: string;
  python_packages?: string[];
  sms_schema_version?: string;
  app_version?: string;
  api_version?: string;
  frontend_version?: string;
  git_revision?: string;
  python_path?: string;
  node_path?: string;
  npm_version?: string;
  venv_active?: boolean;
}

interface OperationStatus {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

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
// Canonical unified Control API base (backend mounts control router without /api/v1 prefix)
const CONTROL_API = `${API_BASE}/control/api`;
// Removed unused LEGACY_CONTROL_API constant

interface ControlPanelProps {
  showTitle?: boolean;
  variant?: 'full' | 'embedded';
}

const ControlPanel: React.FC<ControlPanelProps> = ({ showTitle = true, variant = 'full' }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [showRuntimeDetails, setShowRuntimeDetails] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const [uptime, setUptime] = useState<string>('');
  const uptimeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleToast = useCallback((state: ToastState) => {
    setToast(state);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

// Helper to format uptime from seconds
function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let str = '';
    if (d > 0) str += `${d}d `;
    if (h > 0 || d > 0) str += `${h}h `;
    if (m > 0 || h > 0 || d > 0) str += `${m}m `;
    str += `${s}s`;
    return str.trim();
  }

  // Update uptime based on process_start_time
  const updateUptime = useCallback((startIso: string | undefined) => {
    if (!startIso) {
      setUptime('');
      return;
    }
    const start = new Date(startIso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    setUptime(formatUptime(diff));
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/status`);
      setStatus(response.data);
      if (response.data.process_start_time) {
        updateUptime(response.data.process_start_time);
        // Clear previous timer
        if (uptimeTimerRef.current) clearInterval(uptimeTimerRef.current);
        // Start new timer
        const timer = setInterval(() => {
          updateUptime(response.data.process_start_time);
        }, 1000);
        uptimeTimerRef.current = timer;
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, [updateUptime]);

  // Fetch diagnostics
  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${CONTROL_API}/diagnostics`);
      // Ensure response.data is an array before setting
      if (Array.isArray(response.data)) {
        setDiagnostics(response.data);
      } else {
        console.error('Diagnostics response is not an array:', response.data);
        setDiagnostics([]);
      }
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error);
      setDiagnostics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ports
  const fetchPorts = useCallback(async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/ports`);
      // Ensure response.data is an array before setting
      if (Array.isArray(response.data)) {
        setPorts(response.data);
      } else {
        console.error('Ports response is not an array:', response.data);
        setPorts([]);
      }
    } catch (error) {
      console.error('Failed to fetch ports:', error);
      setPorts([]);
    }
  }, []);

  // Fetch environment
  const fetchEnvironment = useCallback(async (includePackages = false): Promise<void> => {
    try {
      const url = includePackages ? `${CONTROL_API}/environment?include_packages=true` : `${CONTROL_API}/environment`;
      const response = await axios.get(url);
      setEnvironment(response.data);
    } catch (error) {
      console.error('Failed to fetch environment:', error);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (): Promise<void> => {
    try {
      const response = await axios.get(`${CONTROL_API}/logs/backend?lines=50`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  // Generic operation handler
  const runOperation = useCallback(async (endpoint: string, successMessage: string): Promise<void> => {
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
      const err = error as AxiosError<{ detail?: string }>;
      setOperationStatus({
        type: 'error',
        message: err.response?.data?.detail || err.message || t('controlPanel.operationFailed')
      });
    } finally {
      setLoading(false);
      setTimeout(() => setOperationStatus(null), 5000);
    }
  }, [t, fetchStatus, fetchDiagnostics]);

  // Operation with full path (allows query params)
  const runOperationPath = useCallback(async (path: string, successMessage: string): Promise<void> => {
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
      const err = error as AxiosError<{ detail?: string }>;
      setOperationStatus({
        type: 'error',
        message: err.response?.data?.detail || err.message || t('controlPanel.operationFailed')
      });
    } finally {
      setLoading(false);
      setTimeout(() => setOperationStatus(null), 5000);
    }
  }, [t, fetchStatus, fetchDiagnostics]);

  // Control operations (use legacy endpoints for start/stop)
  // Removed unused startFrontend and stopFrontend for linter compliance

  // Removed unused stopAll function after removing Stop All Services button

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchDiagnostics();
    fetchPorts();
    fetchEnvironment();

    // Auto-refresh status
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      clearInterval(interval);
      if (uptimeTimerRef.current) clearInterval(uptimeTimerRef.current);
    };
  }, [fetchStatus, fetchDiagnostics, fetchPorts, fetchEnvironment]);

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
  }, [activeTab, diagnostics.length, ports.length, logs.length, fetchDiagnostics, fetchPorts, fetchLogs]);

  // Removed unused getStatusBadge for linter compliance

  const getDiagnosticIcon = (status: string): React.ReactNode => {
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

  const isEmbedded = variant === 'embedded';
  const containerClass = isEmbedded
    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
    : 'min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100';

  return (
    <div className={containerClass}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showTitle ? (
              <>
                <Settings className="text-indigo-400" size={28} />
                <div>
                  <h1 className="text-xl font-bold">{t('controlPanel.title')}</h1>
                  <p className="text-sm text-gray-400">{t('controlPanel.subtitle')}</p>
                </div>
              </>
            ) : (
              <Settings className="text-indigo-400" size={24} aria-hidden="true" />
            )}
          </div>

          {/* Uptime display */}
          {uptime && !isEmbedded && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
              <span className="font-semibold">{t('controlPanel.uptime') || 'Uptime'}:</span>
              <span className="font-mono">{uptime}</span>
            </div>
          )}

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
                {t('controlPanel.runningIn')}: {t('controlPanel.dockerContainer')}
              </p>
              <p className="text-xs text-blue-400 mt-1">
                {t('controlPanel.nativeOpsHidden')}
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
              { id: 'updates', label: t('controlPanel.updates') || 'Updates', icon: Download },
              { id: 'diagnostics', label: t('controlPanel.diagnostics'), icon: AlertTriangle },
              { id: 'ports', label: t('controlPanel.ports'), icon: Server },
              { id: 'logs', label: t('controlPanel.logs'), icon: FileText },
              { id: 'environment', label: t('controlPanel.environment'), icon: Cpu },
              { id: 'maintenance', label: t('controlPanel.maintenance'), icon: Shield }
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
      <main className={isEmbedded ? 'p-6' : 'p-6 max-w-7xl mx-auto'}>
        {/* Dashboard tab removed as redundant */}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            {environment?.environment_mode === 'docker' && (
              <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Container size={24} className="text-blue-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-blue-300 mb-2">{t('controlPanel.dockerContainer')}</h2>
                    <p className="text-sm text-blue-200 mb-4">
                      {t('controlPanel.operationsRequireHost')}
                    </p>

                    {/* Commands in a clean grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">{t('controlPanel.containerManagement')}</div>
                        <code className="text-xs text-green-400 font-mono block">{t('controlPanel.dockerQuickCommand')}</code>
                        <code className="text-xs text-red-400 font-mono block mt-1">{t('controlPanel.dockerStopCommand')}</code>
                        <code className="text-xs text-yellow-400 font-mono block mt-1">{t('controlPanel.dockerRestartCommand')}</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">{t('controlPanel.monitoring')}</div>
                        <code className="text-xs text-blue-400 font-mono block">{t('controlPanel.dockerStatusCommand')}</code>
                        <code className="text-xs text-purple-400 font-mono block mt-1">{t('controlPanel.dockerLogsCommand')}</code>
                        <code className="text-xs text-cyan-400 font-mono block mt-1">{t('controlPanel.dockerHelpCommand')}</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">{t('controlPanel.buildSetup')}</div>
                        <code className="text-xs text-orange-400 font-mono block">{t('controlPanel.dockerComposeBuildCommand')}</code>
                        <code className="text-xs text-cyan-400 font-mono block mt-1">{t('controlPanel.smartSetupCommand')}</code>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">{t('controlPanel.hiddenOperations')}</div>
                        <div className="text-xs text-gray-300 mt-1">• {t('controlPanel.hiddenOperationsList.dependencyInstallation')}</div>
                        <div className="text-xs text-gray-300">• {t('controlPanel.hiddenOperationsList.containerLifecycle')}</div>
                        <div className="text-xs text-gray-300">• {t('controlPanel.hiddenOperationsList.volumeManagement')}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-blue-300 bg-blue-900/20 rounded p-3 border border-blue-800/30">
                      <span className="text-lg">💡</span>
                      <p>
                        <strong>{t('controlPanel.whyLabel')}</strong> {t('controlPanel.whyExplanation')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Control removed per request: Stop All / Exit button was removed from the UI */}

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

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <UpdatesPanel controlApi={CONTROL_API} />
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
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('controlPanel.port')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('controlPanel.status')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('controlPanel.process')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('controlPanel.pid')}</th>
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
                          {port.in_use ? t('controlPanel.inUse') : t('controlPanel.available')}
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
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.python')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.version')}:</span> <span className="ml-2 font-mono">{environment.python_version || t('controlPanel.notInstalled')}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.path')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.python_path || '-'}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.virtualEnv')}:</span> <span className="ml-2">{environment.venv_active ? t('controlPanel.yes') : t('controlPanel.no')}</span></p>
                  </div>

                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.nodejs')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.version')}:</span> <span className="ml-2 font-mono">{environment.node_version || t('controlPanel.notInstalled')}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.npm')}:</span> <span className="ml-2 font-mono">{environment.npm_version || t('controlPanel.notInstalled')}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.path')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.node_path || '-'}</span></p>
                  </div>

                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.docker')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.version')}:</span> <span className="ml-2 font-mono">{environment.docker_version || t('controlPanel.notInstalled')}</span></p>
                  </div>

                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.system')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.platform')}:</span> <span className="ml-2 font-mono">{environment.platform || '-'}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('controlPanel.workingDir')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.cwd || '-'}</span></p>
                  </div>
                  {showRuntimeDetails && environment.python_packages && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">{t('controlPanel.runtimeDetails')}</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-x-auto">
                        <div className="text-xs text-gray-400 mb-2">{t('controlPanel.pythonPackages')}</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 pr-4">{t('controlPanel.package')}</th>
                              <th className="text-left py-1">{t('controlPanel.version')}</th>
                            </tr>
                          </thead>
                          <tbody>
                              {environment.python_packages.map((pkg: unknown) => {
                                if (typeof pkg === 'string') {
                                  // some health payloads return package entries as strings
                                  return (
                                    <tr key={pkg}>
                                      <td className="py-1 pr-4 font-mono" colSpan={2}>{pkg}</td>
                                    </tr>
                                  );
                                }
                                const { name, version } = pkg as { name?: string; version?: string };
                                return (
                                  <tr key={name || JSON.stringify(pkg)}>
                                    <td className="py-1 pr-4 font-mono">{name}</td>
                                    <td className="py-1 font-mono">{version}</td>
                                  </tr>
                                );
                              })}
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

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-700/50 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-purple-300">
                <Shield size={20} />
                {t('controlPanel.maintenanceTitle') || 'Maintenance Suite'}
              </h2>
              <p className="text-sm text-purple-200 mb-2">{t('controlPanel.maintenanceSubtitle') || 'System administration, user management, backups, and database maintenance all in one place.'}</p>
            </div>

            <AdminUsersPanel onToast={handleToast} />

            {/* RBACPanel: Only visible to admins */}
            {user?.role === 'admin' && (
              <div className="bg-white border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-indigo-700">{t('rbac.configuration')}</h3>
                <RBACPanel />
              </div>
            )}

            <DevToolsPanel variant="embedded" onToast={handleToast} />
          </div>
        )}
      </main>
    </div>
  );
};

export default ControlPanel;
