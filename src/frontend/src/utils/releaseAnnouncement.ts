/**
 * Shared state of the new-release announcement (ReleaseAnnouncementBanner) and the notification
 * bell's update entry, which the Control Panel's own update check also writes.
 */
export const RELEASE_DISMISSED_KEY = 'sms.releaseAnnouncementDismissed';
export const UPDATE_AVAILABLE_KEY = 'sms.updateAvailable';
export const UPDATE_STATUS_EVENT = 'sms:update-status';

export const readDismissedRelease = (): string | null => {
  try { return localStorage.getItem(RELEASE_DISMISSED_KEY); } catch { return null; }
};

/** "Later" on the banner and dismissing the bell entry both hide this version until the next one. */
export function dismissReleaseAnnouncement(version: string) {
  try {
    localStorage.setItem(RELEASE_DISMISSED_KEY, version);
    localStorage.removeItem(UPDATE_AVAILABLE_KEY);
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(UPDATE_STATUS_EVENT));
}

/** Show a published release in the bell, unless the user already dismissed that version. */
export function announceReleaseInBell(version: string, url: string | null) {
  if (readDismissedRelease() === version) return;
  try {
    localStorage.setItem(UPDATE_AVAILABLE_KEY, JSON.stringify({ version, url, timestamp: new Date().toISOString() }));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(UPDATE_STATUS_EVENT));
}
