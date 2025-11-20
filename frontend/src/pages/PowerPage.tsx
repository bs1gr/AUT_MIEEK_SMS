import { useState } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';
// Monitoring features (Grafana/Prometheus/Raw Metrics) have been removed as per v1.8.3 decision.

export default function PowerPage() {
  const { t } = useLanguage();
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);

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
