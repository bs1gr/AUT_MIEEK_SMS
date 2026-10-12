import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthControls from '../AuthControls';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/api/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { mode: 'approval' } }), post: vi.fn() },
}));

describe('AuthControls', () => {
  it('renders nothing when a user is already signed in', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com', role: 'admin' } });

    const { container } = render(<AuthControls />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders login and register controls when signed out', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<AuthControls />);

    expect(screen.getByRole('button', { name: 'common.login' })).toBeInTheDocument();
    expect(await screen.findByTestId('register-open')).toBeInTheDocument();
  });
});
