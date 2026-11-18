import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import appI18n from '@/i18n/config';
import apiClient from '@/api/api';
import OperationsView from './OperationsView';

/**
 * Utils > Notifications: who is offered the form that sends a message to other accounts.
 *
 * The server lets an account with `notifications:manage` send, and the teacher role has that
 * permission as the administrator has. Until November 2026 the page showed the form to
 * administrators only: a teacher could send through the API and not through the page.
 */
const account = { role: 'teacher' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, email: 'someone@example.com', role: account.role } }),
}));

vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeSettings: () => ({ timeZone: 'UTC', dateFormat: 'iso', setTimeZone: vi.fn(), setDateFormat: vi.fn() }),
  useDateTimeFormatter: () => ({ formatDateTime: (value: string) => value }),
}));

vi.mock('@/api/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/api')>();
  const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
  return { ...original, default: client, apiClient: client };
});

// The other tabs of the page are not this test's subject.
vi.mock('@/components/tools/ExportCenter', () => ({ default: () => null }));
vi.mock('@/components/tools/HelpDocumentation', () => ({ default: () => null }));
vi.mock('./OperationsImportsTab', () => ({ default: () => null }));
vi.mock('./OperationsReportsTab', () => ({ default: () => null }));
vi.mock('./OperationsSettingsTab', () => ({ default: () => null }));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

const renderNotificationsTab = async (role: string, language: 'en' | 'el' = 'en') => {
  account.role = role;
  await appI18n.changeLanguage(language);
  render(
    <I18nextProvider i18n={appI18n}>
      <MemoryRouter initialEntries={['/operations?tab=notifications']}>
        <OperationsView />
      </MemoryRouter>
    </I18nextProvider>
  );
  return userEvent.setup();
};

const targets = () =>
  Array.from((screen.getByLabelText('Target audience') as HTMLSelectElement).options).map((option) => option.value);

describe('Utils > Notifications: the form that sends a message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { success: true, data: { items: [], total: 0 } } });
    post.mockResolvedValue({ data: { total_users: 3, sent_count: 3 } });
  });

  it('is offered to a teacher, and sends', async () => {
    const user = await renderNotificationsTab('teacher');

    expect(screen.queryByText('Your account is not allowed to send notifications.')).not.toBeInTheDocument();
    expect(screen.getByText('Send a message to all users or to the users of one role.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Workshop moved');
    await user.type(screen.getByLabelText('Message'), 'Tomorrow in room 4.');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith('/notifications/broadcast', {
      notification_type: 'system',
      title: 'Workshop moved',
      message: 'Tomorrow in room 4.',
      user_ids: undefined,
      role_filter: undefined,
    });
    expect(await screen.findByText('Notification broadcast sent.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('lets a teacher write to everyone or to one role, not to accounts by a number no page shows them', async () => {
    const user = await renderNotificationsTab('teacher');

    expect(targets()).toEqual(['all', 'role']);

    await user.selectOptions(screen.getByLabelText('Target audience'), 'role');
    await user.selectOptions(screen.getByLabelText('Role'), 'teacher');
    await user.type(screen.getByLabelText('Title'), 'Exam');
    await user.type(screen.getByLabelText('Message'), 'On Friday.');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({ role_filter: 'teacher', user_ids: undefined });
    expect(screen.queryByPlaceholderText('e.g., 12, 24, 57')).not.toBeInTheDocument();
  });

  it('offers an administrator all three targets, the accounts by number too', async () => {
    const user = await renderNotificationsTab('admin');

    expect(targets()).toEqual(['all', 'role', 'users']);
    expect(screen.getByText('Broadcast a message to all users, a role, or specific user IDs.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Target audience'), 'users');
    await user.type(screen.getByPlaceholderText('e.g., 12, 24, 57'), '12, 24');
    await user.type(screen.getByLabelText('Title'), 'Hello');
    await user.type(screen.getByLabelText('Message'), 'To two accounts.');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({ user_ids: [12, 24], role_filter: undefined });
  });

  it.each(['none', 'student'])('is not offered to an account whose role is %s, which is told so', async (role) => {
    await renderNotificationsTab(role);

    expect(screen.getByText('Your account is not allowed to send notifications.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send notification' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('says a refusal of the server as a refusal, not as a failure to send', async () => {
    // An installation where the permission was taken from the teacher role.
    post.mockRejectedValue({ response: { status: 403 } });
    const user = await renderNotificationsTab('teacher');

    await user.type(screen.getByLabelText('Title'), 'Workshop moved');
    await user.type(screen.getByLabelText('Message'), 'Tomorrow in room 4.');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));

    expect(await screen.findByText('Your account is not allowed to send notifications.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to send notification.')).not.toBeInTheDocument();
    // What was written is kept for another try.
    expect(screen.getByLabelText('Title')).toHaveValue('Workshop moved');
  });

  it('says any other failure as a failure to send', async () => {
    post.mockRejectedValue({ response: { status: 500 } });
    const user = await renderNotificationsTab('teacher');

    await user.type(screen.getByLabelText('Title'), 'Workshop moved');
    await user.type(screen.getByLabelText('Message'), 'Tomorrow in room 4.');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));

    expect(await screen.findByText('Failed to send notification.')).toBeInTheDocument();
  });

  it('says how many entries the feedback inbox under the form has', async () => {
    // It said "# entries": the two texts had a "#" where the number goes.
    get.mockResolvedValue({ data: { success: true, data: { items: [], total: 3 } } });
    await renderNotificationsTab('teacher');

    expect(await screen.findByText('3 entries')).toBeInTheDocument();
    expect(screen.queryByText(/# entr/)).not.toBeInTheDocument();
  });

  it('is in Greek for a teacher on a Greek page', async () => {
    await renderNotificationsTab('teacher', 'el');

    const form = screen.getByRole('tabpanel');
    expect(within(form).getByText('Αποστολή μηνύματος σε όλους τους χρήστες ή στους χρήστες ενός ρόλου.')).toBeInTheDocument();
    expect(within(form).queryByText('Ο λογαριασμός σας δεν επιτρέπεται να στέλνει ειδοποιήσεις.')).not.toBeInTheDocument();
    await appI18n.changeLanguage('en');
  });
});
