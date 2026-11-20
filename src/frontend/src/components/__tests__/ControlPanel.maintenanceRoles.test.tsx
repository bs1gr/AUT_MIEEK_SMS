import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Owner's decision of 2026-11-20 (plan todos 58 and 63): System Operations and Database
// Management (backups, restore, clear) are for administrators only. Before it, a teacher saw both
// in Control Panel > Maintenance, and with SMS Lite the Control API trusts the PC itself, so the
// teacher's Backup and Restore worked.

const auth = vi.hoisted(() => ({ role: 'teacher' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, email: 'someone@example.com', role: auth.role } }),
}));
vi.mock('../../LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({ formatTime: () => '' }),
}));
vi.mock('../ControlPanel/useControlPanelData', () => ({
  useControlPanelData: () => ({
    status: null,
    diagnostics: [],
    ports: [],
    environment: null,
    logs: [],
    loading: false,
    tabLoading: {},
    tabUpdatedAt: {},
    operationStatus: null,
    uptime: 0,
    fetchDiagnostics: vi.fn(),
    fetchPorts: vi.fn(),
    fetchEnvironment: vi.fn(),
    fetchLogs: vi.fn(),
    runOperation: vi.fn(),
    runOperationPath: vi.fn(),
  }),
}));
// The panels themselves are not under test; the sections stay collapsed anyway.
vi.mock('@/features/operations/components/DevToolsPanel', () => ({ default: () => null }));
vi.mock('@/components/admin/AdminUsersPanel', () => ({ default: () => null }));
vi.mock('@/components/admin/RBACPanel', () => ({ RBACPanel: () => null }));
vi.mock('@/components/admin/AuditLogPanel', () => ({ default: () => null }));
vi.mock('../ControlPanel/UpdatesPanel', () => ({ default: () => null }));
vi.mock('../ControlPanel/RateLimitAdjuster', () => ({ default: () => null }));
vi.mock('../ControlPanel/DatabasePanel', () => ({ default: () => null }));
vi.mock('@/features/semesterArchive/SemesterArchivePage', () => ({ default: () => null }));
vi.mock('@/features/export-admin/components/EmailSettingsPanel', () => ({ default: () => null }));
vi.mock('@/pages/admin/ImportExportPage', () => ({ default: () => null }));

import ControlPanel from '../ControlPanel';

describe('Control Panel > Maintenance by role', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('shows a teacher neither System Operations nor Database Management', () => {
    auth.role = 'teacher';
    render(<ControlPanel initialTab="maintenance" />);

    expect(screen.getByText('administratorUsersHeading')).toBeInTheDocument();
    expect(screen.queryByText('controlPanel.systemOperations')).not.toBeInTheDocument();
    expect(screen.queryByText('controlPanel.databaseManagement')).not.toBeInTheDocument();
  });

  it('shows an administrator both', () => {
    auth.role = 'admin';
    render(<ControlPanel initialTab="maintenance" />);

    expect(screen.getByText('controlPanel.systemOperations')).toBeInTheDocument();
    expect(screen.getByText('controlPanel.databaseManagement')).toBeInTheDocument();
  });
});
