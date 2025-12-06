import { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../LanguageContext';

interface UpdateCheckResponse {
  current_version: string;
  latest_version: string | null;
  update_available: boolean;
  release_url: string | null;
  release_name: string | null;
  release_body: string | null;
  installer_url: string | null;
  installer_hash: string | null;
  docker_image_url: string | null;
  update_instructions: string;
  timestamp: string;
}

interface UpdatesPanelProps {
  controlApi: string;
}

export const UpdatesPanel: React.FC<UpdatesPanelProps> = ({ controlApi }) => {
  const { t } = useLanguage();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${controlApi}/maintenance/updates/check`);
      setUpdateInfo(response.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
    // Auto-check every 6 hours
    const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [controlApi]);

  return (
    <div className="space-y-6">
      {/* Check Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download size={20} />
          {t('controlPanel.updates') || 'System Updates'}
        </h2>
        <button
          onClick={checkForUpdates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('controlPanel.checkForUpdates') || 'Check for Updates'}
        </button>
      </div>

      {/* Last Checked */}
      {lastChecked && (
        <p className="text-xs text-gray-400">
          {t('controlPanel.lastChecked') || 'Last checked'}: {lastChecked}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">{t('controlPanel.updateCheckError') || 'Error checking for updates'}</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Update Status */}
      {updateInfo && (
        <>
          {/* Current Version Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('controlPanel.currentVersion') || 'Current Version'}</p>
                <p className="text-2xl font-bold text-white">{updateInfo.current_version}</p>
              </div>
              {updateInfo.latest_version && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('controlPanel.latestVersion') || 'Latest Version'}</p>
                  <p className="text-2xl font-bold text-indigo-400">{updateInfo.latest_version}</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Status Banner */}
          {updateInfo.update_available ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6 flex items-start gap-4">
              <CheckCircle size={24} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-300 mb-2">
                  {t('controlPanel.updateAvailable') || 'Update Available'}
                </h3>
                <p className="text-sm text-green-200 mb-4">
                  {t('controlPanel.updateAvailableDescription') || 'A new version is available. Review the changes and follow the instructions below to update.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 flex items-start gap-4">
              <CheckCircle size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  {t('controlPanel.upToDate') || 'Up to Date'}
                </h3>
                <p className="text-sm text-blue-200">
                  {t('controlPanel.upToDateDescription') || 'You are running the latest version of the application.'}
                </p>
              </div>
            </div>
          )}

          {/* Release Information */}
          {updateInfo.release_name && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ExternalLink size={18} />
                {t('controlPanel.releaseInfo') || 'Release Information'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('controlPanel.releaseName') || 'Release Name'}</p>
                  <p className="text-white">{updateInfo.release_name}</p>
                </div>
                {updateInfo.release_url && (
                  <a
                    href={updateInfo.release_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={16} />
                    {t('controlPanel.viewOnGitHub') || 'View on GitHub'}
                  </a>
                )}
                {updateInfo.release_body && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">{t('controlPanel.changelog') || 'Changelog'}</p>
                    <pre className="text-xs bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto max-h-64 overflow-y-auto text-gray-300">
                      {updateInfo.release_body}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download Information */}
          {updateInfo.update_available && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download size={18} />
                {t('controlPanel.downloadAssets') || 'Download Assets'}
              </h3>
              <div className="space-y-3">
                {updateInfo.installer_url && (
                  <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-blue-300">{t('controlPanel.windowsInstaller') || 'Windows Installer'}</p>
                    </div>
                    <a
                      href={updateInfo.installer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
                    >
                      {updateInfo.installer_url.split('/').pop()}
                    </a>
                    {updateInfo.installer_hash && (
                      <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                        SHA256: {updateInfo.installer_hash}
                      </p>
                    )}
                  </div>
                )}
                {updateInfo.docker_image_url && (
                  <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                    <p className="font-semibold text-purple-300 mb-2">{t('controlPanel.dockerImage') || 'Docker Image'}</p>
                    <a
                      href={updateInfo.docker_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {t('controlPanel.viewDockerPackages') || 'View Docker Packages'}
                    </a>
                    <p className="text-xs text-gray-400 mt-2">
                      {t('controlPanel.dockerImageInfo') || 'To update Docker deployment, run: .\\DOCKER.ps1 -UpdateClean'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Update Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">
              {t('controlPanel.updateInstructions') || 'Update Instructions'}
            </h3>
            <pre className="text-sm bg-gray-900 p-4 rounded border border-gray-700 overflow-x-auto text-blue-300 whitespace-pre-wrap">
              {updateInfo.update_instructions}
            </pre>
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && !updateInfo && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-400" size={24} />
          <span className="ml-3 text-gray-400">{t('controlPanel.checkingForUpdates') || 'Checking for updates...'}</span>
        </div>
      )}
    </div>
  );
};

export default UpdatesPanel;
