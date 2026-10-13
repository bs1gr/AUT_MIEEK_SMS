import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { UpdatesPanel } from '../UpdatesPanel';

vi.mock('axios');
vi.mock('../../../LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({ useDateTimeFormatter: () => ({ formatTime: () => '10:00' }) }));

const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; isAxiosError: (e: unknown) => boolean };

const check = (overrides: Record<string, unknown>) => ({
  current_version: '1.18.56',
  latest_version: '1.18.57',
  update_available: true,
  release_url: 'https://example.invalid/release',
  release_name: 'v1.18.57',
  release_body: null,
  installer_url: 'https://example.invalid/SMS_Installer_1.18.57.exe',
  installer_hash: 'ab'.repeat(32),
  docker_image_url: null,
  update_instructions: 'details',
  release_channel: 'stable',
  timestamp: '2026-10-13T10:00:00',
  ...overrides,
});

async function openWith(data: Record<string, unknown>) {
  mockedAxios.get.mockResolvedValue({ data });
  const user = userEvent.setup();
  render(<UpdatesPanel controlApi="/control/api" />);
  await user.click(screen.getByRole('button', { name: /checkForUpdates/ }));
  await screen.findByTestId('update-mode-card');
  return user;
}

// Update used to treat SMS Lite and a developer checkout alike ("native": run the full installer)
// and Docker as one button whatever the host could do. Each mode now gets its own action.
describe('UpdatesPanel per deployment mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.isAxiosError = () => false;
  });

  it('SMS Lite: one-click update of SMS Lite itself', async () => {
    const user = await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    expect(screen.getByTestId('update-mode-card')).toHaveTextContent('updateModeLite');
    const button = screen.getByTestId('update-now');
    expect(button).toHaveTextContent('updateLiteNow');
    expect(button).toBeEnabled();

    mockedAxios.post.mockResolvedValue({ data: { success: true, message: 'started', details: { job_id: 'a'.repeat(32) } } });
    mockedAxios.get.mockResolvedValue({ data: { job_id: 'a'.repeat(32), status: 'completed', phase: 'completed', progress_percent: 100, installer_launched: true, message: 'closing', phase_history: [] } });
    await user.click(button);
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledWith('/control/api/maintenance/updates/auto-install', expect.anything()));
  });

  it('Docker with the host task running: one-click update on the host', async () => {
    await openWith(check({ deployment_mode: 'docker', update_method: 'host_task', host_updater_ready: true }));
    expect(screen.getByTestId('update-mode-card')).toHaveTextContent('updateModeDocker');
    expect(screen.getByTestId('update-now')).toHaveTextContent('updateDockerNow');
    expect(screen.getByTestId('update-now')).toBeEnabled();
    expect(screen.queryByTestId('host-task-missing')).not.toBeInTheDocument();
  });

  it('Docker without the host task: the button is off and says why', async () => {
    await openWith(check({ deployment_mode: 'docker', update_method: 'host_task', host_updater_ready: false }));
    expect(screen.getByTestId('update-now')).toBeDisabled();
    expect(screen.getByTestId('update-now')).toHaveAttribute('title', 'updateHostTaskMissing');
    expect(screen.getByTestId('host-task-missing')).toBeInTheDocument();
  });

  it('developer checkout: no installer button, only the git steps', async () => {
    await openWith(check({ deployment_mode: 'native', update_method: 'manual' }));
    expect(screen.queryByTestId('update-now')).not.toBeInTheDocument();
    expect(screen.getByTestId('update-mode-card')).toHaveTextContent('updateModeDevHint');
  });

  it('shows the server message when it refuses the update', async () => {
    const user = await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    mockedAxios.post.mockResolvedValue({ data: { success: false, message: 'Automatic installer updates are currently supported on Windows only.' } });
    await user.click(screen.getByTestId('update-now'));
    expect(await screen.findByText(/supported on Windows only/)).toBeInTheDocument();
  });
});
