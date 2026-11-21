import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { controlApiClient } from '@/api/api';
import { UpdatesPanel } from '../UpdatesPanel';

// The panel talks to the Control API through controlApiClient (it carries the login token);
// UpdatesPanel.auth.test.tsx proves the token really goes out.
vi.mock('@/api/api', () => ({ controlApiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({ useDateTimeFormatter: () => ({ formatTime: () => '10:00' }) }));
const auth = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: auth.role } }) }));

const mockedAxios = controlApiClient as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

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
  render(<UpdatesPanel />);
  await user.click(screen.getByRole('button', { name: /checkForUpdates/ }));
  await screen.findByTestId('update-mode-card');
  return user;
}

// Update used to treat SMS Lite and a developer checkout alike ("native": run the full installer)
// and Docker as one button whatever the host could do. Each mode now gets its own action.
describe('UpdatesPanel per deployment mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'admin';
  });

  // Since 2026-11-20 the server installs an update for a signed-in administrator only, also on
  // the PC itself; the page says so instead of offering a button that would be refused.
  it('a teacher may check, but the install button is off and says why', async () => {
    auth.role = 'teacher';
    await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    expect(screen.getByTestId('update-now')).toBeDisabled();
    expect(screen.getByTestId('update-now')).toHaveAttribute('title', 'updateNeedsAdmin');
    expect(screen.getByTestId('update-needs-admin')).toBeInTheDocument();
  });

  it('an administrator is not shown the note', async () => {
    await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    expect(screen.queryByTestId('update-needs-admin')).not.toBeInTheDocument();
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
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledWith('/maintenance/updates/auto-install', expect.anything()));
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

// The owner's screenshot of a failed SMS Lite update (2026-11-21): the failure was titled "Error
// checking for updates", and the server's English "Smart updater started…" stayed beside it on a
// Greek page.
describe('UpdatesPanel messages while updating', () => {
  const jobId = 'b'.repeat(32);
  const started = {
    data: { success: true, message: 'Smart updater started. Track progress from the updater timeline.', details: { job_id: jobId } },
  };
  const job = (overrides: Record<string, unknown>) => ({
    data: { job_id: jobId, phase: 'downloading', progress_percent: 10, installer_launched: false, message: null, error: null, phase_history: [], ...overrides },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'admin';
  });

  it('a failed install is titled as a failed update, and the note that it started goes', async () => {
    const user = await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    mockedAxios.post.mockResolvedValue(started);
    mockedAxios.get.mockResolvedValue(job({
      status: 'failed',
      phase: 'failed',
      message: 'Updater job failed unexpectedly.',
      error: "[WinError 5] Access is denied: 'C:\\Program Files\\SMS\\_internal\\artifacts'",
    }));
    await user.click(screen.getByTestId('update-now'));

    expect(await screen.findByText(/WinError 5/)).toBeInTheDocument();
    expect(screen.getByText('updateInstallFailed')).toBeInTheDocument();
    expect(screen.queryByText('updateCheckError')).not.toBeInTheDocument();
    expect(screen.queryByText(/Smart updater started/)).not.toBeInTheDocument();
    expect(screen.queryByText('updateLiteStarted')).not.toBeInTheDocument();
  });

  it('the start of an update is told in the page language, not in the server English', async () => {
    const user = await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    mockedAxios.post.mockResolvedValue(started);
    mockedAxios.get.mockResolvedValue(job({ status: 'running' }));
    await user.click(screen.getByTestId('update-now'));

    expect(await screen.findByText('updateLiteStarted')).toBeInTheDocument();
    expect(screen.queryByText(/Smart updater started/)).not.toBeInTheDocument();
  });

  it('SMS Lite closing for the installer is told in the page language', async () => {
    const user = await openWith(check({ deployment_mode: 'lite', update_method: 'installer' }));
    mockedAxios.post.mockResolvedValue(started);
    mockedAxios.get.mockResolvedValue(job({
      status: 'completed',
      phase: 'completed',
      progress_percent: 100,
      installer_launched: true,
      message: 'SMS Lite is closing to update and will start again in about a minute.',
    }));
    await user.click(screen.getByTestId('update-now'));

    expect(await screen.findByText('updateLiteRestarting')).toBeInTheDocument();
  });

  it('a failed check keeps the check title', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    const user = userEvent.setup();
    render(<UpdatesPanel />);
    await user.click(screen.getByRole('button', { name: /checkForUpdates/ }));

    expect(await screen.findByText('updateCheckError')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.queryByText('updateInstallFailed')).not.toBeInTheDocument();
  });
});
