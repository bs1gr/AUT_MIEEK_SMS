import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../LanguageContext';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';

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
  release_channel: 'stable' | 'preview';
  /** lite: SMS Lite; docker: the Docker edition; native: a developer checkout (NATIVE.ps1) */
  deployment_mode: 'docker' | 'native' | 'lite';
  /** installer: SMS Lite installs only its own edition; host_task: the Docker host updater task;
   *  manual: a developer checkout, updated with git */
  update_method?: 'installer' | 'host_task' | 'manual';
  /** Docker: whether the host updater task is running */
  host_updater_ready?: boolean | null;
  timestamp: string;
}

/** How long a Docker update may keep the app unreachable (installer + rebuild) before giving up. */
const DOCKER_UPDATE_MAX_WAIT_MS = 20 * 60 * 1000;

interface UpdatesPanelProps {
  controlApi: string;
}

const UPDATER_TIMELINE_MODE_STORAGE_KEY = 'sms.controlPanel.updaterTimelineMode';

interface AutoInstallStartResponse {
  success: boolean;
  message: string;
  details?: {
    job_id?: string;
    status_endpoint?: string;
  };
}

interface AutoUpdateStatusResponse {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'not_found';
  phase: string;
  progress_percent: number;
  current_version: string | null;
  target_version: string | null;
  release_channel: 'stable' | 'preview' | null;
  release_url: string | null;
  installer_path: string | null;
  installer_sha256: string | null;
  installer_launched: boolean;
  installer_process_id: number | null;
  bytes_downloaded: number | null;
  bytes_total: number | null;
  message: string | null;
  error: string | null;
  started_at: string | null;
  updated_at: string | null;
  phase_history: Array<{
    phase: string;
    status: string;
    progress_percent: number;
    message: string | null;
    timestamp: string;
  }>;
}

