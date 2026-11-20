import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InternalAxiosRequestConfig } from 'axios';
import { controlApiClient } from '@/api/api';
import authService from '@/services/authService';
import { UpdatesPanel } from '../UpdatesPanel';

vi.mock('../../../LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({ useDateTimeFormatter: () => ({ formatTime: () => '10:00' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: 'admin' } }) }));

// The Control API (control_auth.require_control_admin) lets a request in only with an admin
// login token, a loopback address or the admin token header. In the Docker edition the browser
// reaches the container from the Docker bridge (not loopback), so the token is the only way in.
// The panel used to call a bare axios, which sends no token: every Updates request answered 403.
// This test uses the real client, so it fails if the panel ever goes round it again.
describe('UpdatesPanel sends the login token', () => {
  let seen: Array<{ url?: string; authorization: string | undefined }>;
  const originalAdapter = controlApiClient.defaults.adapter;

  beforeEach(() => {
    seen = [];
    authService.setAccessToken('admin-access-token');
    controlApiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      seen.push({ url: config.url, authorization: config.headers?.get?.('Authorization') as string | undefined });
      return {
        data: {
          current_version: '1.18.74',
          latest_version: '1.18.74',
          update_available: false,
          release_url: null,
          release_name: null,
          release_body: null,
          installer_url: null,
          installer_hash: null,
          docker_image_url: null,
          update_instructions: 'details',
          release_channel: 'stable',
          deployment_mode: 'docker',
          update_method: 'host_task',
          host_updater_ready: true,
          timestamp: '2026-11-19T12:00:00',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
  });

  afterEach(() => {
    authService.clearAccessToken();
    controlApiClient.defaults.adapter = originalAdapter;
  });

  it('the update check carries the bearer token', async () => {
    const user = userEvent.setup();
    render(<UpdatesPanel />);
    await user.click(screen.getByRole('button', { name: /checkForUpdates/ }));
    await screen.findByTestId('update-mode-card');
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0].url).toBe('/maintenance/updates/check');
    expect(seen[0].authorization).toBe('Bearer admin-access-token');
  });
});
