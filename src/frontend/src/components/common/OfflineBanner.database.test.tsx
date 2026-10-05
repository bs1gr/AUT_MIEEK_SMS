import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { setDatabaseUnavailable } from '@/utils/databaseAvailability';
import OfflineBanner from './OfflineBanner';

const network = vi.hoisted(() => ({
  isOnline: true,
  wasOffline: false,
  pendingSyncCount: 0,
  pendingByFeature: { students: 0, attendance: 0, grades: 0 },
}));
const local = vi.hoisted(() => ({ mode: false }));

vi.mock('@/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => network }));
vi.mock('@/utils/serverUrl', () => ({ isLocalMode: () => local.mode }));

async function renderBanner(language: 'en' | 'el' = 'en') {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <OfflineBanner />
    </I18nextProvider>
  );
}

describe('OfflineBanner: server database unreachable', () => {
  beforeEach(() => {
    setDatabaseUnavailable(false);
    local.mode = false;
    Object.assign(network, { isOnline: true, wasOffline: false, pendingSyncCount: 0 });
    network.pendingByFeature = { students: 0, attendance: 0, grades: 0 };
  });

  it('shows nothing while online with the database reachable and nothing queued', async () => {
    const { container } = await renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('warns while online if the database is unreachable, with what is kept on this device', async () => {
    setDatabaseUnavailable(true);
    Object.assign(network, { pendingSyncCount: 2 });
    network.pendingByFeature = { students: 0, attendance: 2, grades: 0 };
    await renderBanner();
    expect(screen.getByText('The shared database is unreachable')).toBeInTheDocument();
    expect(screen.getByText(/kept on this device and sent when it is back/)).toBeInTheDocument();
    expect(screen.getByText('2 attendance records')).toBeInTheDocument();
  });

  it('warns in local mode too (Lite on QNAP can lose the database mid-session)', async () => {
    local.mode = true;
    setDatabaseUnavailable(true);
    await renderBanner();
    expect(screen.getByText('The shared database is unreachable')).toBeInTheDocument();
  });

  it('is in Greek for Greek users', async () => {
    setDatabaseUnavailable(true);
    await renderBanner('el');
    expect(screen.getByText('Η κοινή βάση δεδομένων δεν είναι διαθέσιμη')).toBeInTheDocument();
  });

  it('goes away when the database is back', async () => {
    setDatabaseUnavailable(true);
    const { container } = await renderBanner();
    act(() => setDatabaseUnavailable(false));
    expect(container).toBeEmptyDOMElement();
  });
});
