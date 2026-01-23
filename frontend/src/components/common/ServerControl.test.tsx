import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServerControl from './ServerControl';

// Mock useLanguage to avoid i18n dependency
vi.mock('../../LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k })
}));
// Mock auth context to provide a user identity
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'tester@example.com' } })
}));
// Mock API call
vi.mock('../../api/api', () => ({
  getHealthStatus: vi.fn(() => Promise.resolve({ status: 'ok' })),
  CONTROL_API_BASE: 'http://localhost/control/api'
}));

describe('ServerControl', () => {
  it('renders restart button', async () => {
    render(<ServerControl />);

    // The restart button label uses the translation key 'controlPanel.restart'
    expect(await screen.findByText('restart')).toBeDefined();
  });
});
