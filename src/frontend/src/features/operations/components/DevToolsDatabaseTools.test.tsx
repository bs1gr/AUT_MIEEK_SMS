import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import DevToolsDatabaseTools from './DevToolsDatabaseTools';
import { themeStyles } from './AppearanceThemeSelector';
import type { HealthStatus } from './DevToolsPanel';

// The Backup button is switched off when the database is one the app cannot back up. The
// engine was read from the health answer's top-level "database", which only ever says
// "connected": neither "sqlite" nor "postgres", so the button was disabled - with the note
// "Backup is available only for SQLite and PostgreSQL deployments" - on every edition, as soon
// as a health check had run. One runs after every restore.

const renderTools = (health: HealthStatus | null) =>
  render(
    <DevToolsDatabaseTools
      theme={themeStyles.default}
      t={(key: string) => key}
      legacyDatabaseToolsVisible
      health={health}
      backupMode="encrypted"
      setBackupMode={vi.fn()}
      opLoading={null}
      onBackup={vi.fn()}
      restoreFile={null}
      setRestoreFile={vi.fn()}
      onRestore={vi.fn()}
    />,
  );

const backupButton = () => screen.getByRole('button', { name: 'utils.backupDatabase' });

describe('DevToolsDatabaseTools: when a backup can be made', () => {
  it('is possible before any health check', () => {
    renderTools(null);

    expect(backupButton()).toBeEnabled();
  });

  it('stays possible on PostgreSQL after a health check', () => {
    // What /health answers on the shared database.
    renderTools({ status: 'healthy', database: 'connected', checks: { database: { dialect: 'postgresql' } } });

    expect(backupButton()).toBeEnabled();
    expect(screen.queryByText('utils.backupSqliteOnly')).toBeNull();
    // An uploaded SQLite file is migrated there: that hint belongs to PostgreSQL only.
    expect(screen.getByText('utils.restoreAutoMigrateHint')).toBeInTheDocument();
  });

  it('stays possible on SQLite after a health check', () => {
    renderTools({ status: 'healthy', database: 'connected', checks: { database: { dialect: 'sqlite' } } });

    expect(backupButton()).toBeEnabled();
    expect(screen.queryByText('utils.backupSqliteOnly')).toBeNull();
    expect(screen.queryByText('utils.restoreAutoMigrateHint')).toBeNull();
  });

  it('stays possible when the health answer does not name the engine', () => {
    renderTools({ status: 'healthy', database: 'connected' });

    expect(backupButton()).toBeEnabled();
    expect(screen.queryByText('utils.backupSqliteOnly')).toBeNull();
  });

  it('is switched off, with the reason, for an engine the app cannot back up', () => {
    renderTools({ status: 'healthy', database: 'connected', checks: { database: { dialect: 'mysql' } } });

    expect(backupButton()).toBeDisabled();
    expect(screen.getByText('utils.backupSqliteOnly')).toBeInTheDocument();
  });
});
