import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const PwaReloadPrompt: React.FC = () => {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r?: ServiceWorkerRegistration) {
      if (r) {
        // Check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: Error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {offlineReady ? t('pwa.offlineReadyTitle', 'App ready to work offline') : t('pwa.updateAvailableTitle', 'New content available')}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {offlineReady
              ? t('pwa.offlineReadyMessage', 'This app has been cached and can now be used offline.')
              : t('pwa.updateAvailableMessage', 'Click reload to update to the latest version.')}
          </p>
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              {t('common.reload', 'Reload')}
            </button>
          )}
        </div>
        <button onClick={close} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default PwaReloadPrompt;
