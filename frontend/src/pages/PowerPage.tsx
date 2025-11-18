import { useState } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';

export default function PowerPage() {
  const { t } = useLanguage();
  const [showSystemHealth, setShowSystemHealth] = useState(true);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [monitoringTab, setMonitoringTab] = useState<'grafana' | 'prometheus' | 'metrics'>('grafana');

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

            {/* Monitoring Content */}
            <div className="space-y-4">
              {monitoringTab === 'grafana' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">📊 Grafana Dashboard</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      {t('controlPanel.monitoring.grafanaDesc')}
                    </p>
                    <a
                      href="http://localhost:3000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      🚀 {t('controlPanel.monitoring.openGrafana')}
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <div className="mt-3 text-xs text-blue-700">
                      <strong>{t('controlPanel.monitoring.credentials')}:</strong> admin / admin
                    </div>
                  </div>
                  
                  {/* Embedded Grafana */}
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
                </div>
              )}

              {monitoringTab === 'prometheus' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">🔍 Prometheus Metrics</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      {t('controlPanel.monitoring.prometheusDesc')}
                    </p>
                    <a
                      href="http://localhost:9090"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      🚀 {t('controlPanel.monitoring.openPrometheus')}
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Embedded Prometheus */}
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
