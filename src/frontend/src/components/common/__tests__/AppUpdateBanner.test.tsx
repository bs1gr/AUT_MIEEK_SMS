import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppUpdateBanner, { isNewerVersion } from '../AppUpdateBanner';

const capacitor = vi.hoisted(() => ({ value: true }));
vi.mock('@/utils/serverUrl', () => ({ isCapacitorApp: () => capacitor.value }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { version?: string }) => (opts?.version ? `${key}:${opts.version}` : key) }),
}));

const release = (tag: string, assets = [{ name: `SMS_Android_${tag.replace(/^v/, '')}.apk`, browser_download_url: 'https://example.invalid/app.apk' }]) => ({
  ok: true,
  json: async () => ({ tag_name: tag, assets }),
});

// The phone app updates separately from its server: it offers a newer published APK itself.
describe('AppUpdateBanner', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capacitor.value = true;
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('offers a newer APK in the Android app', async () => {
    fetchMock.mockResolvedValue(release('v1.18.57'));
    render(<AppUpdateBanner currentVersion="1.18.56" />);
    expect(await screen.findByTestId('app-update-banner')).toHaveTextContent('appUpdateAvailable:1.18.57');
    expect(screen.getByTestId('app-update-download')).toHaveAttribute('href', 'https://example.invalid/app.apk');
  });

  it('says nothing when the app is up to date or the release has no APK', async () => {
    fetchMock.mockResolvedValueOnce(release('v1.18.56'));
    const { unmount } = render(<AppUpdateBanner currentVersion="1.18.56" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('app-update-banner')).not.toBeInTheDocument();
    unmount();

    fetchMock.mockResolvedValueOnce(release('v1.18.57', [{ name: 'SMS_Installer_1.18.57.exe', browser_download_url: 'https://example.invalid/i.exe' }]));
    render(<AppUpdateBanner currentVersion="1.18.56" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('app-update-banner')).not.toBeInTheDocument();
  });

  it('does not check outside the Android app', () => {
    capacitor.value = false;
    render(<AppUpdateBanner currentVersion="1.18.56" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('"Later" hides the offer until the next version', async () => {
    fetchMock.mockResolvedValue(release('v1.18.57'));
    const user = userEvent.setup();
    const { unmount } = render(<AppUpdateBanner currentVersion="1.18.56" />);
    await user.click(await screen.findByRole('button', { name: /appUpdateLater/ }));
    expect(screen.queryByTestId('app-update-banner')).not.toBeInTheDocument();
    unmount();

    render(<AppUpdateBanner currentVersion="1.18.56" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('app-update-banner')).not.toBeInTheDocument();
  });

  it('compares versions numerically', () => {
    expect(isNewerVersion('1.18.57', '1.18.56')).toBe(true);
    expect(isNewerVersion('v1.18.10', '1.18.9')).toBe(true);
    expect(isNewerVersion('1.18.56', 'v1.18.56')).toBe(false);
    expect(isNewerVersion('1.18.5', '1.18.56')).toBe(false);
  });
});
