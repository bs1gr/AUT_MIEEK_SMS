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

const API_BASE = window.location.origin;
const CONTROL_API = `${API_BASE}/api/v1/control/api`;
const LEGACY_CONTROL_API = `${API_BASE}/control/api`;

const ControlPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [ports, setPorts] = useState([]);
  const [environment, setEnvironment] = useState(null);
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
  const fetchEnvironment = async () => {
    try {
      const response = await axios.get(`${CONTROL_API}/environment`);
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
      setOperationStatus({ type: 'info', message: 'Operation in progress...' });
      const response = await axios.post(`${CONTROL_API}/operations/${endpoint}`);
      
      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || 'Operation failed' });
      }
      
      // Refresh data after operation
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      setOperationStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || error.message || 'Operation failed' 
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
    if (!confirm('Stop all services? The control panel will become unavailable.')) return;
    try {
      await axios.post(`${LEGACY_CONTROL_API}/stop-all`);
      setOperationStatus({ type: 'warning', message: 'All services stopping...' });
    } catch (error) {
      // Expected - backend will shut down
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
        Running
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-900/30 text-red-400 rounded-full border border-red-700">
        <XCircle size={12} />
        Stopped
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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-indigo-400" size={28} />
            <div>
              <h1 className="text-xl font-bold">System Control Panel</h1>
              <p className="text-sm text-gray-400">Student Management System</p>
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
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6">
          <nav className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'operations', label: 'Operations', icon: Terminal },
              { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
              { id: 'ports', label: 'Ports', icon: Server },
              { id: 'logs', label: 'Logs', icon: FileText },
              { id: 'environment', label: 'Environment', icon: Cpu }
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
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Backend</h3>
                  {status && getStatusBadge(status.backend)}
                </div>
                <p className="text-2xl font-bold text-gray-100">
                  {status?.backend ? 'Active' : 'Inactive'}
                </p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Frontend</h3>
                  {status && getStatusBadge(status.frontend)}
                </div>
                <p className="text-2xl font-bold text-gray-100">
                  {status?.frontend ? `Port ${status.frontend_port}` : 'Inactive'}
                </p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Docker</h3>
                  {status && getStatusBadge(status.docker)}
                </div>
                <p className="text-2xl font-bold text-gray-100">
                  {status?.docker ? 'Ready' : 'Not Running'}
                </p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Database</h3>
                  {status && getStatusBadge(status.database)}
                </div>
                <p className="text-2xl font-bold text-gray-100">
                  {status?.database ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Terminal size={20} />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={startFrontend}
                  disabled={loading || status?.frontend}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Play size={18} />
                  Start Frontend
                </button>
                <button
                  onClick={stopFrontend}
                  disabled={loading || !status?.frontend}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Square size={18} />
                  Stop Frontend
                </button>
                <button
                  onClick={() => fetchStatus()}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
                <button
                  onClick={stopAll}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Square size={18} />
                  Stop All
                </button>
              </div>
            </div>

            {/* System Info */}
            {status && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Cpu size={20} />
                  System Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Python Version:</span>
                    <span className="ml-2 font-mono text-gray-200">{status.python_version}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Node.js Version:</span>
                    <span className="ml-2 font-mono text-gray-200">{status.node_version || 'Not detected'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="ml-2 font-mono text-gray-200">
                      {new Date(status.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package size={20} />
                Dependency Management
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('install-frontend-deps', 'Frontend dependencies installed')}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>Install Frontend Dependencies (npm install)</span>
                  <Package size={18} />
                </button>
                <button
                  onClick={() => runOperation('install-backend-deps', 'Backend dependencies installed')}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>Install Backend Dependencies (pip install)</span>
                  <Package size={18} />
                </button>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Container size={20} />
                Docker Operations
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('docker-build', 'Docker image built successfully')}
                  disabled={loading || !status?.docker}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>Build Docker Fullstack Image</span>
                  <Container size={18} />
                </button>
                {!status?.docker && (
                  <p className="text-sm text-yellow-400">
                    Docker is not running. Please start Docker Desktop first.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trash2 size={20} />
                Maintenance
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => runOperation('cleanup', 'System cleanup completed')}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span>Clean Python Cache (__pycache__, *.pyc)</span>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">System Diagnostics</h2>
              <button
                onClick={fetchDiagnostics}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {diagnostics.map((diag, index) => (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
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
                    {diag.details && Object.keys(diag.details).length > 0 && (
                      <pre className="mt-2 text-xs bg-gray-900 p-2 rounded border border-gray-700 overflow-x-auto">
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
              <h2 className="text-lg font-semibold">Port Usage</h2>
              <button
                onClick={fetchPorts}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
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
              <h2 className="text-lg font-semibold">Backend Logs</h2>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs available</p>
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
            <h2 className="text-lg font-semibold">Environment Information</h2>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="space-y-4">
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
