import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

const PwaInstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const { isInstallable, install, dismiss } = usePwaInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {t('pwa.installTitle', 'Install App')}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {t('pwa.installMessage', 'Install this application on your device for a better experience.')}
          </p>
          <button
            onClick={install}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
          >
            <Download size={16} />
            {t('pwa.installButton', 'Install')}
          </button>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label={t('common.close', 'Close')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
