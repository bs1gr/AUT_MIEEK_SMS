import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import apiClient from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { isCapacitorApp } from '@/utils/serverUrl';
import {
  UPDATE_STATUS_EVENT,
  announceReleaseInBell,
  dismissReleaseAnnouncement,
  readDismissedRelease,
} from '@/utils/releaseAnnouncement';

/** Ask the server again this often; it asks GitHub at most every 6 hours for everyone. */
const RECHECK_MS = 60 * 60 * 1000;

interface Announcement {
  latest_version: string | null;
  update_available: boolean;
  release_url?: string | null;
}

/**
 * Owner, 2026-10-13: every time a new release is published, every signed-in user is told, with a
 * banner on every page and an entry in the notification bell. "What's new" opens the release
 * notes; admins also get "Install" (Control Panel > Updates). The Android app has its own APK
 * offer (AppUpdateBanner), so this one is for the browser and desktop editions.
 */
export default function ReleaseAnnouncementBanner() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(readDismissedRelease);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (isCapacitorApp()) return undefined;
    let cancelled = false;
    const check = async () => {
      try {
        const { data } = await apiClient.get<Announcement>('/notifications/release-announcement');
        if (cancelled) return;
        setAnnouncement(data);
        const version = data?.update_available ? data.latest_version : null;
        if (version) announceReleaseInBell(version, data.release_url ?? null);
      } catch {
        // Server or GitHub unreachable: try again at the next check.
      }
    };
    void check();
    const timer = window.setInterval(check, RECHECK_MS);
    const onBellChange = () => setDismissed(readDismissedRelease());
    window.addEventListener(UPDATE_STATUS_EVENT, onBellChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(UPDATE_STATUS_EVENT, onBellChange);
    };
  }, []);

  const version = announcement?.update_available ? announcement.latest_version : null;
  if (!version || dismissed === version) return null;

  return (
    <div
      role="status"
      data-testid="release-announcement-banner"
      className="flex flex-wrap items-center gap-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
    >
      <Sparkles size={16} aria-hidden="true" />
      <span className="flex-1 font-medium">{t('releaseAnnouncement', { version })}</span>
      {announcement?.release_url && (
        <a
          href={announcement.release_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded bg-white px-3 py-1 font-semibold text-indigo-700"
          data-testid="release-announcement-notes"
        >
          <ExternalLink size={14} aria-hidden="true" /> {t('releaseAnnouncementWhatsNew')}
        </a>
      )}
      {isAdmin && (
        <a
          href="#/power?showControl=1&tab=updates"
          className="inline-flex items-center gap-1 rounded border border-white/70 px-3 py-1 font-semibold hover:bg-indigo-500"
          data-testid="release-announcement-install"
        >
          <Download size={14} aria-hidden="true" /> {t('releaseAnnouncementInstall')}
        </a>
      )}
      <button
        type="button"
        onClick={() => { dismissReleaseAnnouncement(version); setDismissed(version); }}
        className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-indigo-500"
      >
        <X size={14} aria-hidden="true" /> {t('appUpdateLater')}
      </button>
    </div>
  );
}
