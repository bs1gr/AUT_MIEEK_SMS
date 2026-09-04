import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogoutButton from '../LogoutButton';

const mockLogout = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls logout when clicked', async () => {
    let resolveLogout: () => void = () => {};
    mockLogout.mockReturnValue(new Promise<void>((resolve) => { resolveLogout = resolve; }));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByTestId('logout-button'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    resolveLogout();
  });

  it('disables the button while the logout call is in flight', async () => {
    let resolveLogout: () => void = () => {};
    mockLogout.mockReturnValue(new Promise<void>((resolve) => { resolveLogout = resolve; }));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByTestId('logout-button'));

    expect(screen.getByTestId('logout-button')).toBeDisabled();

    resolveLogout();
    await waitFor(() => expect(screen.getByTestId('logout-button')).not.toBeDisabled());
  });
});
