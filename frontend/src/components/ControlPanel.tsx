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
  Download,
  Activity,
  ChevronDown
} from 'lucide-react';
import { AxiosError } from 'axios';
import { useLanguage } from '../LanguageContext';
import Toast from './ui/Toast';
import DevToolsPanel, { type ToastState } from '@/features/operations/components/DevToolsPanel';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import { RBACPanel } from '@/components/admin/RBACPanel';
import { useAuth } from '@/contexts/AuthContext';
import UpdatesPanel from './ControlPanel/UpdatesPanel';
import RateLimitAdjuster from './ControlPanel/RateLimitAdjuster';
import apiClient, { CONTROL_API_BASE, controlApiClient } from '@/api/api';

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

// Canonical unified Control API base (backend mounts control router without /api/v1 prefix)
const CONTROL_API = CONTROL_API_BASE.replace(/\/$/, '');

interface ControlPanelProps {
  showTitle?: boolean;
  variant?: 'full' | 'embedded';
  initialTab?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ showTitle = true, variant = 'full', initialTab }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>(initialTab || (variant === 'embedded' ? 'maintenance' : 'operations'));
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [showRuntimeDetails, setShowRuntimeDetails] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  // Maintenance panel collapse states (closed by default)
  const [expandAdminUsers, setExpandAdminUsers] = useState<boolean>(false);
  const [expandRBAC, setExpandRBAC] = useState<boolean>(false);
  const [expandDevTools, setExpandDevTools] = useState<boolean>(false);
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
      const response = await controlApiClient.get('/status');
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
      const response = await controlApiClient.get('/diagnostics');
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
      const response = await controlApiClient.get('/ports');
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
      const url = includePackages ? '/environment?include_packages=true' : '/environment';
      const response = await controlApiClient.get(url);
      setEnvironment(response.data);
    } catch (error) {
      console.error('Failed to fetch environment:', error);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (): Promise<void> => {
    try {
      const response = await controlApiClient.get('/logs/backend?lines=50');
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  // Generic operation handler
  const runOperation = useCallback(async (endpoint: string, successMessage: string): Promise<void> => {
    try {
      setLoading(true);
      setOperationStatus({ type: 'info', message: t('executing') });
      const response = await controlApiClient.post(`/operations/${endpoint}`);

      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || t('operationFailed') });
      }

      // Refresh data after operation
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      const err = error as AxiosError<{ detail?: string }>;
      setOperationStatus({
        type: 'error',
        message: err.response?.data?.detail || err.message || t('operationFailed')
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
      setOperationStatus({ type: 'info', message: t('executing') });
      const response = await controlApiClient.post(path);
      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || t('operationFailed') });
      }
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      const err = error as AxiosError<{ detail?: string }>;
      setOperationStatus({
        type: 'error',
        message: err.response?.data?.detail || err.message || t('operationFailed')
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
    if (activeTab === 'environment' && !environment) {
      fetchEnvironment();
    }
  }, [
    activeTab,
    diagnostics.length,
    ports.length,
    logs.length,
    environment,
    fetchDiagnostics,
    fetchPorts,
    fetchLogs,
    fetchEnvironment,
  ]);

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
    ? 'w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-slate-900 dark:text-gray-100'
    : 'min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100';
  const cardBaseClass = isEmbedded
    ? 'rounded-2xl border border-slate-200 bg-white shadow-sm'
    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg';
  const headerClass = isEmbedded
    ? 'px-6 py-5 border-b border-slate-100 bg-white'
    : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4';
  const modeBannerClass = isEmbedded
    ? 'mt-4 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 flex items-start gap-3 text-indigo-900'
    : 'mt-4 px-4 py-3 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-center gap-3';
  const tabBarWrapperClass = isEmbedded
    ? 'px-6 pt-4 border-b border-slate-100 bg-white'
    : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700';
  const tabNavContainerClass = isEmbedded ? 'px-0' : 'px-6';
  const tabListClass = isEmbedded ? 'flex flex-wrap gap-2' : 'flex gap-1';
  const tabButtonClass = (tabId: string) => (
    isEmbedded
      ? `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          activeTab === tabId
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`
      : `flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
          activeTab === tabId
            ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
            : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
        }`
  );
  const mainClass = isEmbedded ? 'space-y-6 px-6 py-6 bg-white' : 'p-6 max-w-7xl mx-auto';

  return (
    <div className={containerClass}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Header */}
      <header className={headerClass}>
        <div className={isEmbedded ? 'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between' : 'flex items-center justify-between'}>
          <div className="flex items-center gap-3">
            {showTitle ? (
              <>
                <Settings className="text-slate-900" size={isEmbedded ? 26 : 28} />
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{t('title')}</h1>
                  <p className="text-sm text-slate-500">{t('subtitle')}</p>
                </div>
              </>
            ) : (
              <Settings className="text-slate-900" size={24} aria-hidden="true" />
            )}
          </div>

          <div className={isEmbedded ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4' : 'flex items-center gap-3'}>
            {uptime && (
              <div className={isEmbedded ? 'flex items-center gap-2 text-xs text-slate-500' : 'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300'}>
                <span className="font-semibold">{t('uptime') || 'Uptime'}:</span>
                <span className="font-mono text-slate-700">{uptime}</span>
              </div>
            )}

            {operationStatus && (
              <div className={
                isEmbedded
                  ? `inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold ${
                      operationStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      operationStatus.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      operationStatus.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-50 text-slate-700 border border-slate-200'
                    }`
                  : `px-4 py-2 rounded-lg border ${
                      operationStatus.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' :
                      operationStatus.type === 'error' ? 'bg-red-900/30 border-red-700 text-red-400' :
                      operationStatus.type === 'warning' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400' :
                      'bg-blue-900/30 border-blue-700 text-blue-400'
                    }`
              }>
                {operationStatus.message}
              </div>
            )}
          </div>
        </div>

        {environment?.environment_mode === 'docker' && (
          <div className={modeBannerClass}>
            <Container size={20} className={isEmbedded ? 'text-indigo-500' : 'text-blue-400'} />
            <div className="flex-1">
              <p className={isEmbedded ? 'text-sm font-semibold text-indigo-900' : 'text-sm font-semibold text-blue-300'}>
                {t('runningIn')}: {t('dockerContainer')}
              </p>
              <p className={isEmbedded ? 'text-xs text-indigo-700 mt-1' : 'text-xs text-blue-400 mt-1'}>
                {t('nativeOpsHidden')}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className={tabBarWrapperClass}>
        <div className={tabNavContainerClass}>
          <nav className={tabListClass}>
            {[
              { id: 'operations', label: t('operations'), icon: Terminal },
              { id: 'updates', label: t('updates') || 'Updates', icon: Download },
              { id: 'diagnostics', label: t('diagnostics') || 'Diagnostics', icon: AlertTriangle },
              { id: 'ports', label: t('ports') || 'Ports', icon: Server },
              { id: 'logs', label: t('logs') || 'Logs', icon: FileText },
              { id: 'environment', label: t('environment') || 'Environment', icon: Cpu },
              ...(user?.role === 'admin' ? [{ id: 'rate-limits', label: t('rateLimitsLabel') || 'Rate Limits', icon: Activity }] : []),
              { id: 'maintenance', label: t('maintenance') || 'Maintenance', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={tabButtonClass(tab.id)}
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
      <main className={mainClass}>
        {/* Dashboard tab removed as redundant */}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            {environment?.environment_mode === 'docker' && (
              <div className={`${isEmbedded ? 'rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 text-slate-700' : 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/50 rounded-lg text-blue-200'} p-6`}>
                <div className="flex items-start gap-4">
                  <Container size={24} className={isEmbedded ? 'text-indigo-500 flex-shrink-0 mt-1' : 'text-blue-400 flex-shrink-0 mt-1'} />
                  <div className="flex-1">
                    <h2 className={`text-lg font-semibold mb-2 ${isEmbedded ? 'text-slate-900' : 'text-blue-300'}`}>{t('dockerContainer')}</h2>
                    <p className={`text-sm mb-4 ${isEmbedded ? 'text-slate-700' : 'text-blue-200'}`}>
                      {t('operationsRequireHost')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {[
                        { title: t('containerManagement'), lines: [t('dockerQuickCommand'), t('dockerStopCommand'), t('dockerRestartCommand')] },
                        { title: t('monitoring'), lines: [t('dockerStatusCommand'), t('dockerLogsCommand'), t('dockerHelpCommand')] },
                        { title: t('buildSetup'), lines: [t('dockerComposeBuildCommand'), t('smartSetupCommand')] },
                        { title: t('hiddenOperations'), lines: [t('hiddenOperationsList.dependencyInstallation'), t('hiddenOperationsList.containerLifecycle'), t('hiddenOperationsList.volumeManagement')] }
                      ].map((block, index) => (
                        <div
                          key={block.title}
                          className={isEmbedded ? 'rounded-xl border border-slate-200 bg-white/70 p-3 text-slate-600' : 'bg-gray-900/50 rounded p-3 border border-gray-700'}
                        >
                          <div className="text-xs font-semibold text-slate-500 mb-1">{block.title}</div>
                          {block.lines.map((line, lineIndex) => (
                            <div key={`${block.title}-${lineIndex}`} className="text-xs font-mono text-slate-700">
                              {index < 2 ? <code>{line}</code> : `• ${line}`}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className={isEmbedded ? 'flex items-start gap-2 text-xs text-slate-700 bg-white/70 rounded-xl p-3 border border-slate-200' : 'flex items-start gap-2 text-xs text-blue-300 bg-blue-900/20 rounded p-3 border border-blue-800/30'}>
                      <span className="text-lg">💡</span>
                      <p>
                        <strong>{t('whyLabel')}</strong> {t('whyExplanation')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Control removed per request: Stop All / Exit button was removed from the UI */}

            {/* Native Operations - Hidden in Docker mode */}
            {environment?.environment_mode !== 'docker' && (
            <div className={`${cardBaseClass} p-6`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package size={20} />
                {t('nativeOperations')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('install-frontend-deps', t('operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('installFrontendDeps')}</span>
                  <Package size={18} />
                </button>
                <button
                  onClick={() => runOperation('install-backend-deps', t('operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('installBackendDeps')}</span>
                  <Package size={18} />
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <button
                  onClick={() => runOperation('cleanup', t('operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('cleanupDesc')}</span>
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => runOperation('cleanup-obsolete', t('operationSuccess'))}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('cleanupObsoleteDesc') || 'Cleanup obsolete files (docs, unused)'} </span>
                  <Trash2 size={18} />
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <button
                  onClick={async () => {
                    const ok = confirm(t('confirmDockerCleanup') || 'Prune Docker (containers, images, build cache)?');
                    if (!ok) return;
                    const includeVolumes = confirm(t('confirmDockerCleanupVolumes') || 'Also prune unused volumes? WARNING: data volumes may be removed');
                    await runOperationPath(`/operations/docker-prune?include_volumes=${includeVolumes ? 'true' : 'false'}`, t('operationSuccess'));
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('dockerCleanupDesc') || 'Prune Docker (stopped containers, dangling images, build cache)'}</span>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            )}

            {/* Docker operations - Hidden in Docker mode */}
            {environment?.environment_mode !== 'docker' && (
            <div className={`${cardBaseClass} p-6`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Container size={20} />
                {t('dockerOperations')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('docker-build', t('operationSuccess'))}
                  disabled={loading || !status?.docker}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('dockerBuildDesc')}</span>
                  <Container size={18} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('confirmDockerUpdateVolume') || 'Create a new versioned Docker data volume and update override. Migrate data from current volume if present?')) {
                      runOperationPath('/operations/docker-update-volume?migrate=true', t('operationSuccess'))
                    } else {
                      if (confirm(t('confirmDockerUpdateNoMigrate') || 'Proceed without data migration?')) {
                        runOperationPath('/operations/docker-update-volume?migrate=false', t('operationSuccess'))
                      }
                    }
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>{t('dockerUpdateVolumeDesc') || 'Create and switch to a new versioned volume (writes docker-compose.override.yml)'}</span>
                  <Container size={18} />
                </button>
                {!status?.docker && (
                  <p className="text-sm text-yellow-400">
                    {t('dockerStatus')}: {t('offline')}
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
              <h2 className="text-lg font-semibold">{t('diagnosticsTitle')}</h2>
              <button
                onClick={fetchDiagnostics}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('refresh')}
              </button>
            </div>

            {diagnostics.map((diag, index) => (
              <div key={index} className={`${cardBaseClass} p-4`}>
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
                        <p className="text-sm mt-2"><span className="text-gray-400">{t('smsSchemaVersion') || 'SMS Schema Version'}:</span> <span className="ml-2 font-mono">{diag.details.sms_schema_version}</span></p>
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
              <h2 className="text-lg font-semibold">{t('portsTitle')}</h2>
              <button
                onClick={fetchPorts}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('refresh')}
              </button>
            </div>

                <div className={`${cardBaseClass} overflow-hidden`}>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('port')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('status')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('process')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t('pid')}</th>
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
                          {port.in_use ? t('inUse') : t('available')}
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
              <h2 className="text-lg font-semibold">{t('logsTitle')}</h2>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                {t('refresh')}
              </button>
            </div>

            <div className={`${isEmbedded ? 'rounded-2xl border border-slate-200 bg-slate-50' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg'} p-4 font-mono text-xs overflow-x-auto max-h-[600px] overflow-y-auto`}>
              {logs.length === 0 ? (
                <p className="text-gray-500">{t('noLogsAvailable')}</p>
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
              <h2 className="text-lg font-semibold">{t('environmentTitle')}</h2>
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
                {showRuntimeDetails ? t('hideRuntimeDetails') : t('showRuntimeDetails')}
              </button>
            </div>

            <div className={`${cardBaseClass} p-6`}>
              <div className="space-y-4">
                {environment.environment_mode === 'docker' && (
                  <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700/50 rounded-md px-3 py-2">
                    {t('dockerContainer')}
                  </div>
                )}
                {/* Application Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">{t('appInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {environment.app_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('appVersion')}:</span> <span className="ml-2 font-mono">{environment.app_version}</span></p>
                    )}
                    {environment.api_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('apiVersion')}:</span> <span className="ml-2 font-mono">{environment.api_version}</span></p>
                    )}
                    {environment.frontend_version && (
                      <p className="text-sm"><span className="text-gray-400">{t('frontendVersion')}:</span> <span className="ml-2 font-mono">{environment.frontend_version}</span></p>
                    )}
                    {environment.git_revision && (
                      <p className="text-sm"><span className="text-gray-400">{t('gitRevision')}:</span> <span className="ml-2 font-mono">{environment.git_revision}</span></p>
                    )}
                    {environment.environment_mode && (
                      <p className="text-sm"><span className="text-gray-400">{t('runningIn')}:</span> <span className="ml-2 font-mono">{environment.environment_mode === 'docker' ? t('dockerContainer') : t('nativeMode')}</span></p>
                    )}
                      {environment.sms_schema_version && (
                        <p className="text-sm"><span className="text-gray-400">{t('smsSchemaVersion') || 'SMS Schema Version'}:</span> <span className="ml-2 font-mono">{environment.sms_schema_version}</span></p>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('python')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('version')}:</span> <span className="ml-2 font-mono">{environment.python_version || t('notInstalled')}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('path')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.python_path || '-'}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('virtualEnv')}:</span> <span className="ml-2">{environment.venv_active ? t('yes') : t('no')}</span></p>
                  </div>

                  {environment.environment_mode !== 'docker' && (
                    <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">{t('nodejs')}</h3>
                      <p className="text-sm"><span className="text-gray-400">{t('version')}:</span> <span className="ml-2 font-mono">{environment.node_version || t('notInstalled')}</span></p>
                      <p className="text-sm"><span className="text-gray-400">{t('npm')}:</span> <span className="ml-2 font-mono">{environment.npm_version || t('notInstalled')}</span></p>
                      <p className="text-sm"><span className="text-gray-400">{t('path')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.node_path || '-'}</span></p>
                    </div>
                  )}

                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('docker')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('version')}:</span> <span className="ml-2 font-mono">{environment.docker_version || t('notInstalled')}</span></p>
                  </div>

                  <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">{t('system')}</h3>
                    <p className="text-sm"><span className="text-gray-400">{t('platform')}:</span> <span className="ml-2 font-mono">{environment.platform || '-'}</span></p>
                    <p className="text-sm"><span className="text-gray-400">{t('workingDir')}:</span> <span className="ml-2 font-mono text-xs break-all">{environment.cwd || '-'}</span></p>
                  </div>
                  {showRuntimeDetails && environment.python_packages && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">{t('runtimeDetails')}</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-x-auto">
                        <div className="text-xs text-gray-400 mb-2">{t('pythonPackages')}</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 pr-4">{t('package')}</th>
                              <th className="text-left py-1">{t('version')}</th>
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
            <div className="rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
                {t('maintenance') || 'Maintenance'}
              </p>
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Shield size={20} />
                {t('maintenanceTitle') || 'Maintenance Suite'}
              </h2>
              <p className="text-sm text-slate-600 max-w-3xl">{t('maintenanceSubtitle') || 'System administration, user management, backups, and database maintenance all in one place.'}</p>
            </div>

            {/* Admin Users Panel - Collapsible */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setExpandAdminUsers(!expandAdminUsers)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t('administratorUsersHeading') || 'User Management'}
                </h3>
                <ChevronDown
                  size={20}
                  className={`text-gray-500 dark:text-gray-400 transition-transform ${
                    expandAdminUsers ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandAdminUsers && (
                <div className="p-6">
                  <AdminUsersPanel onToast={handleToast} />
                </div>
              )}
            </div>

            {/* RBACPanel: Only visible to admins - Collapsible */}
            {user?.role === 'admin' && (
              <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setExpandRBAC(!expandRBAC)}
                  className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {t('rbac.configuration') || 'RBAC Configuration'}
                  </h3>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 dark:text-gray-400 transition-transform ${
                      expandRBAC ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandRBAC && (
                  <div className="p-6">
                    <RBACPanel />
                  </div>
                )}
              </div>
            )}

            {/* DevTools Panel - Collapsible */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setExpandDevTools(!expandDevTools)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t('utils.operationsMonitor') || 'Dev Tools & Operations'}
                </h3>
                <ChevronDown
                  size={20}
                  className={`text-gray-500 dark:text-gray-400 transition-transform ${
                    expandDevTools ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandDevTools && (
                <div className="p-6">
                  <DevToolsPanel
                    variant="embedded"
                    showOperationsMonitorSummary={false}
                    onToast={handleToast}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rate Limits Tab */}
        {activeTab === 'rate-limits' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-yellow-300">
                <Activity size={20} />
                {t('rateLimitsTitle') || 'Rate Limiting Configuration'}
              </h2>
              <p className="text-sm text-yellow-200">{t('rateLimitsSubtitle') || 'Adjust API rate limits to prevent service degradation. Changes apply immediately.'}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <RateLimitAdjuster onToast={handleToast} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ControlPanel;
