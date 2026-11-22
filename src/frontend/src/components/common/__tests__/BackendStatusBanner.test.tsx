/**
 * Plan todo 67: when SMS Lite stops answering (for instance after 5 hours with its page in the
 * background), the connection banner says how to start it again, instead of only "Attempting to
 * reconnect". Other servers keep the old words.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BackendStatusBanner from '../BackendStatusBanner';

const state = vi.hoisted(() => ({ lite: false }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../api/api', () => ({ preflightAPI: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('../../../utils/serverUrl', () => ({ isLocalMode: () => false }));
vi.mock('../../../hooks/useLiteHeartbeat', () => ({ isLiteServer: () => state.lite }));

describe('BackendStatusBanner', () => {
  beforeEach(() => {
    state.lite = false;
  });

  it('says how to start SMS Lite again when it is the server that stopped answering', async () => {
    state.lite = true;
    render(<BackendStatusBanner />);
    expect(await screen.findByTestId('backend-status-detail')).toHaveTextContent('backendLiteStopped');
    expect(screen.getByText('backendUnavailable')).toBeInTheDocument();
  });

  it('keeps the old words for any other server', async () => {
    render(<BackendStatusBanner />);
    expect(await screen.findByTestId('backend-status-detail')).toHaveTextContent('backendReconnecting');
  });
});
