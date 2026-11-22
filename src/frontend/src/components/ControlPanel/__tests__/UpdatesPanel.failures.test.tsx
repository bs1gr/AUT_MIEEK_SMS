/**
 * Plan todo 66: the Updates panel says what went wrong in the page's language.
 *
 * The body of a failure was the server's English text, and the Docker host task's texts were
 * shown as they came. The server now names each failure (`failure_reason`) and each start
 * refusal (`message_key`); the page has a sentence for each in both languages, and keeps the
 * server's text below it as the technical detail. The phases of the job are named too.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { controlApiClient } from '@/api/api';
import controlPanelEn from '@/locales/en/controlPanel.js';
import controlPanelEl from '@/locales/el/controlPanel.js';
import { UpdatesPanel } from '../UpdatesPanel';

// The English texts themselves, so a test reads what a user reads.
const lookup = (parts: string[], table: unknown): unknown =>
  parts.reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), table);
const t = (key: string, options?: Record<string, unknown>) => {
  const value = lookup((key.startsWith('controlPanel.') ? key.slice('controlPanel.'.length) : key).split('.'), controlPanelEn);
  return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options?.[name] ?? '')) : key;
};

vi.mock('@/api/api', () => ({ controlApiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../LanguageContext', () => ({ useLanguage: () => ({ t }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({ useDateTimeFormatter: () => ({ formatTime: () => '10:00' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: 'admin' } }) }));

const api = controlApiClient as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
const en = controlPanelEn as unknown as Record<string, Record<string, string>>;
const el = controlPanelEl as unknown as Record<string, Record<string, string>>;
const JOB = 'a'.repeat(32);

const check = (mode: 'lite' | 'docker') => ({
  current_version: '1.18.79',
  latest_version: '1.18.80',
  update_available: true,
  release_url: 'https://example.invalid/release',
  release_name: 'v1.18.80',
  release_body: null,
  installer_url: 'https://example.invalid/SMS_Installer_1.18.80.exe',
  installer_hash: 'ab'.repeat(32),
  docker_image_url: null,
  update_instructions: 'details',
  release_channel: 'stable',
  timestamp: '2026-11-22T10:00:00',
  deployment_mode: mode,
  update_method: mode === 'lite' ? 'installer' : 'host_task',
  host_updater_ready: mode === 'docker' ? true : null,
});

const job = (fields: Record<string, unknown>) => ({
  job_id: JOB,
  status: 'running',
  phase: 'downloading',
  progress_percent: 40,
  installer_launched: false,
  message: null,
  error: null,
  phase_history: [],
  ...fields,
});

async function update(mode: 'lite' | 'docker', status: Record<string, unknown>, start?: Record<string, unknown>) {
  api.get.mockResolvedValueOnce({ data: check(mode) });
  const user = userEvent.setup();
  render(<UpdatesPanel />);
  await user.click(screen.getByRole('button', { name: /Check for Updates/i }));
  await screen.findByTestId('update-mode-card');
  api.post.mockResolvedValue({ data: start ?? { success: true, message: 'started', details: { job_id: JOB } } });
  api.get.mockResolvedValue({ data: job(status) });
  await user.click(screen.getByTestId('update-now'));
}

describe('UpdatesPanel: what went wrong, in the page language', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names a failure in its own words and keeps the server text as the detail', async () => {
    await update('lite', {
      status: 'failed',
      phase: 'failed',
      failure_reason: 'checksum_mismatch',
      message: 'Downloaded installer failed SHA256 verification.',
      error: 'Expected aa, got bb',
    });

    expect(await screen.findByTestId('update-error-text')).toHaveTextContent(en.updateFailureReasons.checksum_mismatch);
    expect(screen.getByTestId('update-error-detail')).toHaveTextContent('Technical detail: Expected aa, got bb');
  });

  it('says a job the server no longer knows is gone, not "not_found"', async () => {
    await update('lite', { status: 'not_found', phase: 'not_found', progress_percent: 0, error: 'not_found', failure_reason: 'job_not_found' });

    expect(await screen.findByTestId('update-error-text')).toHaveTextContent(en.updateFailureReasons.job_not_found);
    expect(screen.queryByText(/^not_found$/)).not.toBeInTheDocument();
  });

  it('falls back on the server text for a reason it does not know', async () => {
    await update('lite', { status: 'failed', phase: 'failed', failure_reason: 'something_new', message: 'A new kind of failure.' });

    expect(await screen.findByTestId('update-error-text')).toHaveTextContent('A new kind of failure.');
    expect(screen.queryByTestId('update-error-detail')).not.toBeInTheDocument();
  });

  it('says why the server refused to start, by the key it sent', async () => {
    await update('docker', {}, {
      success: false,
      message: 'The host updater task is not running, so the update cannot start from here.',
      message_key: 'maintenance.update.auto_install_docker_blocked',
    });

    expect(await screen.findByTestId('update-error-text')).toHaveTextContent(en.updateStartRefusals.auto_install_docker_blocked);
    expect(screen.getByTestId('update-error-detail')).toHaveTextContent('The host updater task is not running');
  });

  it('says a finished Docker update in its own words, and names the phase', async () => {
    await update('docker', {
      status: 'completed',
      phase: 'bridge_completed',
      progress_percent: 100,
      target_version: '1.18.80',
      message: 'Updated to 1.18.80.',
      phase_history: [{ phase: 'rebuilding', status: 'running', progress_percent: 75, message: 'Rebuilding.', timestamp: '2026-11-22T10:01:00Z' }],
    });

    await waitFor(() =>
      expect(screen.getByTestId('update-install-message')).toHaveTextContent(
        'Updated to 1.18.80: SMS has started again with the new version.'
      )
    );
    expect(screen.getByTestId('updater-phase')).toHaveTextContent(en.updaterPhases.bridge_completed);
    expect(screen.getByText(en.updaterPhases.rebuilding)).toBeInTheDocument();
  });

  it('has a sentence in both languages for every failure, refusal and phase the server sends', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const repo = path.resolve(here, '../../../../../..');
    const maintenance = fs.readFileSync(path.join(repo, 'src/backend/routers/control/maintenance.py'), 'utf8');
    const watcher = fs.readFileSync(path.join(repo, 'scripts/update-watcher.ps1'), 'utf8');

    const reasons = [...(maintenance.match(/FAILURE_REASONS = \(([\s\S]*?)\)/)?.[1] ?? '').matchAll(/"(\w+)"/g)].map((m) => m[1]);
    expect(reasons.length).toBeGreaterThanOrEqual(12);
    const refusals = [...maintenance.matchAll(/success=False,[\s\S]*?message_key="maintenance\.update\.(\w+)"/g)].map((m) => m[1]);
    expect(refusals.length).toBeGreaterThanOrEqual(4);
    const phases = new Set([
      ...[...maintenance.matchAll(/phase="(\w+)"/g)].map((m) => m[1]),
      ...[...watcher.matchAll(/-Phase "(\w+)"/g)].map((m) => m[1]),
      'bridge_waiting',
    ]);
    expect(phases.size).toBeGreaterThanOrEqual(14);

    for (const table of [en, el]) {
      expect(Object.keys(table.updateFailureReasons).sort()).toEqual([...reasons].sort());
      for (const refusal of refusals) expect(table.updateStartRefusals[refusal], refusal).toBeTruthy();
      for (const phase of phases) expect(table.updaterPhases[phase], phase).toBeTruthy();
    }
  });
});
