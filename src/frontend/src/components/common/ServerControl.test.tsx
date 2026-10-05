import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import ServerControl from './ServerControl';
import { getHealthStatus } from '../../api/api';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';

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
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateTimeSettingsProvider>{children}</DateTimeSettingsProvider>
    );

    rtlRender(<ServerControl />, { wrapper: Wrapper });

    // The restart button label uses the translation key 'controlPanel.restart'
    expect(await screen.findByText('restart')).toBeDefined();
  });

  const renderWithHealth = (health: Record<string, unknown>) => {
    vi.mocked(getHealthStatus).mockResolvedValue(health as never);
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateTimeSettingsProvider>{children}</DateTimeSettingsProvider>
    );
    rtlRender(<ServerControl />, { wrapper: Wrapper });
  };

  it('flags a SQLite database as local to this machine', async () => {
    renderWithHealth({ status: 'healthy', database: 'connected', database_target: { engine: 'sqlite', database: './data/sms_lite.db', is_remote: false } });
    expect(await screen.findByTestId('db-local-only')).toHaveTextContent('databaseLocalOnly');
    expect(screen.queryByText('databaseRemoteConnected')).not.toBeInTheDocument();
  });

  it('shows a remote PostgreSQL database as connected, not as local', async () => {
    renderWithHealth({ status: 'healthy', database: 'connected', database_target: { engine: 'postgresql', host: '172.16.0.2', port: 55433, database: 'student_management', is_remote: true } });
    expect(await screen.findByText('databaseRemoteConnected')).toBeInTheDocument();
    expect(screen.getByTestId('db-target-evidence')).toHaveTextContent('172.16.0.2:55433/student_management');
    expect(screen.queryByTestId('db-local-only')).not.toBeInTheDocument();
  });
});