export const UpdatesPanel: React.FC<UpdatesPanelProps> = ({ controlApi }) => {
  const { t } = useLanguage();
  const { formatTime } = useDateTimeFormatter();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [updaterStatus, setUpdaterStatus] = useState<AutoUpdateStatusResponse | null>(null);
  const [timelineMode, setTimelineMode] = useState<'grouped' | 'raw'>(() => {
    if (typeof window === 'undefined') {
      return 'grouped';
    }

    const stored = window.localStorage.getItem(UPDATER_TIMELINE_MODE_STORAGE_KEY);
    return stored === 'raw' ? 'raw' : 'grouped';
  });
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [releaseChannel, setReleaseChannel] = useState<'stable' | 'preview'>('stable');
  const updaterPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const groupedPhaseHistory = useMemo(() => {
    if (!updaterStatus?.phase_history?.length) {
      return [] as Array<{
        phase: string;
        status: string;
        progress_percent: number;
        message: string | null;
        timestamp: string;
        occurrences: number;
      }>;
    }

    return updaterStatus.phase_history.reduce<Array<{
      phase: string;
      status: string;
      progress_percent: number;
      message: string | null;
      timestamp: string;
      occurrences: number;
    }>>((acc, entry) => {
      const last = acc[acc.length - 1];
      if (last && last.phase === entry.phase && last.status === entry.status) {
        last.progress_percent = entry.progress_percent;
        last.message = entry.message;
        last.timestamp = entry.timestamp;
        last.occurrences += 1;
      } else {
        acc.push({
          ...entry,
          occurrences: 1,
        });
      }
      return acc;
    }, []);
  }, [updaterStatus]);

  const displayedPhaseHistory = useMemo(() => {
    if (!updaterStatus?.phase_history?.length) {
      return [] as Array<{
        phase: string;
        status: string;
        progress_percent: number;
        message: string | null;
        timestamp: string;
        occurrences: number;
      }>;
    }

    if (timelineMode === 'raw') {
      return updaterStatus.phase_history.map((entry) => ({ ...entry, occurrences: 1 }));
    }

    return groupedPhaseHistory;
  }, [groupedPhaseHistory, timelineMode, updaterStatus]);

  const stopUpdaterPolling = useCallback(() => {
    if (updaterPollRef.current) {
      clearInterval(updaterPollRef.current);
      updaterPollRef.current = null;
    }
  }, []);

  const fetchUpdaterStatus = useCallback(async (jobId: string) => {
    let status: AutoUpdateStatusResponse;
    try {
      const response = await axios.get<AutoUpdateStatusResponse>(
        `${controlApi}/maintenance/updates/auto-install/${jobId}/status`,
      );
      status = response.data;
    } catch {
      // A Docker update stops and rebuilds this very container, so the app is unreachable for a
      // few minutes: keep asking until it is back (it then reads the host task's status file).
      if (updateInfo?.deployment_mode === 'docker' && Date.now() - pollStartedAtRef.current < DOCKER_UPDATE_MAX_WAIT_MS) {
        setInstallMessage(t('updateWaitingForRestart'));
        return;
      }
      stopUpdaterPolling();
      setInstalling(false);
      setError(t('updateInstallFailed'));
      return;
    }
    setUpdaterStatus(status);

    if (status.status === 'completed') {
      stopUpdaterPolling();
      setInstalling(false);
      setInstallMessage(status.message || (t('updateInstallStarted') || 'Installer launched successfully.'));
    } else if (status.status === 'failed' || status.status === 'not_found') {
      stopUpdaterPolling();
      setInstalling(false);
      setError(status.error || status.message || (t('updateInstallFailed') || 'Automatic update failed.'));
    }
  }, [controlApi, stopUpdaterPolling, t, updateInfo?.deployment_mode]);

  const startUpdaterPolling = useCallback(async (jobId: string) => {
    stopUpdaterPolling();
    pollStartedAtRef.current = Date.now();
    await fetchUpdaterStatus(jobId);
    updaterPollRef.current = setInterval(() => {
      void fetchUpdaterStatus(jobId);
    }, updateInfo?.deployment_mode === 'docker' ? 4000 : 1200);
  }, [fetchUpdaterStatus, stopUpdaterPolling, updateInfo?.deployment_mode]);

  const checkForUpdates = useCallback(async (channel: 'stable' | 'preview') => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${controlApi}/maintenance/updates/check`, {
        params: { channel },
      });
      const data: UpdateCheckResponse = response.data;
      setUpdateInfo(data);
      setLastChecked(formatTime(new Date()));
      // Signal bell for update availability
      if (data.update_available) {
        localStorage.setItem('sms.updateAvailable', JSON.stringify({
          version: data.latest_version,
          url: data.release_url,
          timestamp: new Date().toISOString(),
        }));
      } else {
        localStorage.removeItem('sms.updateAvailable');
      }
      window.dispatchEvent(new Event('sms:update-status'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setLoading(false);
    }
  }, [controlApi, formatTime]);

  const installUpdate = useCallback(async () => {
    setInstalling(true);
    setInstallMessage(null);
    setError(null);
    setUpdaterStatus(null);

    try {
      const response = await axios.post<AutoInstallStartResponse>(`${controlApi}/maintenance/updates/auto-install`, {
        channel: releaseChannel,
        install_mode: 'silent',
      });
      if (response?.data?.success === false) {
        // e.g. Docker without the host task, or a developer checkout: the message says what to do
        setError(response.data.message || t('updateInstallFailed'));
        setInstalling(false);
        return;
      }
      setInstallMessage(response?.data?.message || t('updateInstallStarted'));
      const jobId = response?.data?.details?.job_id;
      if (jobId) {
        await startUpdaterPolling(jobId);
      } else {
        setInstalling(false);
      }
    } catch (err) {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string; message?: string } | undefined)
        : undefined;
      setError(data?.message || data?.detail || (err instanceof Error ? err.message : '') || t('updateInstallFailed'));
      setInstalling(false);
    }
  }, [controlApi, releaseChannel, startUpdaterPolling, t]);

  // No auto-check on mount — updates are only checked when the user clicks a button

  useEffect(() => () => stopUpdaterPolling(), [stopUpdaterPolling]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(UPDATER_TIMELINE_MODE_STORAGE_KEY, timelineMode);
    }
  }, [timelineMode]);

  const hasAvailableUpdate = Boolean(updateInfo?.update_available);
  const mode = updateInfo?.deployment_mode;
  const isDockerMode = mode === 'docker';
  const isLiteMode = mode === 'lite';
  const isDevCheckout = mode === 'native';
  const hostTaskReady = Boolean(updateInfo?.host_updater_ready);
  // Each edition updates itself in its own way; a developer checkout is updated with git.
  const canUseUpdateButton = hasAvailableUpdate && (
    (isLiteMode && Boolean(updateInfo?.installer_url)) || (isDockerMode && hostTaskReady)
  );
  const updateButtonLabel = isLiteMode ? t('updateLiteNow') : isDockerMode ? t('updateDockerNow') : t('updateNow');
  const updateButtonTitle = !hasAvailableUpdate
    ? t('upToDateDescription')
    : isDockerMode && !hostTaskReady
      ? t('updateHostTaskMissing')
      : isLiteMode && !updateInfo?.installer_url
        ? t('updateInstallerMissing')
        : undefined;

  return (
    <div className="space-y-6">
      {/* Check Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download size={20} />
          {t('updates') || 'System Updates'}
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            {t('updateChannel') || 'Channel'}
            <select
              value={releaseChannel}
              onChange={(e) => setReleaseChannel(e.target.value as 'stable' | 'preview')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200"
            >
              <option value="stable">{t('updateChannelStable') || 'Stable'}</option>
              <option value="preview">{t('updateChannelPreview') || 'Preview'}</option>
            </select>
          </label>
          <button
            onClick={() => checkForUpdates(releaseChannel)}
            disabled={loading || installing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('checkForUpdates') || 'Check for Updates'}
          </button>
          {!isDevCheckout && (
            <button
              onClick={installUpdate}
              disabled={loading || installing || !canUseUpdateButton}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
              title={updateButtonTitle}
              data-testid="update-now"
            >
              <Download size={16} className={installing ? 'animate-pulse' : ''} />
              {installing ? t('updateInstallingNow') : updateButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* What Update does on this installation */}
      {mode && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm" data-testid="update-mode-card">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {isLiteMode ? t('updateModeLite') : isDockerMode ? t('updateModeDocker') : t('updateModeDev')}
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            {isLiteMode ? t('updateModeLiteHint') : isDockerMode ? t('updateModeDockerHint') : t('updateModeDevHint')}
          </p>
          {isDockerMode && !hostTaskReady && (
            <p className="mt-2 text-amber-700 dark:text-amber-400" data-testid="host-task-missing">
              {t('updateHostTaskMissing')}
            </p>
          )}
        </div>
      )}

      {/* Last Checked */}
      {lastChecked && (
        <p className="text-xs text-gray-400">
          {t('lastChecked') || 'Last checked'}: {lastChecked}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">{t('updateCheckError') || 'Error checking for updates'}</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {installMessage && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-400 shrink-0 mt-0.5" />
          <p className="text-green-300 text-sm">{installMessage}</p>
        </div>
      )}

      {updaterStatus && (
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">{t('updaterTimelineTitle') || 'Smart Updater Timeline'}</h3>
            <span className="text-xs text-gray-400">
              {(t('updaterPhase') || 'Phase')}: {updaterStatus.phase}
            </span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 transition-all duration-300 ${updaterStatus.status === 'failed' ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, updaterStatus.progress_percent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
            <p>{t('updaterProgress') || 'Progress'}: {updaterStatus.progress_percent}%</p>
            <p>{t('updaterInstallerState') || 'Installer'}: {updaterStatus.installer_launched ? (t('updaterInstallerLaunched') || 'Launched') : (t('updaterInstallerPending') || 'Pending')}</p>
            {typeof updaterStatus.bytes_downloaded === 'number' && (
              <p>
                {t('updaterDownloadBytes') || 'Downloaded'}: {updaterStatus.bytes_downloaded.toLocaleString()}
                {typeof updaterStatus.bytes_total === 'number' ? ` / ${updaterStatus.bytes_total.toLocaleString()}` : ''}
              </p>
            )}
            {updaterStatus.installer_process_id && (
              <p>{t('updaterProcessId') || 'Process ID'}: {updaterStatus.installer_process_id}</p>
            )}
          </div>

          {updaterStatus.message && (
            <p className="text-xs text-gray-300">{updaterStatus.message}</p>
          )}

          {displayedPhaseHistory.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-xs font-semibold text-gray-300">{t('updaterAuditTrail') || 'Audit trail'}</p>
                <div className="inline-flex rounded border border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTimelineMode('grouped')}
                    className={`px-2 py-1 text-xs ${timelineMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {t('updaterModeGrouped') || 'Grouped'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode('raw')}
                    className={`px-2 py-1 text-xs border-l border-gray-600 ${timelineMode === 'raw' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {t('updaterModeRaw') || 'Raw'}
                  </button>
                </div>
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {displayedPhaseHistory.map((entry, index) => (
                  <li key={`${entry.phase}-${entry.timestamp}-${index}`} className="text-xs text-gray-400 flex flex-wrap gap-2">
                    <span className="text-gray-300">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                    <span>{entry.phase}</span>
                    <span className="text-gray-500">({entry.status})</span>
                    {typeof entry.progress_percent === 'number' && <span>{entry.progress_percent}%</span>}
                    {timelineMode === 'grouped' && entry.occurrences > 1 && <span className="text-gray-500">{t('updaterOccurrences', { count: entry.occurrences }) || `${entry.occurrences}x`}</span>}
                    {entry.message && <span className="text-gray-500">- {entry.message}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Update Status */}
      {updateInfo && (
        <>
          {/* Current Version Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('currentVersion') || 'Current Version'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{updateInfo.current_version}</p>
              </div>
              {updateInfo.latest_version && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('latestVersion') || 'Latest Version'}</p>
                  <p className="text-2xl font-bold text-indigo-400">{updateInfo.latest_version}</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Status Banner */}
          {updateInfo.update_available ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6 flex items-start gap-4">
              <CheckCircle size={24} className="text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-300 mb-2">
                  {t('updateAvailable') || 'Update Available'}
                </h3>
                <p className="text-sm text-green-200 mb-4">
                  {t('updateAvailableDescription') || 'A new version is available. Review the changes and follow the instructions below to update.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-indigo-100 bg-linear-to-r/srgb from-indigo-50 to-purple-50 rounded-lg p-6 flex items-start gap-4">
              <CheckCircle size={24} className="text-indigo-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                  {t('upToDate') || 'Up to Date'}
                </h3>
                <p className="text-sm text-indigo-700">
                  {t('upToDateDescription') || 'You are running the latest version of the application.'}
                </p>
              </div>
            </div>
          )}

          {/* Release Information */}
          {(updateInfo.release_name || updateInfo.release_url || updateInfo.latest_version) && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ExternalLink size={18} />
                {t('releaseInfo') || 'Release Information'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('releaseName') || 'Release Name'}</p>
                  <p className="text-gray-900 dark:text-white">{updateInfo.release_name || `v${updateInfo.latest_version || updateInfo.current_version}`}</p>
                </div>
                {updateInfo.release_url && (
                  <a
                    href={updateInfo.release_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={16} />
                    {t('viewOnGitHub') || 'View on GitHub'}
                  </a>
                )}
                {updateInfo.release_body && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">{t('changelog') || 'Changelog'}</p>
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
                {t('downloadAssets') || 'Download Assets'}
              </h3>
              <div className="space-y-3">
                {updateInfo.installer_url && (
                  <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-blue-300">{t('windowsInstaller') || 'Windows Installer'}</p>
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
                        {t('sha256')}: {updateInfo.installer_hash}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Update Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">
              {t('updateInstructions') || 'Update Instructions'}
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
          <span className="ml-3 text-gray-400">{t('checkingForUpdates') || 'Checking for updates...'}</span>
        </div>
      )}
    </div>
  );
};

export default UpdatesPanel;
