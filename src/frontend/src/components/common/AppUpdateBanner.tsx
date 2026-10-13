import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { isCapacitorApp } from '@/utils/serverUrl';

const RELEASES_API = 'https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases/latest';
const DISMISSED_KEY = 'sms.appUpdateDismissedVersion';
const APK_ASSET = /^SMS_Android_.*\.apk$/;

/** True when version a is newer than b ("1.18.57" vs "v1.18.56"). */
export function isNewerVersion(a: string, b: string): boolean {
  const parts = (v: string) => v.replace(/^v/i, '').split('.').map((p) => Number.parseInt(p, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

interface LatestApk {
  version: string;
  url: string;
}

/**
 * Android app only: the phone app updates separately from the server it talks to. It compares its
 * own build version with the latest release and, when a newer APK is published, offers it. The
 * download opens in the phone's browser and Android asks to install it. "Later" hides the offer
 * until the next version.
 */
export default function AppUpdateBanner({ currentVersion = import.meta.env.VITE_APP_VERSION }: { currentVersion?: string }) {
  const { t } = useTranslation('common');
  const [latest, setLatest] = useState<LatestApk | null>(null);

  useEffect(() => {
    if (!isCapacitorApp() || !currentVersion || currentVersion === 'dev') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) return;
        const release = (await response.json()) as { tag_name?: string; assets?: Array<{ name?: string; browser_download_url?: string }> };
        const version = String(release.tag_name || '').replace(/^v/i, '');
        const apk = (release.assets || []).find((a) => APK_ASSET.test(a.name || '') && a.browser_download_url);
        if (!version || !apk || !isNewerVersion(version, currentVersion)) return;
        let dismissed: string | null = null;
        try { dismissed = localStorage.getItem(DISMISSED_KEY); } catch { /* storage unavailable */ }
        if (dismissed === version || cancelled) return;
        setLatest({ version, url: apk.browser_download_url as string });
      } catch {
        // Offline or GitHub unreachable: check again next time the app starts.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  if (!latest) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, latest.version); } catch { /* storage unavailable */ }
    setLatest(null);
  };

  return (
    <div
      role="status"
      data-testid="app-update-banner"
      className="flex flex-wrap items-center gap-3 bg-indigo-600 px-4 py-2 text-sm text-white"
    >
      <span className="flex-1">{t('appUpdateAvailable', { version: latest.version })}</span>
      <a
        href={latest.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded bg-white px-3 py-1 font-semibold text-indigo-700"
        data-testid="app-update-download"
      >
        <Download size={14} aria-hidden="true" /> {t('appUpdateDownload')}
      </a>
      <button type="button" onClick={dismiss} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-indigo-500">
        <X size={14} aria-hidden="true" /> {t('appUpdateLater')}
      </button>
    </div>
  );
}
