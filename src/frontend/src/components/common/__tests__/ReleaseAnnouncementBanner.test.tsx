import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseAnnouncementBanner from '../ReleaseAnnouncementBanner';
import apiClient from '@/api/api';
import { dismissReleaseAnnouncement } from '@/utils/releaseAnnouncement';

const capacitor = vi.hoisted(() => ({ value: false }));
const auth = vi.hoisted(() => ({ role: 'teacher' }));
vi.mock('@/utils/serverUrl', () => ({ isCapacitorApp: () => capacitor.value }));
vi.mock('@/api/api', () => ({ default: { get: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: auth.role } }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { version?: string }) => (opts?.version ? `${key}:${opts.version}` : key) }),
}));

const get = vi.mocked(apiClient.get);
const answer = (latest: string, updateAvailable = true) =>
  get.mockResolvedValue({
    data: { latest_version: latest, update_available: updateAvailable, release_url: `https://example.invalid/releases/v${latest}` },
  });

// Owner, 2026-10-13: every new release is announced to every signed-in user.
describe('ReleaseAnnouncementBanner', () => {
  beforeEach(() => {
    capacitor.value = false;
    auth.role = 'teacher';
    localStorage.clear();
    get.mockReset();
  });

  it('announces a newer release to any user, with the release notes, and puts it in the bell', async () => {
    answer('1.18.58');
    render(<ReleaseAnnouncementBanner />);
    expect(await screen.findByTestId('release-announcement-banner')).toHaveTextContent('releaseAnnouncement:1.18.58');
    expect(get).toHaveBeenCalledWith('/notifications/release-announcement');
    expect(screen.getByTestId('release-announcement-notes')).toHaveAttribute('href', 'https://example.invalid/releases/v1.18.58');
    expect(screen.queryByTestId('release-announcement-install')).not.toBeInTheDocument(); // teachers can't install
    expect(JSON.parse(localStorage.getItem('sms.updateAvailable') || '{}').version).toBe('1.18.58');
  });

  it('gives admins an Install link to Control Panel > Updates', async () => {
    auth.role = 'admin';
    answer('1.18.58');
    render(<ReleaseAnnouncementBanner />);
    expect(await screen.findByTestId('release-announcement-install')).toHaveAttribute('href', '#/power?showControl=1&tab=updates');
  });

  it('says nothing when the installed version is the latest', async () => {
    answer('1.18.57', false);
    render(<ReleaseAnnouncementBanner />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByTestId('release-announcement-banner')).not.toBeInTheDocument();
    expect(localStorage.getItem('sms.updateAvailable')).toBeNull();
  });

  it('"Later" hides that version (banner and bell) until the next release', async () => {
    answer('1.18.58');
    const user = userEvent.setup();
    const { unmount } = render(<ReleaseAnnouncementBanner />);
    await user.click(await screen.findByRole('button', { name: /appUpdateLater/ }));
    expect(screen.queryByTestId('release-announcement-banner')).not.toBeInTheDocument();
    expect(localStorage.getItem('sms.updateAvailable')).toBeNull();
    unmount();

    render(<ReleaseAnnouncementBanner />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('release-announcement-banner')).not.toBeInTheDocument();
    expect(localStorage.getItem('sms.updateAvailable')).toBeNull();
    unmount();

    answer('1.18.59');
    render(<ReleaseAnnouncementBanner />);
    expect(await screen.findByTestId('release-announcement-banner')).toHaveTextContent('releaseAnnouncement:1.18.59');
  });

  it('dismissing the bell entry hides the banner too', async () => {
    answer('1.18.58');
    render(<ReleaseAnnouncementBanner />);
    await screen.findByTestId('release-announcement-banner');
    dismissReleaseAnnouncement('1.18.58');
    await waitFor(() => expect(screen.queryByTestId('release-announcement-banner')).not.toBeInTheDocument());
  });

  it('leaves the Android app to its own APK offer', () => {
    capacitor.value = true;
    render(<ReleaseAnnouncementBanner />);
    expect(get).not.toHaveBeenCalled();
  });
});
