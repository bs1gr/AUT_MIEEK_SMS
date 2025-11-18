import { useState, useEffect } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';
import axios from 'axios';

const API_BASE = window.location.origin;
const CONTROL_API = `${API_BASE}/control/api`;

interface MonitoringService {
  running: boolean;
  url: string;
  port: number;
}

interface MonitoringStatus {
  available: boolean;
  running: boolean;
  in_container?: boolean;
  can_control?: boolean;
  services: {
    grafana?: MonitoringService;
    prometheus?: MonitoringService;
    loki?: MonitoringService;
  };
  message?: string;
}

export default function PowerPage() {
  const { t } = useLanguage();
  const [showSystemHealth, setShowSystemHealth] = useState(true);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [monitoringTab, setMonitoringTab] = useState<'grafana' | 'prometheus' | 'metrics'>('grafana');
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [startingMonitoring, setStartingMonitoring] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);

  // Ensure any value we render as text is a string
  const safeText = (val: unknown, fallback = ''): string => {
    if (typeof val === 'string') return val;
    if (val == null) return fallback;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  // Fetch monitoring status
  const fetchMonitoringStatus = async () => {
    try {
      const response = await axios.get<MonitoringStatus>(`${CONTROL_API}/monitoring/status`);
      setMonitoringStatus(response.data);
      setMonitoringError(null);
    } catch (error: any) {
      console.error('Failed to fetch monitoring status:', error);
      let errorMsg = 'Failed to check monitoring status';
      if (error.response?.data) {
        const data = error.response.data;
        errorMsg = data.message || data.detail || errorMsg;
        // Handle case where detail/message might be an object
        if (typeof errorMsg === 'object') {
          errorMsg = JSON.stringify(errorMsg);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setMonitoringError(errorMsg);
    }
  };

  // Start monitoring stack
  const startMonitoringStack = async () => {
    try {
      setStartingMonitoring(true);
      setMonitoringError(null);
      
      // Use trigger endpoint which works in both container and native modes
      const endpoint = monitoringStatus?.in_container 
        ? `${CONTROL_API}/monitoring/trigger`
        : `${CONTROL_API}/monitoring/start`;
      
      const response = await axios.post(endpoint);
      
      if (response.data.success) {
        // Show different messages based on mode
        if (monitoringStatus?.in_container) {
          // In container mode, show instructions
          const details = response.data.details;
          const instructions = details?.instructions?.join('\n') || details?.instructions || '';
          setMonitoringError(null);
          alert(`✅ ${response.data.message}\n\n${instructions}\n\nAfter running the command, refresh this page to see updated status.`);
          setStartingMonitoring(false);
        } else {
          // In native mode, wait for services to come up
          setTimeout(() => {
            fetchMonitoringStatus();
            setStartingMonitoring(false);
          }, 5000);
        }
      } else {
        setMonitoringError(response.data.message || 'Failed to start monitoring');
        setStartingMonitoring(false);
      }
    } catch (error: any) {
      console.error('Failed to start monitoring:', error);
      let errorMsg = 'Failed to start monitoring stack';
      if (error.response?.data) {
        const data = error.response.data;
        errorMsg = data.message || data.detail || errorMsg;
        // Handle case where detail/message might be an object
        if (typeof errorMsg === 'object') {
          errorMsg = JSON.stringify(errorMsg);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setMonitoringError(errorMsg);
      setStartingMonitoring(false);
    }
  };

  // Check if service is accessible and start if needed
  const openServiceUrl = async (serviceName: 'grafana' | 'prometheus', url: string) => {
    // Check if monitoring is running
    if (!monitoringStatus?.services[serviceName]?.running) {
      // Show confirmation dialog
      const shouldStart = window.confirm(
        `${serviceName === 'grafana' ? 'Grafana' : 'Prometheus'} is not running. Would you like to start the monitoring stack now?\n\nThis will ${monitoringStatus?.in_container ? 'create a trigger script for you to run on the host.' : 'start Grafana, Prometheus, and Loki services.'}`
      );
      
      if (shouldStart) {
        await startMonitoringStack();
        // After starting, wait and then open the URL
        setTimeout(() => {
          window.open(url, '_blank', 'noopener,noreferrer');
        }, 8000); // Wait 8 seconds for services to be ready
      }
    } else {
      // Service is running, open directly
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Load monitoring status on mount and periodically
  useEffect(() => {
    fetchMonitoringStatus();
    
    // Refresh status every 10 seconds
    const interval = setInterval(fetchMonitoringStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const isGrafanaRunning = monitoringStatus?.services?.grafana?.running || false;
  const isPrometheusRunning = monitoringStatus?.services?.prometheus?.running || false;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">{t('controlPanel.systemHealth')}</h2>
          <button
            type="button"
            onClick={() => setShowSystemHealth((prev) => !prev)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white rounded-lg px-3 py-1.5"
          >
            {showSystemHealth ? t('controlPanel.hideSystemHealth') : t('controlPanel.showSystemHealth')}
          </button>
        </div>
        {showSystemHealth && (
          <div className="p-6">
            <ServerControl />
          </div>
        )}
      </div>

      {/* Monitoring Dashboard Section */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">{t('controlPanel.monitoring.title')}</h2>
          <button
            type="button"
            onClick={() => setShowMonitoring((prev) => !prev)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white rounded-lg px-3 py-1.5"
          >
            {showMonitoring ? t('controlPanel.monitoring.hide') : t('controlPanel.monitoring.show')}
          </button>
        </div>
        {showMonitoring && (
          <div className="p-6">
            {/* Monitoring Tabs */}
            <div className="flex space-x-2 mb-4 border-b">
              <button
                onClick={() => setMonitoringTab('grafana')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  monitoringTab === 'grafana'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📊 {t('controlPanel.monitoring.grafana')}
              </button>
              <button
                onClick={() => setMonitoringTab('prometheus')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  monitoringTab === 'prometheus'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                🔍 {t('controlPanel.monitoring.prometheus')}
              </button>
              <button
                onClick={() => setMonitoringTab('metrics')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  monitoringTab === 'metrics'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📈 {t('controlPanel.monitoring.rawMetrics')}
              </button>
            </div>

            {/* Status Banner */}
            {monitoringError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <span className="text-red-600 text-xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900">Monitoring Error</h4>
                  <p className="text-sm text-red-800">{monitoringError}</p>
                </div>
              </div>
            )}

            {/* Container Mode Info */}
            {monitoringStatus?.in_container && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex items-start gap-3">
                <span className="text-blue-600 text-xl">🐳</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">Running in Container Mode</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    You can trigger monitoring startup. The system will create a helper script that you run on your host.
                  </p>
                  <p className="text-sm text-blue-800">
                    Click "Start Monitoring Stack" to generate the trigger script with instructions.
                  </p>
                </div>
              </div>
            )}

            {startingMonitoring && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900">Starting Monitoring Stack</h4>
                  <p className="text-sm text-yellow-800">
                    Please wait while Grafana, Prometheus, and Loki services start up...
                  </p>
                </div>
              </div>
            )}

            {monitoringStatus && !monitoringStatus.available && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <span className="text-gray-600 text-xl">ℹ️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Monitoring Unavailable</h4>
                  <p className="text-sm text-gray-700">
                    {safeText(monitoringStatus.message, 'Docker or monitoring configuration is not available')}
                  </p>
                </div>
              </div>
            )}

            {/* Monitoring Content */}
            <div className="space-y-4">
              {monitoringTab === 'grafana' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          📊 Grafana Dashboard
                          {isGrafanaRunning && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ● Running
                            </span>
                          )}
                          {!isGrafanaRunning && monitoringStatus?.available && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              ○ Stopped
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-blue-800 mb-3">
                          {t('controlPanel.monitoring.grafanaDesc') || 'Visualize metrics and logs with interactive dashboards'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openServiceUrl('grafana', 'http://localhost:3000')}
                      disabled={startingMonitoring}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                      {startingMonitoring ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {monitoringStatus?.in_container ? 'Creating trigger...' : 'Starting...'}
                        </>
                      ) : (
                        <>
                          🚀 {t('controlPanel.monitoring.openGrafana') || 'Open Grafana'}
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </>
                      )}
                    </button>
                    <div className="mt-3 text-xs text-blue-700">
                      <strong>{t('controlPanel.monitoring.credentials')}:</strong> admin / admin
                    </div>
                    {!isGrafanaRunning && monitoringStatus?.available && (
                      <div className="mt-2 text-xs text-blue-600 bg-blue-100 rounded p-2">
                        💡 Clicking "Open Grafana" will automatically start the monitoring stack if it's not running
                      </div>
                    )}
                  </div>
                  
                  {/* Embedded Grafana - Only show if running */}
                  {isGrafanaRunning && (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src="http://localhost:3000/d/sms-overview/student-management-system-overview?orgId=1&refresh=30s&kiosk"
                        width="100%"
                        height="800"
                        frameBorder="0"
                        title="Grafana Dashboard"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Message when not running */}
                  {!isGrafanaRunning && monitoringStatus?.available && (
                    <div className="border border-blue-200 rounded-lg p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Grafana Not Running</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Start the monitoring stack to view Grafana dashboards
                      </p>
                      <button
                        onClick={startMonitoringStack}
                        disabled={startingMonitoring}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {startingMonitoring ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {monitoringStatus?.in_container ? 'Creating Trigger Script...' : 'Starting Monitoring Stack...'}
                          </>
                        ) : (
                          <>🚀 Start Monitoring Stack</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {monitoringTab === 'prometheus' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                          🔍 Prometheus Metrics
                          {isPrometheusRunning && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ● Running
                            </span>
                          )}
                          {!isPrometheusRunning && monitoringStatus?.available && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              ○ Stopped
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-orange-800 mb-3">
                          {t('controlPanel.monitoring.prometheusDesc') || 'Query and explore time-series metrics data'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openServiceUrl('prometheus', 'http://localhost:9090')}
                      disabled={startingMonitoring}
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed"
                    >
                      {startingMonitoring ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {monitoringStatus?.in_container ? 'Creating trigger...' : 'Starting...'}
                        </>
                      ) : (
                        <>
                          🚀 {t('controlPanel.monitoring.openPrometheus') || 'Open Prometheus'}
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </>
                      )}
                    </button>
                    {!isPrometheusRunning && monitoringStatus?.available && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-100 rounded p-2">
                        💡 Clicking "Open Prometheus" will automatically start the monitoring stack if it's not running
                      </div>
                    )}
                  </div>

                  {/* Embedded Prometheus - Only show if running */}
                  {isPrometheusRunning && (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src="http://localhost:9090/graph"
                        width="100%"
                        height="800"
                        frameBorder="0"
                        title="Prometheus"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Message when not running */}
                  {!isPrometheusRunning && monitoringStatus?.available && (
                    <div className="border border-orange-200 rounded-lg p-8 text-center bg-gradient-to-br from-orange-50 to-yellow-50">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Prometheus Not Running</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Start the monitoring stack to query metrics with Prometheus
                      </p>
                      <button
                        onClick={startMonitoringStack}
                        disabled={startingMonitoring}
                        className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed"
                      >
                        {startingMonitoring ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {monitoringStatus?.in_container ? 'Creating Trigger Script...' : 'Starting Monitoring Stack...'}
                          </>
                        ) : (
                          <>🚀 Start Monitoring Stack</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {monitoringTab === 'metrics' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">📈 Raw Application Metrics</h3>
                    <p className="text-sm text-green-800 mb-3">
                      {t('controlPanel.monitoring.metricsDesc')}
                    </p>
                    <a
                      href="http://localhost:8000/metrics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      🚀 {t('controlPanel.monitoring.viewMetrics')}
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Metrics Viewer */}
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <iframe
                      src="http://localhost:8000/metrics"
                      width="100%"
                      height="600"
                      frameBorder="0"
                      title="Application Metrics"
                      className="w-full bg-white"
                    />
                  </div>

                  {/* Quick Metrics Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">📊 Available Metrics</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• HTTP request rate & latency</li>
                        <li>• Active students & enrollments</li>
                        <li>• Database query performance</li>
                        <li>• Authentication attempts</li>
                        <li>• Cache hit/miss rates</li>
                        <li>• Error rates by endpoint</li>
                      </ul>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🔗 Additional Resources</h4>
                      <div className="space-y-2 text-sm">
                        <a href="http://localhost:9093" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800">
                          → AlertManager (Port 9093)
                        </a>
                        <a href="http://localhost:3100" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800">
                          → Loki (Port 3100)
                        </a>
                        <a href="http://localhost:8080/docs" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800">
                          → API Documentation
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">{t('controlPanel.title')}</h2>
          <button
            type="button"
            onClick={() => setShowControlPanel((prev) => !prev)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white rounded-lg px-3 py-1.5"
          >
            {showControlPanel ? t('controlPanel.hideControlPanel') : t('controlPanel.showControlPanel')}
          </button>
        </div>
        {showControlPanel && (
          <ControlPanel showTitle={false} variant="embedded" />
        )}
      </div>
    </div>
  );
}
