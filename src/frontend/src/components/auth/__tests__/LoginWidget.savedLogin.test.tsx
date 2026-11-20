import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));
vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const env = vi.hoisted(() => ({ native: true }));
vi.mock('@/services/nativeSession', () => ({
  usesNativeSession: () => env.native,
}));

const saved = vi.hoisted(() => ({
  pick: vi.fn(),
  offer: vi.fn(),
  autoOffer: true,
}));
vi.mock('@/utils/savedLogin', () => ({
  pickSavedLogin: saved.pick,
  offerToSaveLogin: saved.offer,
  shouldAutoOfferSavedLogin: () => env.native && saved.autoOffer,
  markAutoOfferDone: () => { saved.autoOffer = false; },
}));

import LoginWidget from '../LoginWidget';

describe('LoginWidget and the phone\'s saved sign-ins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.native = true;
    saved.autoOffer = true;
    saved.pick.mockResolvedValue({ found: false, reason: 'none' });
    saved.offer.mockResolvedValue(undefined);
    mockLogin.mockResolvedValue(undefined);
  });

  it('marks the email field as the username for password managers', () => {
    saved.autoOffer = false;
    render(<LoginWidget variant="inline" />);
    expect(screen.getByTestId('auth-login-email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByTestId('auth-login-password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('opens the sheet with the page and signs in with the chosen account, once', async () => {
    saved.pick.mockResolvedValue({ found: true, id: 'teacher@example.com', password: 'S3cret!' });
    const onLoginSuccess = vi.fn();
    const { unmount } = render(<LoginWidget variant="inline" onLoginSuccess={onLoginSuccess} />);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('teacher@example.com', 'S3cret!'));
    expect(onLoginSuccess).toHaveBeenCalled();
    // Already in the password manager: not offered for saving again.
    expect(saved.offer).not.toHaveBeenCalled();

    unmount();
    render(<LoginWidget variant="inline" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(saved.pick).toHaveBeenCalledTimes(1);
  });

  it('offers a typed sign-in for saving after the server accepted it', async () => {
    saved.autoOffer = false;
    const user = userEvent.setup();
    render(<LoginWidget variant="inline" />);
    await user.type(screen.getByTestId('auth-login-email'), ' teacher@example.com ');
    await user.type(screen.getByTestId('auth-login-password'), 'Typed-123');
    await user.click(screen.getByRole('button', { name: 'common.login' }));

    await waitFor(() => expect(saved.offer).toHaveBeenCalledWith('teacher@example.com', 'Typed-123'));
  });

  it('does not offer a refused sign-in for saving', async () => {
    saved.autoOffer = false;
    mockLogin.mockRejectedValue({ response: { status: 401 } });
    const user = userEvent.setup();
    render(<LoginWidget variant="inline" />);
    await user.type(screen.getByTestId('auth-login-email'), 'teacher@example.com');
    await user.type(screen.getByTestId('auth-login-password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'common.login' }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(saved.offer).not.toHaveBeenCalled();
  });

  it('says so when the saved password is refused', async () => {
    saved.pick.mockResolvedValue({ found: true, id: 'teacher@example.com', password: 'old' });
    mockLogin.mockRejectedValue({ response: { status: 401 } });
    render(<LoginWidget variant="inline" />);
    expect(await screen.findByText('auth.savedLoginFailed')).toBeInTheDocument();
  });

  it('a dismissed sheet leaves the form as it was; the button opens it again', async () => {
    saved.pick.mockResolvedValue({ found: false, reason: 'cancelled' });
    const user = userEvent.setup();
    render(<LoginWidget variant="inline" />);
    await waitFor(() => expect(saved.pick).toHaveBeenCalledTimes(1));
    expect(mockLogin).not.toHaveBeenCalled();

    saved.pick.mockResolvedValue({ found: true, id: 'a@example.com', password: 'p' });
    await user.click(screen.getByTestId('auth-login-saved'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@example.com', 'p'));
  });

  it('in a browser: no sheet and no button', async () => {
    env.native = false;
    render(<LoginWidget variant="inline" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(saved.pick).not.toHaveBeenCalled();
    expect(screen.queryByTestId('auth-login-saved')).not.toBeInTheDocument();
  });
});
